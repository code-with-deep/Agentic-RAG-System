"""
Agentic RAG System -- Confidence Scorer

Calculates a final confidence score for a generated answer using 4 factors:
1. Retrieval Relevance (from CRAG evaluations)
2. Faithfulness (from Hallucination score)
3. Context Coverage (LLM evaluation)
4. Coherence (LLM evaluation)
"""

import asyncio
import json
import logging
from typing import Any, Dict, List, Optional

from app.config import settings
from app.services.decision_tracer import STEP_CONFIDENCE, DecisionTracer
from app.services.hallucination_detector import format_context_for_verification
from app.services.llm_client import llm

logger = logging.getLogger("agentic_rag.confidence_scorer")

# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------
COVERAGE_PROMPT = """You are evaluating whether a retrieved context contains sufficient
information to fully answer a question.

Question: {query}

Retrieved Context:
{context}

Score how well the context covers the information needed to answer
this question completely.

0.0 - Context contains no relevant information at all
0.2 - Context contains only vaguely related terms but no real answer
0.4 - Context contains a minor hint but is mostly insufficient
0.6 - Context answers about half of the question
0.8 - Context answers most of the question but misses some details
1.0 - Context contains complete and detailed information to fully answer

Respond with ONLY a valid JSON object. No explanation. No markdown.
Format:
{{
  "score": 0.0,
  "reasoning": "one sentence explaining the score",
  "missing_information": "what information is missing if any, else null"
}}"""


COHERENCE_PROMPT = """You are evaluating the quality of an answer to a question.

Question: {query}
Answer: {answer}

Score the answer on these criteria combined into a single score:
- Does the answer directly address the question asked?
- Is the answer well-structured and easy to understand?
- Is the answer complete and not cut off mid-thought?
- Does the answer avoid unnecessary repetition?

0.0 - Answer is completely wrong or does not address the question at all
0.2 - Answer is extremely poor, mostly off-topic or incomprehensible
0.4 - Answer hints at the right topic but fails to actually answer it clearly
0.6 - Answer is okay, partially addresses the question but has structure issues
0.8 - Answer directly addresses the question with minor flaws
1.0 - Answer is perfectly structured, accurate, and completely addresses the question

Respond with ONLY a valid JSON object. No explanation. No markdown.
Format:
{{
  "score": 0.0,
  "reasoning": "one sentence explaining the score"
}}"""


# ---------------------------------------------------------------------------
# Calculation Helpers
# ---------------------------------------------------------------------------
def calculate_retrieval_relevance(chunk_classifications: List[dict]) -> float:
    """Calculate retrieval relevance from CRAG classifications."""
    if not chunk_classifications:
        return 0.0
        
    scores = []
    for chunk in chunk_classifications:
        cls = chunk.get("classification", "")
        if cls == "CORRECT":
            scores.append(1.0)
        elif cls == "AMBIGUOUS":
            scores.append(0.5)
        elif cls == "INCORRECT":
            scores.append(0.0)
            
    if not scores:
        return 0.0
        
    avg = sum(scores) / len(scores)
    return round(avg, 2)


def calculate_faithfulness(hallucination_score: float) -> float:
    """Calculate faithfulness from hallucination score."""
    faithfulness = 1.0 - hallucination_score
    return round(max(0.0, min(1.0, faithfulness)), 2)


async def calculate_context_coverage(query: str, chunks: List[dict]) -> Dict[str, Any]:
    """Evaluate context coverage using LLM."""
    if not chunks:
        return {"score": 0.0, "reasoning": "No context chunks provided", "missing_information": "All information is missing"}
        
    context_str = format_context_for_verification(chunks)
    prompt = COVERAGE_PROMPT.format(query=query, context=context_str)
    
    try:
        response = await llm.ainvoke(prompt)
        response_text = response.content if hasattr(response, "content") else str(response)
        response_text = response_text.strip()
        
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.lower().startswith("json"):
                response_text = response_text[4:]
            response_text = response_text.strip()
            
        result = json.loads(response_text)
        return {
            "score": float(result.get("score", 0.5)),
            "reasoning": result.get("reasoning", ""),
            "missing_information": result.get("missing_information")
        }
    except Exception as exc:
        logger.error("Context coverage scoring failed: %s", exc)
        return {"score": 0.5, "reasoning": "scoring failed", "missing_information": None}


async def calculate_coherence(query: str, answer: str) -> Dict[str, Any]:
    """Evaluate answer coherence using LLM."""
    if not answer:
        return {"score": 0.0, "reasoning": "empty answer"}
        
    prompt = COHERENCE_PROMPT.format(query=query, answer=answer)
    
    try:
        response = await llm.ainvoke(prompt)
        response_text = response.content if hasattr(response, "content") else str(response)
        response_text = response_text.strip()
        
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.lower().startswith("json"):
                response_text = response_text[4:]
            response_text = response_text.strip()
            
        result = json.loads(response_text)
        return {
            "score": float(result.get("score", 0.5)),
            "reasoning": result.get("reasoning", "")
        }
    except Exception as exc:
        logger.error("Coherence scoring failed: %s", exc)
        return {"score": 0.5, "reasoning": "scoring failed"}


def get_confidence_level(percentage: float) -> Dict[str, Any]:
    """Map percentage to confidence level metadata."""
    if percentage >= 90.0:
        return {
            "level": "HIGH", 
            "color": "green", 
            "badge": "High Confidence",
            "disclaimer": None
        }
    elif percentage >= 70.0:
        return {
            "level": "MEDIUM", 
            "color": "yellow",
            "badge": "Medium Confidence",
            "disclaimer": None
        }
    elif percentage >= 50.0:
        return {
            "level": "LOW", 
            "color": "orange",
            "badge": "Low Confidence",
            "disclaimer": "This answer may have gaps — verify important details"
        }
    else:
        return {
            "level": "VERY_LOW", 
            "color": "red",
            "badge": "Very Low Confidence",
            "disclaimer": "This answer may not be reliable — treat with caution"
        }


# ---------------------------------------------------------------------------
# Main Scoring Pipeline
# ---------------------------------------------------------------------------
async def score(
    query: str, 
    answer: str, 
    context_chunks: List[dict],
    chunk_classifications: List[dict],
    hallucination_score: float,
    tracer: Optional[DecisionTracer] = None
) -> Dict[str, Any]:
    """Calculate the comprehensive confidence score for the generated answer."""
    
    # STEP 1 -- Calculate retrieval relevance (no LLM call)
    retrieval_relevance = calculate_retrieval_relevance(chunk_classifications)
    
    # STEP 2 -- Calculate faithfulness (no LLM call)
    faithfulness = calculate_faithfulness(hallucination_score)
    
    # STEP 3 & 4 -- Calculate coverage and coherence (parallel LLM calls)
    coverage_task = asyncio.create_task(calculate_context_coverage(query, context_chunks))
    coherence_task = asyncio.create_task(calculate_coherence(query, answer))
    
    coverage_result, coherence_result = await asyncio.gather(coverage_task, coherence_task)
    
    context_coverage_score = coverage_result["score"]
    coherence_score = coherence_result["score"]
    
    # STEP 5 -- Calculate weighted final score
    final_score = (
        settings.retrieval_weight * retrieval_relevance +
        settings.faithfulness_weight * faithfulness +
        settings.coverage_weight * context_coverage_score +
        settings.coherence_weight * coherence_score
    )
    # Ensure it's between 0.0 and 1.0
    final_score = max(0.0, min(1.0, final_score))
    confidence_percentage = round(final_score * 100, 1)
    
    # STEP 6 -- Get confidence level
    conf_metadata = get_confidence_level(confidence_percentage)
    confidence_level = conf_metadata["level"]
    
    # STEP 7 -- Log to tracer
    if tracer:
        tracer.log(
            step_name=STEP_CONFIDENCE,
            decision=f"{confidence_percentage}% {confidence_level}",
            reasoning=f"R:{retrieval_relevance:.2f} F:{faithfulness:.2f} C:{context_coverage_score:.2f} Co:{coherence_score:.2f}",
            input_data={"hallucination_score": hallucination_score, "chunk_count": len(chunk_classifications)},
            output_data={
                "final_score": round(final_score, 4),
                "confidence_percentage": confidence_percentage,
                "confidence_level": confidence_level
            }
        )
        
    logger.info("Confidence score calculated: %s (%s%%) [R:%.2f F:%.2f C:%.2f Co:%.2f]", 
                confidence_level, confidence_percentage, 
                retrieval_relevance, faithfulness, context_coverage_score, coherence_score)

    # STEP 8 -- Return comprehensive score breakdown
    return {
        "retrieval_relevance": retrieval_relevance,
        "faithfulness": faithfulness,
        "context_coverage": context_coverage_score,
        "context_coverage_reasoning": coverage_result["reasoning"],
        "coherence": coherence_score,
        "coherence_reasoning": coherence_result["reasoning"],
        "final_score": round(final_score, 4),
        "confidence_percentage": confidence_percentage,
        "confidence_level": confidence_level,
        "confidence_color": conf_metadata["color"],
        "confidence_badge": conf_metadata["badge"],
        "disclaimer": conf_metadata["disclaimer"],
        "breakdown": {
            "retrieval_relevance": {
                "score": retrieval_relevance, 
                "weight": settings.retrieval_weight, 
                "weighted": round(retrieval_relevance * settings.retrieval_weight, 4)
            },
            "faithfulness": {
                "score": faithfulness, 
                "weight": settings.faithfulness_weight, 
                "weighted": round(faithfulness * settings.faithfulness_weight, 4)
            },
            "context_coverage": {
                "score": context_coverage_score, 
                "weight": settings.coverage_weight, 
                "weighted": round(context_coverage_score * settings.coverage_weight, 4)
            },
            "coherence": {
                "score": coherence_score, 
                "weight": settings.coherence_weight, 
                "weighted": round(coherence_score * settings.coherence_weight, 4)
            }
        }
    }
