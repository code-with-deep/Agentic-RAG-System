"""
Agentic RAG System -- Query Processing Routes

Test endpoints for Part 3 (routing + CRAG). Will be expanded with
full agentic and simple RAG endpoints in Part 6.
"""

import logging
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.services.corrective_rag import run_crag
from app.services.decision_tracer import DecisionTracer
from app.services.query_router import route_query
from app.services.hallucination_detector import detect
from app.services.confidence_scorer import score

logger = logging.getLogger("agentic_rag.routers.query")

router = APIRouter(tags=["query"])


# ---------------------------------------------------------------------------
# Request models for test endpoints
# ---------------------------------------------------------------------------
class TestRoutingRequest(BaseModel):
    query: str = Field(..., min_length=1)


class TestCRAGRequest(BaseModel):
    query: str = Field(..., min_length=1)
    strategy: Optional[str] = Field(default="hybrid_rerank")


# ---------------------------------------------------------------------------
# POST /api/query/test-routing
# ---------------------------------------------------------------------------
@router.post("/query/test-routing")
async def test_routing(request: TestRoutingRequest):
    """Test query classification and strategy routing."""
    result = await route_query(request.query)
    return {
        "query": request.query,
        "query_type": result["query_type"],
        "confidence": result["confidence"],
        "strategy": result["strategy"],
        "reasoning": result["reasoning"],
        "confidence_override": result["confidence_override"],
        "alternative_type": result["alternative_type"],
    }


# ---------------------------------------------------------------------------
# POST /api/query/test-crag
# ---------------------------------------------------------------------------
@router.post("/query/test-crag")
async def test_crag(request: TestCRAGRequest):
    """Test the full CRAG pipeline: retrieve -> evaluate -> decide."""
    tracer = DecisionTracer()

    crag_result = await run_crag(
        query=request.query,
        strategy=request.strategy,
        tracer=tracer,
    )

    return {
        "query": request.query,
        "strategy_requested": request.strategy,
        "crag_decision": crag_result["decision"],
        "strategy_used": crag_result.get("strategy_used", request.strategy),
        "attempt_number": crag_result.get("attempt_number", 1),
        "chunks_returned": len(crag_result.get("chunks", [])),
        "all_chunks_count": len(crag_result.get("all_chunks", [])),
        "decision_trace": tracer.get_trace(),
        "trace_summary": tracer.get_summary(),
    }


# ---------------------------------------------------------------------------
# Request models for Part 4 test endpoints
# ---------------------------------------------------------------------------
class TestHallucinationRequest(BaseModel):
    answer: str
    context: str

class TestConfidenceRequest(BaseModel):
    query: str
    answer: str
    context: str
    hallucination_score: float

# ---------------------------------------------------------------------------
# POST /api/query/test-hallucination
# ---------------------------------------------------------------------------
@router.post("/query/test-hallucination")
async def test_hallucination(request: TestHallucinationRequest):
    """Test the hallucination detection pipeline."""
    mock_chunks = [
        {
            "chunk_id": "mock_1",
            "source": "test_document.txt",
            "text": request.context
        }
    ]
    tracer = DecisionTracer()
    
    result = await detect(request.answer, mock_chunks, tracer=tracer)
    
    return {
        "hallucination_score": result["hallucination_score"],
        "regenerate": result["regenerate"],
        "total_claims": result["total_claims"],
        "unsupported_claims": result["unsupported_claims"],
        "verification_summary": result["verification_summary"],
        "claims": result["claims"],
        "trace": tracer.get_trace()
    }

# ---------------------------------------------------------------------------
# POST /api/query/test-confidence
# ---------------------------------------------------------------------------
@router.post("/query/test-confidence")
async def test_confidence(request: TestConfidenceRequest):
    """Test the 4-factor confidence scoring pipeline."""
    mock_chunks = [
        {
            "chunk_id": "mock_1",
            "source": "test_document.txt",
            "text": request.context
        }
    ]
    
    mock_classifications = [
        {
            "chunk_id": "mock_1",
            "classification": "CORRECT",
            "relevance_score": 1.0,
            "reasoning": "Mock evaluation"
        }
    ]
    
    tracer = DecisionTracer()
    
    result = await score(
        query=request.query,
        answer=request.answer,
        context_chunks=mock_chunks,
        chunk_classifications=mock_classifications,
        hallucination_score=request.hallucination_score,
        tracer=tracer
    )
    
    return result
