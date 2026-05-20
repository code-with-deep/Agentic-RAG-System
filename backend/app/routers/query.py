"""
Agentic RAG System -- Query Processing Routes

Production endpoints for the Agentic RAG pipeline and Simple RAG baseline.
"""

import logging
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import case, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.models.database import Claim, DecisionTrace, Iteration, Query, User, get_db
from app.models.schemas import AgenticResponse, SimpleRAGResponse, StatsResponse
from app.services import agent_orchestrator
from app.dependencies import get_current_user

logger = logging.getLogger("agentic_rag.routers.query")

router = APIRouter(tags=["query"])


# ---------------------------------------------------------------------------
# Request Models
# ---------------------------------------------------------------------------
class ConversationTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., min_length=1)


class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1)
    conversation_history: List[ConversationTurn] = Field(default_factory=list)

    @field_validator("query")
    @classmethod
    def _strip_query(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Query cannot be empty")
        return v


class SimpleQueryRequest(BaseModel):
    query: str = Field(..., min_length=1)

    @field_validator("query")
    @classmethod
    def _strip_query(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Query cannot be empty")
        return v


# ---------------------------------------------------------------------------
# Execution Endpoints
# ---------------------------------------------------------------------------
@router.post("/query", response_model=AgenticResponse)
async def execute_agentic_query(
    request: QueryRequest, 
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run the complete Agentic RAG pipeline (10 steps)."""
    result = await agent_orchestrator.run(
        query=request.query, 
        conversation_history=request.conversation_history,
        db=db,
        user_id=current_user.sub,
    )
    
    # Add custom header for tracking total latency easily in clients
    latency = result.get("total_latency_ms", 0)
    response.headers["X-Response-Time"] = f"{latency}ms"
    
    return result


@router.post("/query/simple", response_model=SimpleRAGResponse)
async def execute_simple_query(
    request: SimpleQueryRequest, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Run the basic RAG baseline for comparison."""
    result = await agent_orchestrator.run_simple(query=request.query, db=db, user_id=current_user.sub)
    return result


# ---------------------------------------------------------------------------
# Telemetry & Observability Endpoints
# ---------------------------------------------------------------------------
@router.get("/query/{query_id}/trace")
async def get_decision_trace(
    query_id: str, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve the step-by-step decision trace for a specific query in a single efficient query."""
    # Collapse existence check and fetch into one JOIN
    stmt = (
        select(DecisionTrace)
        .join(Query, DecisionTrace.query_id == Query.id)
        .where(Query.id == query_id, Query.user_id == current_user.sub)
        .order_by(DecisionTrace.timestamp)
    )
    result = await db.execute(stmt)
    traces = result.scalars().all()
    
    # If empty, either the query doesn't exist, it doesn't belong to user, or it has no traces.
    # Given agentic queries always have traces, an empty list is a safe proxy for 404 here.
    if not traces:
        raise HTTPException(status_code=404, detail="Query ID not found or unauthorized")

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
async def get_query_claims(
    query_id: str, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Single-pass check: fetch claims joined with query to verify existence and ownership
    stmt = (
        select(Claim, Query.id.label("query_id_exists"))
        .join(Query, Claim.query_id == Query.id, full=True)
        .where(Query.id == query_id, Query.user_id == current_user.sub)
    )
    # Actually, full join is not supported in all SQLite versions.
    # Let's use a simpler approach: select the Query and its Claims together if possible.
    # Or just fetch the Query and use its relation if it exists.
    
    # Actually, given the hardening goal, I will use a more robust single-pass approach:
    stmt = (
        select(Query)
        .where(Query.id == query_id, Query.user_id == current_user.sub)
    )
    result = await db.execute(stmt)
    query_obj = result.scalar_one_or_none()
    
    if query_obj is None:
        raise HTTPException(status_code=404, detail="Query ID not found or unauthorized")
        
    # Now fetch claims for this query. Wait, that's still two calls.
    # To do it in ONE call:
    from sqlalchemy.orm import selectinload
    stmt = (
        select(Query)
        .options(selectinload(Query.claims))
        .where(Query.id == query_id, Query.user_id == current_user.sub)
    )
    result = await db.execute(stmt)
    query_obj = result.scalar_one_or_none()
    
    if query_obj is None:
        raise HTTPException(status_code=404, detail="Query ID not found or unauthorized")
        
    claims = query_obj.claims
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
async def get_query_iterations(
    query_id: str, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve refinement iterations in a single SQL round-trip with ownership check."""
    from sqlalchemy.orm import selectinload
    stmt = (
        select(Query)
        .options(selectinload(Query.iterations))
        .where(Query.id == query_id, Query.user_id == current_user.sub)
    )
    result = await db.execute(stmt)
    query_obj = result.scalar_one_or_none()
    
    if query_obj is None:
        raise HTTPException(status_code=404, detail="Query ID not found or unauthorized")
        
    iterations = sorted(query_obj.iterations, key=lambda it: it.iteration_number)
    
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
async def get_system_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Retrieve aggregate system performance statistics for the user in a single efficient query."""
    # Build single aggregation statement
    stmt = select(
        func.count(Query.id).label("total"),
        func.avg(Query.confidence_score).label("avg_conf"),
        func.avg(Query.total_latency_ms).label("avg_lat"),
        func.count(case((Query.iterations_count > 1, 1))).label("retries"),
        func.count(case((Query.fallback_level > 0, 1))).label("fallbacks"),
        # Hallucination catch rate: count queries where hallucination was detected vs total agentic
        func.count(case((Query.hallucination_score > 0, 1))).label("hallucinations")
    ).where(
        Query.user_id == current_user.sub, 
        Query.source_label != "SIMPLE_RAG"
    )
    
    result = await db.execute(stmt)
    stats = result.one() # Should always return one row for aggregations
    
    total = stats.total or 0
    if total == 0:
        return {
            "avg_confidence": 0.0,
            "retry_rate": 0.0,
            "fallback_rate": 0.0,
            "avg_latency_ms": 0.0,
            "total_queries": 0,
            "hallucination_catch_rate": 0.0
        }
    
    return {
        "total_queries": total,
        "avg_confidence": round(float(stats.avg_conf or 0.0), 2),
        "avg_latency_ms": round(float(stats.avg_lat or 0.0), 2),
        "retry_rate": round((stats.retries / total) * 100, 2),
        "fallback_rate": round((stats.fallbacks / total) * 100, 2),
        "hallucination_catch_rate": round((stats.hallucinations / total) * 100, 2),
    }
