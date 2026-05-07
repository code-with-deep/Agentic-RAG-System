"""
Agentic RAG System -- Corrective RAG (CRAG) Pipeline

Evaluates retrieval quality by classifying each chunk as
CORRECT / AMBIGUOUS / INCORRECT, then decides whether to
PROCEED with generation, REFINE_AND_RETRY, or FALLBACK.
"""

import json
import logging
from typing import Any, Dict, List, Optional

from app.config import settings
from app.services.decision_tracer import (
    STEP_CRAG_EVALUATION,
    STEP_QUERY_REFINEMENT,
    STEP_RETRIEVAL,
    DecisionTracer,
)
from app.services.llm_client import get_llm, parse_llm_json
from app.services.query_router import get_alternative_strategy, refine_query
from app.services.retrieval import retrieve

logger = logging.getLogger("agentic_rag.corrective_rag")

# ---------------------------------------------------------------------------
# Chunk evaluation prompt template
# ---------------------------------------------------------------------------
EVALUATION_PROMPT = """You are a retrieval quality evaluator for a RAG system.

Query: {query}

Below are {chunk_count} retrieved chunks. For each chunk evaluate
how relevant it is to answering the query.

Classify each chunk as:
CORRECT - directly relevant, contains information useful for answering the query
AMBIGUOUS - partially relevant, contains some related information but not directly useful
INCORRECT - not relevant, does not contain information useful for answering the query

Chunks:
{chunks_text}

Respond with ONLY a valid JSON array. No explanation. No markdown. No preamble.
Format:
[
  {{"chunk_id": "the chunk id", "classification": "CORRECT|AMBIGUOUS|INCORRECT", "relevance_score": 0.0, "reasoning": "one sentence why"}}
]"""


# ---------------------------------------------------------------------------
# Format chunks for prompt
# ---------------------------------------------------------------------------
def format_chunks_for_prompt(chunks: List[dict]) -> str:
    """Build a formatted string of chunks for the evaluation prompt."""
    parts: List[str] = []
    for chunk in chunks:
        text_preview = chunk.get("text", "")[:300]
        if len(chunk.get("text", "")) > 300:
            text_preview += "..."
        parts.append(
            f"Chunk ID: {chunk.get('chunk_id', 'unknown')}\n"
            f"Source: {chunk.get('source', 'unknown')} (Page {chunk.get('page_number', 0)})\n"
            f"Text: {text_preview}"
        )
    return "\n---\n".join(parts)


# ---------------------------------------------------------------------------
# Main evaluation function
# ---------------------------------------------------------------------------
async def evaluate_chunks(query: str, chunks: List[dict]) -> Dict[str, Any]:
    """Evaluate all chunks in a single batched LLM call and decide next action."""
    if not chunks:
        return {
            "decision": "FALLBACK",
            "chunk_classifications": [],
            "correct_count": 0,
            "ambiguous_count": 0,
            "incorrect_count": 0,
            "correct_ratio": 0.0,
            "failed_reason": "No chunks available for evaluation",
            "verified_chunks": [],
        }

    chunks_text = format_chunks_for_prompt(chunks)
    prompt = EVALUATION_PROMPT.format(
        query=query,
        chunk_count=len(chunks),
        chunks_text=chunks_text,
    )

    try:
        response = await get_llm().ainvoke(prompt)
        response_text = response.content if hasattr(response, "content") else str(response)
        classifications = parse_llm_json(response_text)
        if not isinstance(classifications, list):
            raise ValueError("Expected JSON array")

    except (json.JSONDecodeError, ValueError, TypeError) as exc:
        logger.warning("Chunk evaluation parsing failed (%s), classifying all as AMBIGUOUS", exc)
        classifications = [
            {
                "chunk_id": chunk.get("chunk_id", ""),
                "classification": "AMBIGUOUS",
                "relevance_score": 0.5,
                "reasoning": "evaluation parsing failed, defaulting to AMBIGUOUS",
            }
            for chunk in chunks
        ]

    classification_map: Dict[str, dict] = {
        c.get("chunk_id", ""): c for c in classifications
    }

    correct_count = sum(1 for c in classifications if c.get("classification") == "CORRECT")
    ambiguous_count = sum(1 for c in classifications if c.get("classification") == "AMBIGUOUS")
    incorrect_count = sum(1 for c in classifications if c.get("classification") == "INCORRECT")
    total = len(chunks)
    correct_ratio = correct_count / total if total > 0 else 0.0

    verified_chunks: List[dict] = []
    for chunk in chunks:
        cid = chunk.get("chunk_id", "")
        cls_entry = classification_map.get(cid, {})
        classification = cls_entry.get("classification", "AMBIGUOUS")
        
        # Create a new decorated chunk to avoid side-effects on original references
        decorated_chunk = {
            **chunk,
            "crag_classification": classification,
            "relevance_score": cls_entry.get("relevance_score", 0.5)
        }
        
        if classification == "CORRECT":
            verified_chunks.append(decorated_chunk)

    if correct_count > total * settings.crag_proceed_ratio:
        decision = "PROCEED"
        failed_reason = ""
    elif correct_count == 0 and ambiguous_count == 0:
        decision = "FALLBACK"
        failed_reason = "All chunks classified as INCORRECT"
    elif incorrect_count > total * settings.crag_fallback_ratio:
        decision = "FALLBACK"
        failed_reason = f"Majority of chunks irrelevant ({incorrect_count}/{total} INCORRECT)"
    elif ambiguous_count >= correct_count and ambiguous_count > incorrect_count:
        decision = "REFINE_AND_RETRY"
        failed_reason = f"Too many ambiguous chunks ({ambiguous_count}/{total}), need more specific query"
    else:
        decision = "PROCEED"
        failed_reason = ""

    logger.info(
        "CRAG evaluation: decision=%s, correct=%d, ambiguous=%d, incorrect=%d (ratio=%.2f)",
        decision, correct_count, ambiguous_count, incorrect_count, correct_ratio,
    )

    return {
        "decision": decision,
        "chunk_classifications": classifications,
        "correct_count": correct_count,
        "ambiguous_count": ambiguous_count,
        "incorrect_count": incorrect_count,
        "correct_ratio": correct_ratio,
        "failed_reason": failed_reason,
        "verified_chunks": verified_chunks,
    }


# ---------------------------------------------------------------------------
# Knowledge refinement for AMBIGUOUS chunks
# ---------------------------------------------------------------------------
EXTRACTION_PROMPT = """From the text below extract ONLY the sentences directly relevant to: {query}
If no sentences are relevant return empty string.
Text: {chunk_text}
Return ONLY the extracted sentences. No explanation."""


async def refine_context(
    query: str,
    chunks: List[dict],
    classifications: List[dict],
) -> List[dict]:
    """Extract relevant sentences from AMBIGUOUS chunks and merge with CORRECT ones."""
    classification_map: Dict[str, str] = {
        c.get("chunk_id", ""): c.get("classification", "AMBIGUOUS")
        for c in classifications
    }

    correct_chunks: List[dict] = []
    ambiguous_chunks: List[dict] = []

    for chunk in chunks:
        cid = chunk.get("chunk_id", "")
        cls = classification_map.get(cid, "AMBIGUOUS")
        if cls == "CORRECT":
            correct_chunks.append(chunk)
        elif cls == "AMBIGUOUS":
            ambiguous_chunks.append(chunk)

    import asyncio
    
    async def _refine_single(chunk: dict) -> Optional[dict]:
        prompt = EXTRACTION_PROMPT.format(
            query=query,
            chunk_text=chunk.get("text", "")[:500],
        )
        try:
            response = await get_llm().ainvoke(prompt)
            extracted = response.content if hasattr(response, "content") else str(response)
            extracted = extracted.strip()

            if extracted and extracted.lower() not in ("", "empty string", "none", '""', "''"):
                refined_chunk = chunk.copy()
                refined_chunk["text"] = extracted
                refined_chunk["refined"] = True
                logger.info("Refined AMBIGUOUS chunk %s: %d -> %d chars",
                            chunk.get("chunk_id", ""), len(chunk.get("text", "")), len(extracted))
                return refined_chunk
            else:
                logger.info("AMBIGUOUS chunk %s had no relevant content, dropping", chunk.get("chunk_id", ""))
                return None
        except Exception as exc:
            logger.error("Failed to refine chunk %s: %s", chunk.get("chunk_id", ""), exc)
            return None

    # Fire all LLM requests in parallel using gather
    tasks = [_refine_single(chunk) for chunk in ambiguous_chunks]
    gather_results = await asyncio.gather(*tasks)
    
    # Filter out None results
    refined_ambiguous = [r for r in gather_results if r is not None]

    result = correct_chunks + refined_ambiguous
    logger.info("Context refinement: %d correct + %d refined = %d total",
                len(correct_chunks), len(refined_ambiguous), len(result))
    return result


# ---------------------------------------------------------------------------
# Full CRAG Pipeline
# ---------------------------------------------------------------------------
async def run_crag(
    query: str,
    strategy: str,
    attempt: int = 1,
    conversation_history: Optional[List[dict]] = None,
    tracer: Optional[DecisionTracer] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """Run the Corrective RAG pipeline with retrieval, evaluation, and retry logic."""
    if tracer is None:
        tracer = DecisionTracer()

    logger.info("CRAG pipeline: attempt=%d, strategy='%s', query='%s'", attempt, strategy, query[:80])

    # STEP 1 -- Retrieve chunks
    tracer.log(
        step_name=STEP_RETRIEVAL,
        decision=f"Retrieve attempt {attempt}",
        reasoning=f"Using strategy '{strategy}' with top_k_initial={settings.top_k_retrieval}, top_k_final={settings.top_k_final}",
        input_data={"query": query, "strategy": strategy, "attempt": attempt},
        output_data={},
    )

    chunks = await retrieve(
        query=query,
        strategy=strategy,
        top_k_initial=settings.top_k_retrieval,
        top_k_final=settings.top_k_final,
        conversation_history=conversation_history,
        llm=get_llm(),
        user_id=user_id,
    )

    # STEP 2 -- Handle empty retrieval
    if not chunks:
        tracer.log(
            step_name=STEP_RETRIEVAL,
            decision="No chunks retrieved",
            reasoning=f"Strategy '{strategy}' returned 0 chunks on attempt {attempt}",
            input_data={"strategy": strategy},
            output_data={"chunk_count": 0},
        )

        if attempt >= settings.max_retrieval_retries:
            tracer.log(
                step_name=STEP_CRAG_EVALUATION,
                decision="FALLBACK",
                reasoning=f"Max retrieval retries ({settings.max_retrieval_retries}) reached with 0 chunks",
                input_data={"attempt": attempt},
                output_data={"decision": "FALLBACK"},
            )
            return {
                "decision": "FALLBACK",
                "chunks": [],
                "all_chunks": [],
                "classifications": [],
                "attempt_number": attempt,
                "strategy_used": strategy,
            }

        new_strategy = get_alternative_strategy(strategy, attempt + 1)
        tracer.log(
            step_name=STEP_RETRIEVAL,
            decision="Retry with alternative strategy",
            reasoning=f"Switching from '{strategy}' to '{new_strategy}' for attempt {attempt + 1}",
            input_data={"current_strategy": strategy},
            output_data={"new_strategy": new_strategy},
            alternatives_considered=[new_strategy],
        )
        return await run_crag(query, new_strategy, attempt + 1, conversation_history, tracer, user_id)

    # STEP 3 -- Evaluate chunks
    evaluation = await evaluate_chunks(query, chunks)
    decision = evaluation["decision"]

    tracer.log(
        step_name=STEP_CRAG_EVALUATION,
        decision=decision,
        reasoning=(
            f"Correct={evaluation['correct_count']}, "
            f"Ambiguous={evaluation['ambiguous_count']}, "
            f"Incorrect={evaluation['incorrect_count']}, "
            f"Ratio={evaluation['correct_ratio']:.2f}"
        ),
        input_data={"chunk_count": len(chunks), "strategy": strategy},
        output_data={
            "decision": decision,
            "correct_count": evaluation["correct_count"],
            "ambiguous_count": evaluation["ambiguous_count"],
            "incorrect_count": evaluation["incorrect_count"],
        },
    )

    # STEP 4 -- PROCEED: pass only verified CORRECT chunks forward
    if decision == "PROCEED":
        return {
            "decision": "PROCEED",
            "chunks": evaluation["verified_chunks"],
            "all_chunks": chunks,
            "classifications": evaluation["chunk_classifications"],
            "attempt_number": attempt,
            "strategy_used": strategy,
        }

    # STEP 5 -- REFINE_AND_RETRY
    if decision == "REFINE_AND_RETRY":
        if attempt >= settings.max_retrieval_retries:
            refined_chunks = await refine_context(
                query, chunks, evaluation["chunk_classifications"]
            )
            tracer.log(
                step_name=STEP_QUERY_REFINEMENT,
                decision="Best-effort refinement (max retries reached)",
                reasoning=f"Max retries reached, refining context from {len(chunks)} chunks to {len(refined_chunks)}",
                input_data={"original_chunk_count": len(chunks)},
                output_data={"refined_chunk_count": len(refined_chunks)},
            )
            return {
                "decision": "PROCEED",
                "chunks": refined_chunks if refined_chunks else evaluation["verified_chunks"],
                "all_chunks": chunks,
                "classifications": evaluation["chunk_classifications"],
                "attempt_number": attempt,
                "strategy_used": strategy,
            }

        refined_query = await refine_query(query, evaluation["failed_reason"])
        new_strategy = get_alternative_strategy(strategy, attempt + 1)

        tracer.log(
            step_name=STEP_QUERY_REFINEMENT,
            decision="Refining query and retrying",
            reasoning=f"Refining query and retrying with '{new_strategy}' (attempt {attempt + 1})",
            input_data={"original_query": query, "failed_reason": evaluation["failed_reason"]},
            output_data={"refined_query": refined_query, "new_strategy": new_strategy},
            alternatives_considered=[new_strategy],
        )
        return await run_crag(refined_query, new_strategy, attempt + 1, conversation_history, tracer, user_id)

    # STEP 6 -- FALLBACK
    if attempt >= settings.max_retrieval_retries:
        tracer.log(
            step_name=STEP_CRAG_EVALUATION,
            decision="FALLBACK (max retries)",
            reasoning=f"Max retrieval retries ({settings.max_retrieval_retries}) reached",
            input_data={"attempt": attempt},
            output_data={"decision": "FALLBACK"},
        )
        return {
            "decision": "FALLBACK",
            "chunks": [],
            "all_chunks": chunks,
            "classifications": evaluation["chunk_classifications"],
            "attempt_number": attempt,
            "strategy_used": strategy,
        }

    new_strategy = get_alternative_strategy(strategy, attempt + 1)
    tracer.log(
        step_name=STEP_CRAG_EVALUATION,
        decision="Retrieval failed, trying fallback strategy",
        reasoning=f"Switching to fallback strategy '{new_strategy}' for attempt {attempt + 1}",
        input_data={"current_strategy": strategy},
        output_data={"new_strategy": new_strategy},
        alternatives_considered=[new_strategy],
    )
    return await run_crag(query, new_strategy, attempt + 1, conversation_history, tracer, user_id)
