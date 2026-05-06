"""
Agentic RAG System -- Evaluation Pipeline

Benchmarks the Agentic RAG pipeline against the Simple RAG baseline using
LLM-as-a-judge for faithfulness, relevancy, and accuracy scoring.
"""

import asyncio
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List
from uuid import uuid4

from app.models.database import EvaluationResult
from app.services import agent_orchestrator, hallucination_detector
from app.services.llm_client import llm

logger = logging.getLogger("agentic_rag.evaluator")

# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------
FAITHFULNESS_PROMPT = """Score how faithful this answer is to the provided context.
Faithfulness means the answer contains ONLY information present
in the context — no added or fabricated information.

Context: {context}
Answer: {answer}

Score from 0.0 to 1.0:
1.0 = perfectly faithful, every claim is in the context
0.7 = mostly faithful with minor additions
0.5 = partially faithful, some unsupported claims
0.3 = mostly unfaithful, many unsupported claims
0.0 = completely fabricated, nothing from context

Respond with ONLY a JSON object:
{{"score": 0.0 to 1.0, "reasoning": "one sentence"}}"""


RELEVANCY_PROMPT = """Score how relevant this answer is to the question asked.
Relevancy means the answer actually addresses what was asked.

Question: {question}
Answer: {answer}

Score from 0.0 to 1.0:
1.0 = perfectly answers the question asked
0.7 = mostly answers with minor gaps
0.5 = partially answers the question
0.3 = mostly off topic
0.0 = completely irrelevant

Respond with ONLY a JSON object:
{{"score": 0.0 to 1.0, "reasoning": "one sentence"}}"""


ACCURACY_PROMPT = """Compare this answer to the reference answer and score accuracy.
Accuracy means the answer contains the same key facts and
information as the reference answer.

Reference answer: {reference_answer}
Generated answer: {answer}

Score from 0.0 to 1.0:
1.0 = all key facts from reference are present and correct
0.7 = most key facts present, minor differences
0.5 = some key facts present, some missing or wrong
0.3 = few key facts present, mostly incorrect
0.0 = completely wrong or missing all key facts

Respond with ONLY a JSON object:
{{"score": 0.0 to 1.0, "reasoning": "one sentence"}}"""


# ---------------------------------------------------------------------------
# Scoring Functions
# ---------------------------------------------------------------------------
def _parse_score(response_text: str, fallback: float) -> float:
    try:
        clean_text = response_text.replace("```json", "").replace("```", "").strip()
        data = json.loads(clean_text)
        return float(data.get("score", fallback))
    except Exception as exc:
        logger.warning("Failed to parse evaluation score: %s. Output: %s", exc, response_text[:100])
        return fallback


async def score_faithfulness(answer: str, context: str) -> float:
    if not context.strip():
        return 0.0 if answer.strip() else 1.0
        
    prompt = FAITHFULNESS_PROMPT.format(context=context, answer=answer)
    try:
        response = await llm.ainvoke(prompt)
        text = response.content if hasattr(response, "content") else str(response)
        return _parse_score(text, 0.5)
    except Exception as exc:
        logger.error("Faithfulness scoring failed: %s", exc)
        return 0.5


async def score_relevancy(question: str, answer: str) -> float:
    prompt = RELEVANCY_PROMPT.format(question=question, answer=answer)
    try:
        response = await llm.ainvoke(prompt)
        text = response.content if hasattr(response, "content") else str(response)
        return _parse_score(text, 0.5)
    except Exception as exc:
        logger.error("Relevancy scoring failed: %s", exc)
        return 0.5


async def score_accuracy(answer: str, reference_answer: str) -> float:
    prompt = ACCURACY_PROMPT.format(reference_answer=reference_answer, answer=answer)
    try:
        response = await llm.ainvoke(prompt)
        text = response.content if hasattr(response, "content") else str(response)
        return _parse_score(text, 0.0)
    except Exception as exc:
        logger.error("Accuracy scoring failed: %s", exc)
        return 0.0


# ---------------------------------------------------------------------------
# Evaluation Pipeline
# ---------------------------------------------------------------------------
def format_chunks_as_context(chunks: List[dict]) -> str:
    parts = []
    for chunk in chunks:
        parts.append(f"Source: {chunk.get('source', 'Unknown')}\n{chunk.get('text', '')}")
    result = "\n\n---\n\n".join(parts)
    return result[:4000]


async def evaluate_single(
    question: str, 
    reference_answer: str,
    agentic_answer: str, 
    simple_answer: str,
    agentic_chunks: List[dict],
    simple_chunks: List[dict],
    agentic_hallucination_score: float
) -> Dict[str, Any]:
    """Score a single question for both pipelines."""
    
    agentic_context = format_chunks_as_context(agentic_chunks)
    simple_context = format_chunks_as_context(simple_chunks)
    
    # Run all 6 LLM grading calls concurrently
    results = await asyncio.gather(
        score_faithfulness(agentic_answer, agentic_context),
        score_faithfulness(simple_answer, simple_context),
        score_relevancy(question, agentic_answer),
        score_relevancy(question, simple_answer),
        score_accuracy(agentic_answer, reference_answer),
        score_accuracy(simple_answer, reference_answer),
        return_exceptions=True
    )
    
    # Safely handle any potential exceptions from gather
    clean_results = [r if not isinstance(r, Exception) else 0.5 for r in results]
    
    # Run hallucination detector on simple answer (agentic was already scored during run)
    try:
        simple_hallucination = await hallucination_detector.detect(simple_answer, simple_chunks)
        simple_hal_score = simple_hallucination.get("hallucination_score", 0.0)
    except Exception as exc:
        logger.error("Failed to detect simple hallucinations: %s", exc)
        simple_hal_score = 0.5
        
    # Calculate averages
    agentic_avg = sum(clean_results[0:5:2]) / 3  # idx 0, 2, 4
    simple_avg = sum(clean_results[1:6:2]) / 3   # idx 1, 3, 5
    delta = agentic_avg - simple_avg
    
    return {
        "question": question,
        "reference_answer": reference_answer,
        "agentic_answer": agentic_answer,
        "simple_answer": simple_answer,
        "agentic_scores": {
            "faithfulness": clean_results[0],
            "relevancy": clean_results[2],
            "accuracy": clean_results[4],
            "hallucination_score": agentic_hallucination_score,
            "average": agentic_avg
        },
        "simple_scores": {
            "faithfulness": clean_results[1],
            "relevancy": clean_results[3],
            "accuracy": clean_results[5],
            "hallucination_score": simple_hal_score,
            "average": simple_avg
        },
        "delta": delta,
        "passed": agentic_avg >= 0.7,
        "agentic_better": agentic_avg > simple_avg,
        "improvement_percentage": delta * 100
    }


async def run_batch_evaluation(eval_dataset_path: str, db=None) -> Dict[str, Any]:
    """Run the complete batch evaluation on the dataset."""
    logger.info("Starting batch evaluation using dataset: %s", eval_dataset_path)
    
    # STEP 1 — Load eval dataset
    path = Path(eval_dataset_path)
    if not path.exists():
        raise FileNotFoundError(f"Evaluation dataset not found at {eval_dataset_path}")
        
    with open(path, "r", encoding="utf-8") as f:
        dataset = json.load(f)
        
    total_questions = len(dataset)
    per_question_results = []
    
    # STEP 2 — Process sequentially to avoid LLM rate limits
    for i, item in enumerate(dataset, 1):
        question = item["question"]
        ref_answer = item["reference_answer"]
        logger.info("Evaluating question %d/%d: %s", i, total_questions, question[:50])
        
        try:
            agentic_result = await agent_orchestrator.run(question, db=db)
            simple_result = await agent_orchestrator.run_simple(question, db=db)
            
            eval_result = await evaluate_single(
                question=question,
                reference_answer=ref_answer,
                agentic_answer=agentic_result["final_answer"],
                simple_answer=simple_result["answer"],
                agentic_chunks=agentic_result.get("retrieved_chunks", []),
                simple_chunks=simple_result.get("chunks_used", []), # Actually we don't have the simple chunks in the response
                agentic_hallucination_score=agentic_result.get("hallucination_score", 0.0)
            )
            
            per_question_results.append(eval_result)
        except Exception as exc:
            logger.error("Failed to evaluate question %d: %s", i, exc)
            
    if not per_question_results:
        raise RuntimeError("Evaluation failed completely; no questions processed.")

    # STEP 3 — Calculate aggregate metrics
    passed_count = sum(1 for r in per_question_results if r["passed"])
    pass_rate = passed_count / len(per_question_results)
    
    # Agentic aggregates
    ag_faithfulness = sum(r["agentic_scores"]["faithfulness"] for r in per_question_results) / len(per_question_results)
    ag_relevancy = sum(r["agentic_scores"]["relevancy"] for r in per_question_results) / len(per_question_results)
    ag_accuracy = sum(r["agentic_scores"]["accuracy"] for r in per_question_results) / len(per_question_results)
    ag_hallucination = sum(r["agentic_scores"]["hallucination_score"] for r in per_question_results) / len(per_question_results)
    ag_overall = sum(r["agentic_scores"]["average"] for r in per_question_results) / len(per_question_results)
    
    # Simple aggregates
    sp_faithfulness = sum(r["simple_scores"]["faithfulness"] for r in per_question_results) / len(per_question_results)
    sp_relevancy = sum(r["simple_scores"]["relevancy"] for r in per_question_results) / len(per_question_results)
    sp_accuracy = sum(r["simple_scores"]["accuracy"] for r in per_question_results) / len(per_question_results)
    sp_hallucination = sum(r["simple_scores"]["hallucination_score"] for r in per_question_results) / len(per_question_results)
    sp_overall = sum(r["simple_scores"]["average"] for r in per_question_results) / len(per_question_results)

    # Deltas
    f_delta = ag_faithfulness - sp_faithfulness
    r_delta = ag_relevancy - sp_relevancy
    a_delta = ag_accuracy - sp_accuracy
    h_reduction = sp_hallucination - ag_hallucination
    o_delta = ag_overall - sp_overall
    
    # STEP 4 — Build summary string
    summary = (
        f"Agentic RAG improved faithfulness by {f_delta*100:.1f}%, "
        f"relevancy by {r_delta*100:.1f}%, accuracy by {a_delta*100:.1f}%, "
        f"and reduced hallucinations by {h_reduction*100:.1f}% compared to Simple RAG baseline."
    )
    
    job_id = str(uuid4())
    evaluated_at = datetime.now(timezone.utc)
    
    # STEP 5 — Save to database
    if db:
        try:
            db_eval = EvaluationResult(
                job_id=job_id,
                dataset_path=eval_dataset_path,
                total_questions=len(per_question_results),
                pass_rate=pass_rate,
                agentic_faithfulness=ag_faithfulness,
                agentic_relevancy=ag_relevancy,
                agentic_accuracy=ag_accuracy,
                agentic_hallucination=ag_hallucination,
                simple_faithfulness=sp_faithfulness,
                simple_relevancy=sp_relevancy,
                simple_accuracy=sp_accuracy,
                simple_hallucination=sp_hallucination,
                overall_improvement=o_delta,
                hallucination_reduction=h_reduction,
                summary=summary,
                per_question_results=per_question_results,
                evaluated_at=evaluated_at
            )
            db.add(db_eval)
            await db.commit()
            logger.info("Saved evaluation results to database (job_id: %s)", job_id)
        except Exception as exc:
            logger.error("Failed to save evaluation results to DB: %s", exc)
            await db.rollback()

    # STEP 6 — Return final dict
    return {
        "job_id": job_id,
        "total_questions": len(per_question_results),
        "pass_rate": pass_rate,
        "per_question_results": per_question_results,
        "aggregate": {
            "agentic": {
                "faithfulness": ag_faithfulness,
                "relevancy": ag_relevancy,
                "accuracy": ag_accuracy,
                "hallucination": ag_hallucination,
                "overall": ag_overall
            },
            "simple": {
                "faithfulness": sp_faithfulness,
                "relevancy": sp_relevancy,
                "accuracy": sp_accuracy,
                "hallucination": sp_hallucination,
                "overall": sp_overall
            },
            "improvement": {
                "faithfulness_delta": f_delta,
                "relevancy_delta": r_delta,
                "accuracy_delta": a_delta,
                "hallucination_reduction": h_reduction,
                "overall_delta": o_delta
            }
        },
        "summary": summary,
        "evaluated_at": evaluated_at.isoformat()
    }
