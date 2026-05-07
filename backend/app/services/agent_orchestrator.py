import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from app.services import (
    confidence_scorer,
    corrective_rag,
    fallback_chain,
    hallucination_detector,
    iterative_refiner,
    query_router,
)
from app.services.decision_tracer import (
    STEP_CLASSIFICATION,
    STEP_GENERATION,
    DecisionTracer,
)

logger = logging.getLogger("agentic_rag.orchestrator")


@dataclass
class AgentState:
    query_id: str = field(default_factory=lambda: str(uuid4()))
    original_query: str = ""
    query_type: str = ""
    routing_confidence: float = 0.0
    strategy_used: str = ""
    retrieved_chunks: List[dict] = field(default_factory=list)
    crag_result: dict = field(default_factory=dict)
    generated_answer: str = ""
    hallucination_result: dict = field(default_factory=dict)
    confidence_result: dict = field(default_factory=dict)
    refiner_result: dict = field(default_factory=dict)
    fallback_result: dict = field(default_factory=dict)
    source_label: str = "DOCUMENTS"
    fallback_level: int = 0
    iterations_count: int = 1
    total_latency_ms: int = 0
    conversation_history: List[dict] = field(default_factory=list)
    tracer: DecisionTracer = field(default_factory=DecisionTracer)


async def run(
    query: str, 
    conversation_history: Optional[List[dict]] = None, 
    db=None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    state = AgentState()
    state.original_query = query
    state.conversation_history = conversation_history or []
    pipeline_start = datetime.now(timezone.utc)
    
    logger.info("Starting Agentic Pipeline for query: %s", state.query_id)

    try:
        routing_result = await query_router.route_query(query)
        state.query_type = routing_result["query_type"]
        state.routing_confidence = routing_result["confidence"]
        state.strategy_used = routing_result["strategy"]
        
        state.tracer.log(
            step_name=STEP_CLASSIFICATION,
            decision=f"{state.query_type} -> {state.strategy_used}",
            reasoning=routing_result["reasoning"],
            input_data={"query": query[:100]},
            output_data=routing_result,
            alternatives_considered=[routing_result.get("alternative_type")]
        )

        crag_result = await corrective_rag.run_crag(
            query=query,
            strategy=state.strategy_used,
            attempt=1,
            conversation_history=state.conversation_history,
            tracer=state.tracer,
            user_id=user_id
        )
        state.crag_result = crag_result

        if crag_result.get("decision") == "FALLBACK":
            fallback_result = await fallback_chain.execute(
                query=query,
                reason="Document retrieval failed after maximum retries",
                attempts_made=[{
                    "strategy": state.strategy_used,
                    "reason_failed": "CRAG evaluation: majority chunks INCORRECT",
                    "attempt_number": crag_result.get("attempt_number", 3)
                }],
                tracer=state.tracer
            )
            state.fallback_result = fallback_result
            state.source_label = fallback_result["source_label"]
            state.fallback_level = fallback_result["fallback_level"]
            state.generated_answer = fallback_result["answer"]
            
            
        else:
            
            state.retrieved_chunks = crag_result.get("chunks", [])
            state.tracer.log(
                step_name=STEP_GENERATION,
                decision="Generating answer from verified context",
                reasoning=f"Using {len(state.retrieved_chunks)} verified chunks",
                input_data={"chunk_count": len(state.retrieved_chunks)},
                output_data={"status": "generating"}
            )
            
            state.generated_answer = await iterative_refiner.generate_answer(
                query=query,
                context_chunks=state.retrieved_chunks,
                conversation_history=state.conversation_history
            )

            # STEP 5 -- Hallucination Detection
            hallucination_result = await hallucination_detector.detect(
                answer=state.generated_answer,
                context_chunks=state.retrieved_chunks,
                tracer=state.tracer
            )
            state.hallucination_result = hallucination_result

            # STEP 6 -- Initial Confidence Scoring
            initial_confidence = await confidence_scorer.score(
                query=query,
                answer=state.generated_answer,
                context_chunks=state.retrieved_chunks,
                chunk_classifications=state.crag_result.get("chunk_classifications", []),
                hallucination_score=hallucination_result.get("hallucination_score", 0.0),
                tracer=state.tracer
            )

            # STEP 7 -- Iterative Refinement (if hallucinations detected)
            refiner_result = await iterative_refiner.refine(
                query=query,
                context_chunks=state.retrieved_chunks,
                initial_answer=state.generated_answer,
                initial_hallucination_result=hallucination_result,
                initial_confidence_result=initial_confidence,
                chunk_classifications=state.crag_result.get("chunk_classifications", []),
                conversation_history=state.conversation_history,
                tracer=state.tracer
            )
            state.refiner_result = refiner_result
            state.generated_answer = refiner_result.get("final_answer", state.generated_answer)
            state.hallucination_result = refiner_result.get("final_hallucination", hallucination_result)
            state.confidence_result = refiner_result.get("final_confidence", initial_confidence)
            state.iterations_count = refiner_result.get("iterations_count", 1)

        # STEP 8 -- Final Confidence Score 
        if state.fallback_level > 0:
            state.confidence_result = {
                "retrieval_relevance": 0.0,
                "faithfulness": 0.0,
                "context_coverage": 0.0,
                "coherence": 0.0,
                "final_score": 0.3,
                "confidence_percentage": 30.0,
                "confidence_level": "VERY_LOW",
                "confidence_badge": "Very Low Confidence",
                "disclaimer": state.fallback_result.get("disclaimer", "This answer is not from your documents"),
                "breakdown": {}
            }
            
    except Exception as exc:
        logger.error("Pipeline error for query %s: %s", state.query_id, exc, exc_info=True)
        # Ensure we return something gracefully
        incident_id = uuid4().hex[:8]
        logger.error("Incident %s: Pipeline error: %s", incident_id, exc, exc_info=True)
        
        state.generated_answer = state.generated_answer or "I encountered an internal error processing your request."
        state.source_label = "ERROR"
        if not state.confidence_result or "final_score" not in state.confidence_result:
            state.confidence_result = {
                "retrieval_relevance": 0.0,
                "faithfulness": 0.0,
                "context_coverage": 0.0,
                "coherence": 0.0,
                "final_score": 0.0,
                "confidence_percentage": 0.0,
                "confidence_level": "VERY_LOW",
                "confidence_badge": "Error",
                "disclaimer": f"An internal error occurred (Incident: {incident_id}). Please contact support.",
                "breakdown": {}
            }

    # STEP 9 -- Save everything to database
    state.total_latency_ms = int((datetime.now(timezone.utc) - pipeline_start).total_seconds() * 1000)
    
    if db:
        try:
            from app.models.database import Query as DBQuery
            
            db_query = DBQuery(
                id=state.query_id,
                original_query=state.original_query,
                query_type=state.query_type,
                routing_confidence=state.routing_confidence,
                strategy_used=state.strategy_used,
                final_answer=state.generated_answer,
                confidence_score=state.confidence_result.get("confidence_percentage", 0.0),
                confidence_level=state.confidence_result.get("confidence_level", "UNKNOWN"),
                source_label=state.source_label,
                fallback_level=state.fallback_level,
                hallucination_score=state.hallucination_result.get("hallucination_score", 0.0),
                iterations_count=state.iterations_count,
                total_latency_ms=state.total_latency_ms,
                user_id=user_id
            )
            db.add(db_query)
            
            if state.hallucination_result.get("claims"):
                await hallucination_detector.save_claims_to_db(
                    state.query_id, 
                    state.hallucination_result["claims"], 
                    db
                )
                
            if state.refiner_result.get("iterations_history"):
                await iterative_refiner.save_iterations_to_db(
                    state.query_id,
                    state.refiner_result["iterations_history"],
                    db
                )
                
            await state.tracer.save_to_db(state.query_id, db)
            # Transaction lifecycle (commit/rollback) is managed by the get_db dependency

    # Format chunks to match Pydantic schema strictly
    formatted_chunks = []
    for chunk in state.retrieved_chunks:
        formatted_chunk = dict(chunk)
        # Map page_number to page if missing
        if "page" not in formatted_chunk and "page_number" in formatted_chunk:
            formatted_chunk["page"] = formatted_chunk["page_number"]
        
        # Ensure score exists
        if "score" not in formatted_chunk:
            formatted_chunk["score"] = formatted_chunk.get("rerank_score") or formatted_chunk.get("similarity_score") or 0.0
            
        # Ensure crag_classification exists
        if "crag_classification" not in formatted_chunk:
            formatted_chunk["crag_classification"] = "UNKNOWN"
            
        formatted_chunks.append(formatted_chunk)

    # STEP 10 -- Build and return AgenticResponse dict
    try:
        # Final safety check on confidence_result to satisfy Pydantic
        required_conf_fields = [
            "retrieval_relevance", "faithfulness", "context_coverage", 
            "coherence", "final_score", "confidence_percentage", "confidence_level"
        ]
        if not state.confidence_result:
            state.confidence_result = {}
            
        for key in required_conf_fields:
            if key not in state.confidence_result:
                if key == "confidence_level":
                    state.confidence_result[key] = "UNKNOWN"
                else:
                    state.confidence_result[key] = 0.0

        # Build annotation map with safety
        annotations = []
        try:
            annotations = hallucination_detector.build_annotation_map(
                state.generated_answer,
                state.hallucination_result.get("claims", [])
            )
        except Exception as e:
            logger.error("Annotation map build failed: %s", e)

        return {
            "query_id": state.query_id,
            "original_query": state.original_query,
            "query_type": state.query_type,
            "routing_confidence": float(state.routing_confidence),
            "strategy_used": state.strategy_used,
            "final_answer": state.generated_answer,
            "confidence_breakdown": state.confidence_result,
            "source_label": state.source_label,
            "claims": state.hallucination_result.get("claims", []),
            "hallucination_score": float(state.hallucination_result.get("hallucination_score", 0.0)),
            "fallback_level": int(state.fallback_level),
            "iterations_count": int(state.iterations_count),
            "total_latency_ms": int(state.total_latency_ms),
            "decision_trace": state.tracer.get_trace(),
            "retrieved_chunks": formatted_chunks,
            "annotation_map": annotations
        }
    except Exception as exc:
        logger.error("Final response construction failed: %s", exc, exc_info=True)
        # Ultimate fallback to avoid 500
        return {
            "query_id": state.query_id,
            "original_query": state.original_query,
            "query_type": "ERROR",
            "routing_confidence": 0.0,
            "strategy_used": "fallback",
            "final_answer": "I encountered a critical error while formatting the response.",
            "confidence_breakdown": {
                "retrieval_relevance": 0.0, "faithfulness": 0.0, "context_coverage": 0.0,
                "coherence": 0.0, "final_score": 0.0, "confidence_percentage": 0.0,
                "confidence_level": "ERROR"
            },
            "source_label": "ERROR",
            "claims": [],
            "hallucination_score": 1.0,
            "fallback_level": 0,
            "iterations_count": 1,
            "total_latency_ms": 0,
            "decision_trace": [],
            "retrieved_chunks": [],
            "annotation_map": []
        }


# ---------------------------------------------------------------------------
# Simple RAG Baseline
# ---------------------------------------------------------------------------
async def run_simple(query: str, db=None, user_id: Optional[str] = None) -> Dict[str, Any]:
    """Execute a basic RAG pipeline for baseline comparison."""
    from app.services.retrieval import retrieve
    from app.services.llm_client import get_llm
    
    query_id = str(uuid4())
    start_time = datetime.now(timezone.utc)
    
    try:
        # STEP 1: Retrieve top 5 chunks using basic hybrid search
        chunks = await retrieve(
            query=query, 
            strategy="hybrid_rerank", 
            top_k_initial=10, 
            top_k_final=5,
            llm=llm,
            user_id=user_id
        )
        
        # STEP 2: Generate answer directly from chunks
        from app.services.iterative_refiner import _format_context
        formatted_context = _format_context(chunks)
        
        prompt = f"""You are a helpful assistant answering questions based on provided document context.

Context from documents:
{formatted_context}

Question: {query}

Instructions:
- Answer based ONLY on the provided context
- If the context does not contain enough information, say so"""

        response = await get_llm().ainvoke(prompt)
        generated_answer = response.content if hasattr(response, "content") else str(response)
        
    except Exception as exc:
        logger.error("Simple RAG error for query %s: %s", query_id, exc)
        generated_answer = "Error generating simple response."
        chunks = []
        
    latency_ms = int((datetime.now(timezone.utc) - start_time).total_seconds() * 1000)
    
    # STEP 3: Save to queries table
    if db:
        try:
            from app.models.database import Query as DBQuery
            db_query = DBQuery(
                id=query_id,
                original_query=query,
                query_type="SIMPLE",
                strategy_used="hybrid_rerank",
                final_answer=generated_answer,
                source_label="SIMPLE_RAG",
                total_latency_ms=latency_ms,
                user_id=user_id
            )
            db.add(db_query)
            # Transaction lifecycle (commit/rollback) is managed by the get_db dependency
            
    return {
        "query_id": query_id,
        "query": query,
        "answer": generated_answer,
        "chunks_used": len(chunks),
        "retrieved_chunks": chunks,
        "latency_ms": latency_ms,
        "source_label": "SIMPLE_RAG"
    }
