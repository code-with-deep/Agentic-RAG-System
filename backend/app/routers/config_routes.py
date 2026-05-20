"""
Agentic RAG System -- Configuration Routes

Endpoints for viewing and updating system routing rules and thresholds.
Note: Config updates are in-memory only and reset on server restart.
"""

import logging
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.config import settings
from app.dependencies import get_current_user
from app.models.database import User
from app.services import query_router

logger = logging.getLogger("agentic_rag.routers.config")

router = APIRouter(tags=["config"])


# ---------------------------------------------------------------------------
# Request Models
# ---------------------------------------------------------------------------
class UpdateRoutingRequest(BaseModel):
    routing_table: Dict[str, str]


class ConfidenceWeights(BaseModel):
    retrieval_weight: float
    faithfulness_weight: float
    coverage_weight: float
    coherence_weight: float


class FallbackSettings(BaseModel):
    enable_web_search: bool
    enable_llm_fallback: bool


class UpdateThresholdsRequest(BaseModel):
    hallucination_threshold: Optional[float] = None
    routing_confidence_threshold: Optional[float] = None
    max_retrieval_retries: Optional[int] = None
    max_generation_retries: Optional[int] = None
    top_k_retrieval: Optional[int] = None
    top_k_final: Optional[int] = None
    confidence_weights: Optional[ConfidenceWeights] = None
    fallback_settings: Optional[FallbackSettings] = None


class TestRoutingRequest(BaseModel):
    query: str = Field(..., min_length=1)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.get("/config/routing")
async def get_routing_config(_user: User = Depends(get_current_user)):
    """Get the current routing table and available strategies."""
    return {
        "routing_table": settings.routing_table,
        "available_strategies": [
            "basic_vector", 
            "hybrid_rerank", 
            "multi_query",
            "section_based", 
            "context_aware", 
            "fallback"
        ],
        "routing_confidence_threshold": settings.routing_confidence_threshold
    }


@router.put("/config/routing")
async def update_routing_config(request: UpdateRoutingRequest, _user: User = Depends(get_current_user)):
    """Update the routing table. Changes are in-memory only."""
    valid_strategies = [
        "basic_vector", "hybrid_rerank", "multi_query",
        "section_based", "context_aware", "fallback"
    ]
    required_keys = ["factual", "analytical", "summarization", "conversational", "out_of_scope"]
    
    new_table = request.routing_table
    
    # Validation
    for k in required_keys:
        if k not in new_table:
            raise HTTPException(status_code=400, detail=f"Missing query type: {k}")
            
    for k, v in new_table.items():
        if v not in valid_strategies:
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid strategy '{v}'. Valid strategies: {', '.join(valid_strategies)}"
            )
            
    # Update in memory
    settings.routing_table.update(new_table)
    
    return {
        "message": "Routing table updated (in-memory only)",
        "new_routing_table": settings.routing_table
    }


@router.get("/config/thresholds")
async def get_thresholds_config(_user: User = Depends(get_current_user)):
    """Get all current system thresholds and weights."""
    return {
        "hallucination_threshold": settings.hallucination_threshold,
        "routing_confidence_threshold": settings.routing_confidence_threshold,
        "max_retrieval_retries": settings.max_retrieval_retries,
        "max_generation_retries": settings.max_generation_retries,
        "top_k_retrieval": settings.top_k_retrieval,
        "top_k_final": settings.top_k_final,
        "confidence_weights": {
            "retrieval_weight": settings.retrieval_weight,
            "faithfulness_weight": settings.faithfulness_weight,
            "coverage_weight": settings.coverage_weight,
            "coherence_weight": settings.coherence_weight
        },
        "fallback_settings": {
            "enable_web_search": getattr(settings, "enable_web_search", True),
            "enable_llm_fallback": getattr(settings, "enable_llm_fallback", True)
        }
    }


@router.put("/config/thresholds")
async def update_thresholds_config(request: UpdateThresholdsRequest, _user: User = Depends(get_current_user)):
    """Update system thresholds. Changes are in-memory only."""
    # Validate weights if provided
    if request.confidence_weights:
        weights = [
            request.confidence_weights.retrieval_weight,
            request.confidence_weights.faithfulness_weight,
            request.confidence_weights.coverage_weight,
            request.confidence_weights.coherence_weight
        ]
        if not abs(sum(weights) - 1.0) < 0.001:
            raise HTTPException(
                status_code=400, 
                detail=f"Confidence weights must sum to 1.0. Current sum: {sum(weights)}"
            )
            
    # Validate hallucination threshold
    if request.hallucination_threshold is not None:
        if not (0.0 <= request.hallucination_threshold <= 1.0):
            raise HTTPException(status_code=400, detail="Hallucination threshold must be between 0.0 and 1.0")
            
    # Validate retries
    for retry_val, name in [
        (request.max_retrieval_retries, "max_retrieval_retries"),
        (request.max_generation_retries, "max_generation_retries")
    ]:
        if retry_val is not None:
            if not (1 <= retry_val <= 5):
                raise HTTPException(status_code=400, detail=f"{name} must be between 1 and 5")

    # Update in memory
    if request.hallucination_threshold is not None:
        settings.hallucination_threshold = request.hallucination_threshold
    if request.routing_confidence_threshold is not None:
        settings.routing_confidence_threshold = request.routing_confidence_threshold
    if request.max_retrieval_retries is not None:
        settings.max_retrieval_retries = request.max_retrieval_retries
    if request.max_generation_retries is not None:
        settings.max_generation_retries = request.max_generation_retries
    if request.top_k_retrieval is not None:
        settings.top_k_retrieval = request.top_k_retrieval
    if request.top_k_final is not None:
        settings.top_k_final = request.top_k_final
        
    if request.confidence_weights:
        settings.retrieval_weight = request.confidence_weights.retrieval_weight
        settings.faithfulness_weight = request.confidence_weights.faithfulness_weight
        settings.coverage_weight = request.confidence_weights.coverage_weight
        settings.coherence_weight = request.confidence_weights.coherence_weight
        
    if request.fallback_settings:
        settings.enable_web_search = request.fallback_settings.enable_web_search
        settings.enable_llm_fallback = request.fallback_settings.enable_llm_fallback

    return {
        "message": "Thresholds updated (in-memory only)",
        "new_thresholds": await get_thresholds_config()
    }


@router.post("/config/test-routing")
async def test_routing_endpoint(request: TestRoutingRequest, _user: User = Depends(get_current_user)):
    """Test how a query would be routed given current settings."""
    result = await query_router.route_query(request.query)
    
    return {
        "query": request.query,
        "query_type": result.get("query_type"),
        "confidence": result.get("confidence"),
        "strategy_selected": result.get("strategy"),
        "reasoning": result.get("reasoning"),
        "confidence_override": result.get("confidence_override", False),
        "routing_table_used": settings.routing_table
    }
