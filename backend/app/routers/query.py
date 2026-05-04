"""
Agentic RAG System -- Query Processing Routes

Production endpoints for the Agentic RAG pipeline and Simple RAG baseline.
"""

import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.database import Claim, DecisionTrace, Iteration, Query, get_db
from app.models.schemas import AgenticResponse, SimpleRAGResponse, StatsResponse
from app.services import agent_orchestrator

logger = logging.getLogger("agentic_rag.routers.query")

router = APIRouter(tags=["query"])


# ---------------------------------------------------------------------------
# Request Models
# ---------------------------------------------------------------------------
class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1)
    conversation_history: Optional[List[dict]] = Field(default_factory=list)


class SimpleQueryRequest(BaseModel):
    query: str = Field(..., min_length=1)


# ---------------------------------------------------------------------------
# Execution Endpoints
# ---------------------------------------------------------------------------
@router.post("/query", response_model=AgenticResponse)
async def execute_agentic_query(
    request: QueryRequest, 
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    """Run the complete Agentic RAG pipeline (10 steps)."""
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
        
    result = await agent_orchestrator.run(
        query=request.query, 
        conversation_history=request.conversation_history,
        db=db
    )
    
    # Add custom header for tracking total latency easily in clients
    latency = result.get("total_latency_ms", 0)
    response.headers["X-Response-Time"] = f"{latency}ms"
    
    return result


@router.post("/query/simple", response_model=SimpleRAGResponse)
async def execute_simple_query(
    request: SimpleQueryRequest, 
    db: AsyncSession = Depends(get_db)
):
    """Run the basic RAG baseline for comparison."""
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
        
    result = await agent_orchestrator.run_simple(query=request.query, db=db)
    return result


# ---------------------------------------------------------------------------
# Telemetry & Observability Endpoints
# ---------------------------------------------------------------------------
@router.get("/query/{query_id}/trace")
async def get_decision_trace(query_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve the step-by-step decision trace for a specific query."""
    stmt = select(DecisionTrace).where(DecisionTrace.query_id == query_id).order_by(DecisionTrace.timestamp)
    result = await db.execute(stmt)
    traces = result.scalars().all()
    
    if not traces:
        # Check if query exists at all
        query_check = await db.execute(select(Query).where(Query.id == query_id))
        if not query_check.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Query ID not found")
        return []
        
    return [
        {
            "step_number": i + 1,
            "step_name": t.step_name,
            "decision": t.decision,
            "reasoning": t.reasoning,
            "input_summary": t.input_summary,
            "output_summary": t.output_summary,
            "time_taken_ms": t.time_taken_ms,
            "alternatives_considered": t.alternatives_considered,
            "timestamp": t.timestamp.isoformat()
        } for i, t in enumerate(traces)
    ]


@router.get("/query/{query_id}/claims")
async def get_query_claims(query_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve the verified claims extracted from a specific query's answer."""
    stmt = select(Claim).where(Claim.query_id == query_id)
    result = await db.execute(stmt)
    claims = result.scalars().all()
    
    if not claims:
        # Check if query exists at all
        query_check = await db.execute(select(Query).where(Query.id == query_id))
        if not query_check.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Query ID not found")
        return []
        
    return [
        {
            "id": c.id,
            "claim_text": c.claim_text,
            "verification_status": c.verification_status,
            "supporting_chunk_id": c.supporting_chunk_id,
            "confidence": c.confidence
        } for c in claims
    ]


@router.get("/query/{query_id}/iterations")
async def get_query_iterations(query_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieve the refinement iterations for a specific query."""
    stmt = select(Iteration).where(Iteration.query_id == query_id).order_by(Iteration.iteration_number)
    result = await db.execute(stmt)
    iterations = result.scalars().all()
    
    if not iterations:
        # Check if query exists at all
        query_check = await db.execute(select(Query).where(Query.id == query_id))
        if not query_check.scalar_one_or_none():
            raise HTTPException(status_code=404, detail="Query ID not found")
        return []
        
    return [
        {
            "id": it.id,
            "iteration_number": it.iteration_number,
            "answer_generated": it.answer_generated,
            "hallucination_score": it.hallucination_score,
            "confidence_score": it.confidence_score,
            "changes_made": it.changes_made,
            "timestamp": it.timestamp.isoformat()
        } for it in iterations
    ]


@router.get("/stats", response_model=StatsResponse)
async def get_system_stats(db: AsyncSession = Depends(get_db)):
    """Retrieve aggregate system performance statistics."""
    # Count total agentic queries
    stmt = select(func.count(Query.id)).where(Query.source_label != "SIMPLE_RAG")
    total_queries = (await db.execute(stmt)).scalar() or 0
    
    if total_queries == 0:
        return {
            "avg_confidence": 0.0,
            "retry_rate": 0.0,
            "fallback_rate": 0.0,
            "avg_latency_ms": 0.0,
            "total_queries": 0,
            "hallucination_catch_rate": 0.0
        }
        
    # Average confidence
    stmt = select(func.avg(Query.confidence_score)).where(Query.source_label != "SIMPLE_RAG")
    avg_confidence = (await db.execute(stmt)).scalar() or 0.0
    
    # Retry rate (queries with iterations > 1)
    stmt = select(func.count(Query.id)).where(
        Query.source_label != "SIMPLE_RAG",
        Query.iterations_count > 1
    )
    retry_count = (await db.execute(stmt)).scalar() or 0
    retry_rate = (retry_count / total_queries) * 100
    
    # Fallback rate (queries with fallback_level > 0)
    stmt = select(func.count(Query.id)).where(
        Query.source_label != "SIMPLE_RAG",
        Query.fallback_level > 0
    )
    fallback_count = (await db.execute(stmt)).scalar() or 0
    fallback_rate = (fallback_count / total_queries) * 100
    
    # Average latency
    stmt = select(func.avg(Query.total_latency_ms)).where(Query.source_label != "SIMPLE_RAG")
    avg_latency_ms = (await db.execute(stmt)).scalar() or 0.0
    
    # Hallucination catch rate (queries with score > 0)
    stmt = select(func.count(Query.id)).where(
        Query.source_label != "SIMPLE_RAG",
        Query.hallucination_score > 0.0
    )
    hallucination_caught = (await db.execute(stmt)).scalar() or 0
    hallucination_catch_rate = (hallucination_caught / total_queries) * 100
    
    return {
        "avg_confidence": round(avg_confidence, 2),
        "retry_rate": round(retry_rate, 2),
        "fallback_rate": round(fallback_rate, 2),
        "avg_latency_ms": round(avg_latency_ms, 2),
        "total_queries": total_queries,
        "hallucination_catch_rate": round(hallucination_catch_rate, 2)
    }
