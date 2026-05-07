

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Request Schemas
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class QueryRequest(BaseModel):
    model_config = ConfigDict(strict=False)
    query: str = Field(..., min_length=1, description="The user query to process")
    conversation_history: Optional[List[Dict[str, str]]] = Field(
        default=None, description="Prior conversation turns for context"
    )


class SimpleQueryRequest(BaseModel):
    model_config = ConfigDict(strict=False)
    query: str = Field(..., min_length=1, description="The user query for simple RAG")


class DocumentUploadResponse(BaseModel):
    model_config = ConfigDict(strict=False)
    document_id: str = Field(..., description="UUID of the uploaded document")
    filename: str = Field(..., description="Original filename")
    chunk_counts: Dict[str, int] = Field(..., description="Chunk counts per strategy")


class EvaluationRequest(BaseModel):
    model_config = ConfigDict(strict=False)
    text: str = Field(..., min_length=1, description="Text to evaluate")
    context: str = Field(..., min_length=1, description="Context for evaluation")


class BatchEvaluationRequest(BaseModel):
    model_config = ConfigDict(strict=False)
    dataset_path: str = Field(..., description="Path to evaluation dataset JSON")


class UpdateRoutingRequest(BaseModel):
    model_config = ConfigDict(strict=False)
    routing_table: Dict[str, str] = Field(
        ..., description="New routing table mapping query types to strategies"
    )


class UpdateThresholdsRequest(BaseModel):
    model_config = ConfigDict(strict=False)
    hallucination_threshold: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    routing_confidence_threshold: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    max_retrieval_retries: Optional[int] = Field(default=None, ge=1, le=10)
    max_generation_retries: Optional[int] = Field(default=None, ge=1, le=10)
    top_k_retrieval: Optional[int] = Field(default=None, ge=1, le=100)
    top_k_final: Optional[int] = Field(default=None, ge=1, le=50)


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Response Schemas
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

class ClaimResult(BaseModel):
    model_config = ConfigDict(strict=False)
    claim_id: str
    claim_text: str
    status: str  # SUPPORTED | NOT_SUPPORTED | CONTRADICTED
    supporting_chunk_id: Optional[str] = None
    confidence: float


class ConfidenceBreakdown(BaseModel):
    model_config = ConfigDict(strict=False)
    retrieval_relevance: float
    faithfulness: float
    context_coverage: float
    coherence: float
    final_score: float
    confidence_percentage: float
    confidence_level: str  # HIGH | MEDIUM | LOW


class TraceStep(BaseModel):
    model_config = ConfigDict(strict=False)
    step_name: str
    decision: str
    reasoning: str
    input_summary: Optional[Dict[str, Any]] = None
    output_summary: Optional[Dict[str, Any]] = None
    time_taken_ms: int
    timestamp: datetime
    alternatives_considered: Optional[List[str]] = None


class ChunkResult(BaseModel):
    model_config = ConfigDict(strict=False)
    chunk_id: str
    text: str
    source: str
    page: Optional[int] = None
    score: float
    strategy: str
    crag_classification: str  # CORRECT | AMBIGUOUS | INCORRECT


class AgenticResponse(BaseModel):
    model_config = ConfigDict(strict=False)
    query_id: str
    original_query: str
    query_type: str
    routing_confidence: float
    strategy_used: str
    final_answer: str
    confidence_breakdown: ConfidenceBreakdown
    source_label: str
    claims: List[ClaimResult]
    hallucination_score: float
    fallback_level: int
    iterations_count: int
    total_latency_ms: int
    decision_trace: List[TraceStep]
    retrieved_chunks: List[ChunkResult]
    annotation_map: Optional[List[Dict[str, Any]]] = None


class SimpleRAGResponse(BaseModel):
    model_config = ConfigDict(strict=False)
    query_id: str
    query: str
    answer: str
    chunks_used: int
    latency_ms: int
    retrieved_chunks: List[ChunkResult] = Field(default_factory=list)


class EvaluationResult(BaseModel):
    model_config = ConfigDict(strict=False)
    question: str
    agentic_score: float
    simple_score: float
    agentic_hallucinations: float
    simple_hallucinations: float
    delta: float
    passed: bool


class StatsResponse(BaseModel):
    model_config = ConfigDict(strict=False)
    avg_confidence: float
    retry_rate: float
    fallback_rate: float
    avg_latency_ms: float
    total_queries: int
    hallucination_catch_rate: float
