"""
Agentic RAG System -- Iterative Refiner

Self-improvement loop that regenerates answers when hallucination detection 
flags quality issues. Enforces strict instructions to remove unsupported claims.
"""

import logging
from typing import Any, Dict, List, Optional

from app.config import settings
from app.services.confidence_scorer import score
from app.services.decision_tracer import STEP_REGENERATION, DecisionTracer
from app.services.hallucination_detector import detect
from app.services.llm_client import llm

logger = logging.getLogger("agentic_rag.iterative_refiner")

# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------
GENERATION_PROMPT = """You are a helpful assistant answering questions based on
provided document context.

{history_section}

Context from documents:
{formatted_context}

Question: {query}

Instructions:
- Answer based ONLY on the provided context
- If the context does not contain enough information, say so
- Be specific and cite relevant details from the context
- Do not add information not present in the context"""


STRICT_REGENERATION_PROMPT = """You are a precise assistant. Your previous answer contained
unsupported claims that were not found in the provided context.

Previous answer (DO NOT reuse this directly):
{previous_answer}

These specific claims were NOT supported by the context
and must NOT appear in your new answer:
{numbered_unsupported_claims}

Context from documents:
{formatted_context}

Question: {query}

Instructions:
- Answer ONLY based on the provided context
- Do NOT include any of the unsupported claims listed above
- Do NOT add ANY information not explicitly stated in the context
- If you are unsure about a fact, do not include it
- If context is insufficient, clearly state what is missing"""


# ---------------------------------------------------------------------------
# Formatting Helpers
# ---------------------------------------------------------------------------
def _format_context(chunks: List[dict]) -> str:
    """Format context chunks for generation prompts."""
    parts = []
    for chunk in chunks:
        parts.append(f"Source: {chunk.get('source', 'Unknown')}\n{chunk.get('text', '')}")
    return "\n\n---\n\n".join(parts)


def _format_history(history: Optional[List[dict]]) -> str:
    """Format recent conversation history."""
    if not history:
        return ""
        
    parts = ["Previous conversation:"]
    # Only use the last 3 turns to keep context window manageable
    for turn in history[-3:]:
        parts.append(f"User: {turn.get('user', '')}")
        parts.append(f"Assistant: {turn.get('assistant', '')}")
        
    return "\n".join(parts) + "\n"


def _format_claims(claims: List[str]) -> str:
    """Format unsupported claims as a numbered list."""
    if not claims:
        return "None"
    return "\n".join([f"{i+1}. {claim}" for i, claim in enumerate(claims)])


# ---------------------------------------------------------------------------
# Generation Functions
# ---------------------------------------------------------------------------
async def generate_answer(
    query: str, 
    context_chunks: List[dict],
    conversation_history: Optional[List[dict]] = None
) -> str:
    """Generate the initial answer based on retrieved context."""
    formatted_context = _format_context(context_chunks)
    history_section = _format_history(conversation_history)
    
    prompt = GENERATION_PROMPT.format(
        history_section=history_section,
        formatted_context=formatted_context,
        query=query
    )
    
    try:
        response = await llm.ainvoke(prompt)
        return response.content if hasattr(response, "content") else str(response)
    except Exception as exc:
        logger.error("Initial generation failed: %s", exc)
        return "I apologize, but I encountered an error while generating the answer."


async def regenerate_strict(
    query: str, 
    context_chunks: List[dict],
    previous_answer: str,
    unsupported_claims: List[str]
) -> str:
    """Regenerate the answer, strictly excluding known hallucinations."""
    formatted_context = _format_context(context_chunks)
    numbered_unsupported_claims = _format_claims(unsupported_claims)
    
    prompt = STRICT_REGENERATION_PROMPT.format(
        previous_answer=previous_answer,
        numbered_unsupported_claims=numbered_unsupported_claims,
        formatted_context=formatted_context,
        query=query
    )
    
    try:
        response = await llm.ainvoke(prompt)
        return response.content if hasattr(response, "content") else str(response)
    except Exception as exc:
        logger.error("Strict regeneration failed: %s", exc)
        return previous_answer  # Fall back to previous if generation fails


# ---------------------------------------------------------------------------
# Main Refinement Loop
# ---------------------------------------------------------------------------
async def refine(
    query: str, 
    context_chunks: List[dict],
    initial_answer: str, 
    initial_hallucination_result: dict,
    initial_confidence_result: dict,
    chunk_classifications: List[dict],
    conversation_history: Optional[List[dict]] = None,
    tracer: Optional[DecisionTracer] = None
) -> Dict[str, Any]:
    """Self-correcting loop that refines the answer until it passes checks or hits retry limit."""
    iterations_history = []
    
    best_answer = initial_answer
    best_score = initial_confidence_result.get("confidence_percentage", 0.0)
    best_hallucination = initial_hallucination_result
    best_confidence = initial_confidence_result
    
    current_iteration = 1
    
    # Store initial iteration
    iterations_history.append({
        "iteration_number": 0,
        "query_used": query,
        "answer_generated": initial_answer,
        "hallucination_score": initial_hallucination_result.get("hallucination_score", 0.0),
        "confidence_score": initial_confidence_result.get("confidence_percentage", 0.0),
        "changes_made": "Initial generation"
    })
    
    logger.info("Starting refiner loop. Initial score: %.1f%%", best_score)
    
    while current_iteration <= settings.max_generation_retries:
        # STEP 1 - Check if regeneration needed
        needs_regeneration = initial_hallucination_result.get("regenerate", False)
        if not needs_regeneration and current_iteration == 1:
            logger.info("No refinement needed on initial check")
            break
            
        unsupported = initial_hallucination_result.get("unsupported_claims", [])
        
        # STEP 2 - Regenerate with strict prompt
        if tracer:
            tracer.log(
                step_name=STEP_REGENERATION,
                decision=f"Regenerating iteration {current_iteration}",
                reasoning=f"Hallucination score was {initial_hallucination_result.get('hallucination_score', 0.0):.2f}",
                input_data={"unsupported_count": len(unsupported)},
                output_data={"iteration": current_iteration}
            )
            
        new_answer = await regenerate_strict(
            query=query, 
            context_chunks=context_chunks, 
            previous_answer=best_answer,
            unsupported_claims=unsupported
        )
        
        # STEP 3 - Re-run hallucination detection
        new_hallucination = await detect(new_answer, context_chunks, tracer)
        
        # STEP 4 - Re-score confidence
        new_confidence = await score(
            query=query, 
            answer=new_answer, 
            context_chunks=context_chunks,
            chunk_classifications=chunk_classifications,
            hallucination_score=new_hallucination.get("hallucination_score", 0.0),
            tracer=tracer
        )
        
        new_score = new_confidence.get("confidence_percentage", 0.0)
        
        # STEP 5 - Compare with best
        if new_score > best_score:
            best_answer = new_answer
            best_score = new_score
            best_hallucination = new_hallucination
            best_confidence = new_confidence
            changes_made = f"Removed {len(unsupported)} unsupported claims, score improved to {best_score}%"
            logger.info("Iteration %d improved score to %.1f%%", current_iteration, best_score)
        else:
            changes_made = f"Regeneration did not improve score (was {best_score}%, still {new_score}%)"
            logger.info("Iteration %d failed to improve score (was %.1f%%, new %.1f%%)", 
                        current_iteration, best_score, new_score)
            
        # STEP 6 - Store iteration
        iterations_history.append({
            "iteration_number": current_iteration,
            "query_used": query,
            "answer_generated": new_answer,
            "hallucination_score": new_hallucination.get("hallucination_score", 0.0),
            "confidence_score": new_score,
            "changes_made": changes_made
        })
        
        # STEP 7 - Update for next loop
        initial_hallucination_result = new_hallucination
        
        # If the new generation is good enough, we can break early
        if not new_hallucination.get("regenerate", False):
            logger.info("Iteration %d fixed hallucinations, breaking early", current_iteration)
            break
            
        current_iteration += 1

    return {
        "final_answer": best_answer,
        "final_hallucination": best_hallucination,
        "final_confidence": best_confidence,
        "iterations_history": iterations_history,
        "iterations_count": len(iterations_history),
        "improved": best_score > initial_confidence_result.get("confidence_percentage", 0.0),
        "initial_score": initial_confidence_result.get("confidence_percentage", 0.0),
        "final_score": best_score
    }


async def save_iterations_to_db(query_id: str, iterations: List[dict], db) -> None:
    """Persist refinement iterations to the database."""
    from app.models.database import Iteration as DBIteration
    import uuid
    
    count = 0
    for it in iterations:
        record = DBIteration(
            id=str(uuid.uuid4()),
            query_id=query_id,
            iteration_number=it.get("iteration_number", 0),
            query_used=it.get("query_used", ""),
            answer_generated=it.get("answer_generated", ""),
            hallucination_score=it.get("hallucination_score", 0.0),
            confidence_score=it.get("confidence_score", 0.0),
            changes_made=it.get("changes_made", "")
        )
        db.add(record)
        count += 1
        
    await db.flush()
    logger.info("Saved %d iterations to database for query_id=%s", count, query_id)
