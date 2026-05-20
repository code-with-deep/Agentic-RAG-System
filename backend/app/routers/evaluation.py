import asyncio
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.database import EvaluationResult, User, get_db, async_session_factory
from app.services import evaluator, hallucination_detector
from app.models.schemas import EvaluationRequest as ClientEvalRequest
from app.dependencies import get_current_user

logger = logging.getLogger("agentic_rag.routers.evaluation")

router = APIRouter(tags=["evaluation"])

# Registry to track active background tasks
RUNNING_TASKS: Dict[str, Any] = {}

# Secure Registry of evaluation datasets
ALLOWED_DATASETS = {
    "default": Path("backend/app/data/eval_dataset.json"),
    "sample": Path("backend/app/data/sample_eval.json"),
}

# ---------------------------------------------------------------------------
# Background Task
# ---------------------------------------------------------------------------
async def background_evaluate_batch(job_id: str, dataset_path: str, user_id: str):
    """Run batch evaluation with a dedicated session, independent of the request."""
    logger.info("Task %s started for user %s", job_id, user_id)
    RUNNING_TASKS[job_id] = {"status": "running", "started_at": datetime.now(timezone.utc)}
    
    try:
        # Open a fresh session dedicated to this background task
        async with async_session_factory() as db:
            await evaluator.run_batch_evaluation(dataset_path, db=db, user_id=user_id)
        RUNNING_TASKS[job_id]["status"] = "completed"
        logger.info("Task %s completed successfully", job_id)
    except Exception as exc:
        RUNNING_TASKS[job_id]["status"] = "failed"
        RUNNING_TASKS[job_id]["error"] = str(exc)
        logger.error("Task %s failed: %s", job_id, exc)
    finally:
        # Optional: remove from registry after some time or on cleanup
        pass


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.post("/evaluate/hallucination")
async def evaluate_hallucination_endpoint(
    request: ClientEvalRequest,
    current_user: User = Depends(get_current_user),
):
    """Test the hallucination detection service on arbitrary text and context."""
    if not request.text or not request.context:
        raise HTTPException(status_code=400, detail="Text and context must not be empty.")
        
    mock_chunks = [{
        "chunk_id": "eval_chunk_1", 
        "text": request.context, 
        "source": "eval_input",
        "page_number": 1, 
        "strategy": "manual",
        "user_id": current_user.sub
    }]
    
    result = await hallucination_detector.detect(request.text, mock_chunks)
    
    return {
        "claims": result.get("claims", []),
        "hallucination_score": result.get("hallucination_score", 0.0),
        "regenerate": result.get("regenerate", False),
        "unsupported_claims": result.get("unsupported_claims", []),
        "verification_summary": result.get("verification_summary", "")
    }


class RunEvaluationRequest(BaseModel):
    dataset_id: str = "default"
    strategy: Optional[str] = "agentic"


@router.post("/evaluation/run")
async def run_evaluation_task(
    request: RunEvaluationRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Trigger a batch evaluation using a whitelisted dataset ID."""
    # 1. Resolve secure path from registry
    dataset_path = ALLOWED_DATASETS.get(request.dataset_id)
    if not dataset_path:
        raise HTTPException(
            status_code=400, 
            detail=f"Unknown dataset_id: '{request.dataset_id}'. Allowed: {', '.join(ALLOWED_DATASETS.keys())}"
        )

    # 2. Verify existence safely
    if not dataset_path.exists():
        logger.error("Dataset file missing on server: %s", dataset_path)
        raise HTTPException(status_code=500, detail="Evaluation dataset is currently unavailable.")
        
    # Read to count questions for estimate (offload to thread to avoid blocking)
    def _read_dataset():
        with open(dataset_path, "r", encoding="utf-8") as f:
            return json.load(f)

    try:
        dataset = await asyncio.to_thread(_read_dataset)
        total_questions = len(dataset)
    except Exception as exc:
        logger.error("Failed to read dataset %s: %s", dataset_path, exc)
        raise HTTPException(status_code=500, detail="Failed to load evaluation dataset content.")
        
    job_id = f"eval_{uuid4().hex[:12]}"
    
    # Fire-and-forget background task (independent of request lifecycle)
    asyncio.create_task(background_evaluate_batch(job_id, str(dataset_path), current_user.sub))
    
    return {
        "message": "Evaluation started in background.",
        "job_id": job_id,
        "estimated_minutes": round(total_questions * 0.5, 1)
    }


@router.get("/evaluate/results")
async def get_evaluation_results(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the most recent batch evaluation result for the user."""
    stmt = select(EvaluationResult).where(EvaluationResult.user_id == current_user.sub).order_by(desc(EvaluationResult.evaluated_at)).limit(1)
    result = await db.execute(stmt)
    eval_record = result.scalar_one_or_none()
    
    if not eval_record:
        raise HTTPException(
            status_code=404, 
            detail="No evaluation has been run yet for this user. Call POST /api/evaluation/run first."
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
async def get_evaluation_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a summary of all past batch evaluations for the user."""
    stmt = select(EvaluationResult).where(EvaluationResult.user_id == current_user.sub).order_by(desc(EvaluationResult.evaluated_at))
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
