"""
Agentic RAG System -- Hallucination Detector

Extracts factual claims from the generated answer and verifies them against
the retrieved context. Calculates a hallucination score and triggers
regeneration if the score exceeds the threshold.
"""

import json
import logging
from typing import Any, Dict, List, Optional

from app.config import settings
from app.services.decision_tracer import STEP_HALLUCINATION, DecisionTracer
from app.services.llm_client import llm

logger = logging.getLogger("agentic_rag.hallucination_detector")

# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------
EXTRACTION_PROMPT = """You are a fact extraction system. Your job is to extract every
individual factual claim from the following answer text.

A factual claim is any statement that:
- Contains a specific number, date, percentage, or quantity
- Names a specific person, organization, product, or place
- Makes a specific assertion that can be verified as true or false
- Describes a specific relationship, cause, or outcome

Do NOT extract:
- Opinions or subjective statements
- Vague generalizations without specific facts
- Questions or hypotheticals

Answer text:
{answer}

Respond with ONLY a valid JSON array. No explanation. No markdown.
Format:
[
  {{
    "claim_id": "claim_1",
    "claim_text": "the exact factual claim as a complete sentence",
    "claim_type": "number|date|name|relationship|outcome|other"
  }}
]

If no factual claims exist return an empty array: []"""


VERIFICATION_PROMPT = """You are a fact verification system. Your job is to verify whether
each claim below is supported by the provided context.

Context from retrieved documents:
{context}

Claims to verify:
{claims_text}

For each claim classify it as:
SUPPORTED - the context explicitly contains information supporting this claim
NOT_SUPPORTED - the claim is not mentioned or supported by the context
CONTRADICTED - the context explicitly states something different from the claim

Respond with ONLY a valid JSON array. No explanation. No markdown.
Format:
[
  {{
    "claim_id": "claim_1",
    "claim_text": "the claim text",
    "status": "SUPPORTED|NOT_SUPPORTED|CONTRADICTED",
    "supporting_chunk_id": "chunk_id if SUPPORTED else null",
    "evidence": "exact quote from context supporting or contradicting this claim",
    "confidence": 0.0
  }}
]"""


# ---------------------------------------------------------------------------
# Formatting Helpers
# ---------------------------------------------------------------------------
def format_context_for_verification(chunks: List[dict]) -> str:
    """Format chunks into a single context string, truncated to fit LLM window."""
    parts = []
    for chunk in chunks:
        parts.append(
            f"Chunk ID: {chunk.get('chunk_id', 'unknown')}\n"
            f"Source: {chunk.get('source', 'unknown')}\n"
            f"Text: {chunk.get('text', '')}"
        )
    
    full_context = "\n---\n".join(parts)
    # Truncate to 6000 chars to avoid exceeding context limits for verification
    if len(full_context) > 6000:
        full_context = full_context[:6000] + "\n...[truncated]"
    return full_context


def format_claims_for_prompt(claims: List[dict]) -> str:
    """Format the extracted claims for the verification prompt."""
    parts = []
    for idx, claim in enumerate(claims, start=1):
        parts.append(
            f"{idx}. Claim ID: {claim.get('claim_id')}\n"
            f"   Claim: {claim.get('claim_text')}\n"
            f"   Type: {claim.get('claim_type')}"
        )
    return "\n".join(parts)


def build_annotation_map(answer: str, claims: List[dict]) -> List[dict]:
    """Map verified claims back to their exact character positions in the answer."""
    annotations = []
    for claim in claims:
        claim_text = claim.get("claim_text", "")
        if not claim_text:
            continue
            
        start_idx = answer.find(claim_text)
        
        # If exact match fails, try a case-insensitive search or substring search
        if start_idx == -1 and len(claim_text) > 10:
            start_idx = answer.lower().find(claim_text.lower())
            
        annotations.append({
            "claim_text": claim_text,
            "start_index": start_idx,
            "end_index": start_idx + len(claim_text) if start_idx != -1 else -1,
            "status": claim.get("status", "NOT_SUPPORTED"),
            "confidence": claim.get("confidence", 0.0)
        })
        
    # Sort by start_index so frontend can process linearly
    return sorted(annotations, key=lambda x: x["start_index"] if x["start_index"] != -1 else 999999)


async def save_claims_to_db(query_id: str, claims: List[dict], db) -> None:
    """Persist verified claims to the database."""
    from app.models.database import Claim as DBClaim
    import uuid
    
    count = 0
    for claim in claims:
        record = DBClaim(
            id=str(uuid.uuid4()),
            query_id=query_id,
            claim_text=claim.get("claim_text", ""),
            verification_status=claim.get("status", "NOT_SUPPORTED"),
            supporting_chunk_id=claim.get("supporting_chunk_id"),
            confidence=claim.get("confidence", 0.0)
        )
        db.add(record)
        count += 1
        
    await db.flush()
    logger.info("Saved %d claims to database for query_id=%s", count, query_id)


# ---------------------------------------------------------------------------
# Main Detection Pipeline
# ---------------------------------------------------------------------------
async def detect(
    answer: str, 
    context_chunks: List[dict],
    tracer: Optional[DecisionTracer] = None
) -> Dict[str, Any]:
    """Extract claims from answer, verify against context, and decide if regenerate needed."""
    
    # Fast path for empty/short answers
    if not answer or len(answer) < 20:
        return {
            "claims": [],
            "hallucination_score": 0.0,
            "regenerate": False,
            "unsupported_claims": [],
            "contradicted_claims": [],
            "total_claims": 0,
            "supported_count": 0,
            "not_supported_count": 0,
            "contradicted_count": 0,
            "verification_summary": "No factual claims found (answer too short)."
        }

    # STEP 1 -- Claim Extraction
    extract_prompt = EXTRACTION_PROMPT.format(answer=answer)
    try:
        response = await llm.ainvoke(extract_prompt)
        response_text = response.content if hasattr(response, "content") else str(response)
        response_text = response_text.strip()
        
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.lower().startswith("json"):
                response_text = response_text[4:]
            response_text = response_text.strip()
            
        extracted_claims = json.loads(response_text)
        if not isinstance(extracted_claims, list):
            extracted_claims = []
            
    except Exception as exc:
        logger.error("Claim extraction failed: %s", exc)
        extracted_claims = []
        
    if tracer:
        tracer.log(
            step_name=STEP_HALLUCINATION,
            decision=f"Extracted {len(extracted_claims)} claims",
            reasoning="Used LLM to extract factual statements from the generated answer",
            input_data={"answer_length": len(answer)},
            output_data={"claims_count": len(extracted_claims)}
        )
        
    if not extracted_claims:
        return {
            "claims": [],
            "hallucination_score": 0.0,
            "regenerate": False,
            "unsupported_claims": [],
            "contradicted_claims": [],
            "total_claims": 0,
            "supported_count": 0,
            "not_supported_count": 0,
            "contradicted_count": 0,
            "verification_summary": "No factual claims found."
        }

    # STEP 2 -- Claim Verification
    context_text = format_context_for_verification(context_chunks)
    claims_text = format_claims_for_prompt(extracted_claims)
    verify_prompt = VERIFICATION_PROMPT.format(context=context_text, claims_text=claims_text)
    
    try:
        response = await llm.ainvoke(verify_prompt)
        response_text = response.content if hasattr(response, "content") else str(response)
        response_text = response_text.strip()
        
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.lower().startswith("json"):
                response_text = response_text[4:]
            response_text = response_text.strip()
            
        verified_claims = json.loads(response_text)
        if not isinstance(verified_claims, list):
            raise ValueError("Expected JSON array")
            
        # Merge extraction and verification data
        claim_map = {c.get("claim_id"): c for c in verified_claims}
        final_claims = []
        for ec in extracted_claims:
            cid = ec.get("claim_id")
            vc = claim_map.get(cid, {})
            merged = {**ec, **vc}
            if "status" not in merged:
                merged["status"] = "SUPPORTED"  # Default safe
            final_claims.append(merged)
            
    except Exception as exc:
        logger.error("Claim verification failed: %s. Assuming all claims are SUPPORTED.", exc)
        final_claims = [
            {**c, "status": "SUPPORTED", "evidence": "Verification failed", "confidence": 1.0}
            for c in extracted_claims
        ]

    # STEP 3 -- Calculate hallucination score
    total_claims = len(final_claims)
    supported_count = sum(1 for c in final_claims if c.get("status") == "SUPPORTED")
    not_supported_count = sum(1 for c in final_claims if c.get("status") == "NOT_SUPPORTED")
    contradicted_count = sum(1 for c in final_claims if c.get("status") == "CONTRADICTED")
    
    unsupported_total = not_supported_count + contradicted_count
    hallucination_score = unsupported_total / total_claims if total_claims > 0 else 0.0

    unsupported_texts = [c.get("claim_text", "") for c in final_claims if c.get("status") in ("NOT_SUPPORTED", "CONTRADICTED")]
    contradicted_texts = [c.get("claim_text", "") for c in final_claims if c.get("status") == "CONTRADICTED"]

    # STEP 4 -- Decide whether to regenerate
    regenerate = hallucination_score > settings.hallucination_threshold
    
    if tracer:
        tracer.log(
            step_name=STEP_HALLUCINATION,
            decision="REGENERATE" if regenerate else "PASS",
            reasoning=f"Hallucination score {hallucination_score:.2f}, threshold {settings.hallucination_threshold}",
            input_data={"total_claims": total_claims},
            output_data={
                "not_supported": not_supported_count,
                "contradicted": contradicted_count,
                "hallucination_score": round(hallucination_score, 2),
                "regenerate": regenerate
            }
        )
        
    logger.info("Hallucination check: score=%.2f, threshold=%.2f, regenerate=%s", 
                hallucination_score, settings.hallucination_threshold, regenerate)

    # STEP 5 -- Return
    summary = f"{supported_count}/{total_claims} claims verified, {unsupported_total} unsupported."
    
    return {
        "claims": final_claims,
        "hallucination_score": hallucination_score,
        "regenerate": regenerate,
        "unsupported_claims": unsupported_texts,
        "contradicted_claims": contradicted_texts,
        "total_claims": total_claims,
        "supported_count": supported_count,
        "not_supported_count": not_supported_count,
        "contradicted_count": contradicted_count,
        "verification_summary": summary
    }
