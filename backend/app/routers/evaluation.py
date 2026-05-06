"""
Agentic RAG System -- Evaluation Routes

Endpoints for evaluating system performance, triggering batch runs,
and retrieving evaluation statistics.
"""

import logging
from datetime import datetime
from typing import Any, Dict

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.database import EvaluationResult, get_db
from app.services import evaluator, hallucination_detector
from app.models.schemas import EvaluationRequest, BatchEvaluationRequest

logger = logging.getLogger("agentic_rag.routers.evaluation")

router = APIRouter(tags=["evaluation"])


# ---------------------------------------------------------------------------
# Background Task
# ---------------------------------------------------------------------------
async def background_evaluate_batch(dataset_path: str, db: AsyncSession):
    """Run batch evaluation in the background."""
    try:
        await evaluator.run_batch_evaluation(dataset_path, db=db)
    except Exception as exc:
        logger.error("Background evaluation failed: %s", exc)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.post("/evaluate/hallucination")
async def evaluate_hallucination_endpoint(request: EvaluationRequest):
    """Test the hallucination detection service on arbitrary text and context."""
    if not request.text.strip() or not request.context.strip():
        raise HTTPException(status_code=400, detail="Text and context must not be empty.")
        
    mock_chunks = [{
        "chunk_id": "eval_chunk_1", 
        "text": request.context, 
        "source": "eval_input",
        "page_number": 1, 
        "strategy": "manual"
    }]
    
    result = await hallucination_detector.detect(request.text, mock_chunks)
    
    return {
        "claims": result.get("claims", []),
        "hallucination_score": result.get("hallucination_score", 0.0),
        "regenerate": result.get("regenerate", False),
        "unsupported_claims": result.get("unsupported_claims", []),
        "verification_summary": result.get("verification_summary", "")
    }


@router.post("/evaluate/batch")
async def evaluate_batch_endpoint(
    request: BatchEvaluationRequest, 
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """Trigger a batch evaluation using the provided dataset."""
    dataset_path = request.dataset_path or "app/data/eval_dataset.json"
    
    import os
    if not os.path.exists(dataset_path):
        raise HTTPException(status_code=400, detail=f"Dataset file not found at {dataset_path}")
        
    # Read to count questions for estimate
    import json
    try:
        with open(dataset_path, "r", encoding="utf-8") as f:
            dataset = json.load(f)
            total_questions = len(dataset)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to read dataset: {exc}")
        
    job_id = "eval_" + str(int(datetime.utcnow().timestamp()))
    
    # Run in background
    background_tasks.add_task(background_evaluate_batch, dataset_path, db)
    
    return {
        "message": "Evaluation started",
        "job_id": job_id,
        "estimated_minutes": total_questions * 0.5
    }


@router.get("/evaluate/results")
async def get_evaluation_results(db: AsyncSession = Depends(get_db)):
    """Get the most recent batch evaluation result."""
    stmt = select(EvaluationResult).order_by(desc(EvaluationResult.evaluated_at)).limit(1)
    result = await db.execute(stmt)
    eval_record = result.scalar_one_or_none()
    
    if not eval_record:
        raise HTTPException(
            status_code=404, 
            detail="No evaluation has been run yet. Call POST /api/evaluate/batch first."
        )
        
    return {
        "job_id": eval_record.job_id,
        "total_questions": eval_record.total_questions,
        "pass_rate": eval_record.pass_rate,
        "per_question_results": eval_record.per_question_results,
        "aggregate": {
            "agentic": {
                "faithfulness": eval_record.agentic_faithfulness,
                "relevancy": eval_record.agentic_relevancy,
                "accuracy": eval_record.agentic_accuracy,
                "hallucination": eval_record.agentic_hallucination,
            },
            "simple": {
                "faithfulness": eval_record.simple_faithfulness,
                "relevancy": eval_record.simple_relevancy,
                "accuracy": eval_record.simple_accuracy,
                "hallucination": eval_record.simple_hallucination,
            },
            "improvement": {
                "hallucination_reduction": eval_record.hallucination_reduction,
                "overall_delta": eval_record.overall_improvement
            }
        },
        "summary": eval_record.summary,
        "evaluated_at": eval_record.evaluated_at.isoformat()
    }


@router.get("/evaluate/results/history")
async def get_evaluation_history(db: AsyncSession = Depends(get_db)):
    """Get a summary of all past batch evaluations."""
    stmt = select(EvaluationResult).order_by(desc(EvaluationResult.evaluated_at))
    result = await db.execute(stmt)
    eval_records = result.scalars().all()
    
    return [
        {
            "job_id": r.job_id,
            "evaluated_at": r.evaluated_at.isoformat(),
            "total_questions": r.total_questions,
            "pass_rate": r.pass_rate,
            "overall_improvement": r.overall_improvement,
            "summary": r.summary
        } for r in eval_records
    ]
