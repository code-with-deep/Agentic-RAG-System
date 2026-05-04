"""
Agentic RAG System -- Decision Tracer

Structured decision logging service used across the entire agentic pipeline.
Each pipeline run creates a DecisionTracer instance that records every
step, decision, and timing for full transparency.
"""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger("agentic_rag.decision_tracer")

# Step name constants for consistent naming across the pipeline
STEP_CLASSIFICATION = "Query Classification"
STEP_ROUTING = "Strategy Routing"
STEP_RETRIEVAL = "Document Retrieval"
STEP_CRAG_EVALUATION = "CRAG Chunk Evaluation"
STEP_QUERY_REFINEMENT = "Query Refinement"
STEP_GENERATION = "Answer Generation"
STEP_HALLUCINATION = "Hallucination Detection"
STEP_REGENERATION = "Answer Regeneration"
STEP_CONFIDENCE = "Confidence Scoring"
STEP_FALLBACK = "Fallback Chain"


class DecisionTracer:
    """Records every decision made during an agentic RAG pipeline run."""

    def __init__(self) -> None:
        self.trace: List[Dict[str, Any]] = []
        self.start_time: datetime = datetime.now(timezone.utc)
        self._last_step_time: datetime = self.start_time
        self.query_id: Optional[str] = None

    def log(
        self,
        step_name: str,
        decision: str,
        reasoning: str,
        input_data: Optional[Dict[str, Any]] = None,
        output_data: Optional[Dict[str, Any]] = None,
        alternatives_considered: Optional[List[str]] = None,
    ) -> None:
        """Record a single decision step in the trace."""
        now = datetime.now(timezone.utc)
        time_taken_ms = int((now - self._last_step_time).total_seconds() * 1000)
        self._last_step_time = now

        entry = {
            "step_number": len(self.trace) + 1,
            "step_name": step_name,
            "decision": decision,
            "reasoning": reasoning,
            "input_summary": input_data or {},
            "output_summary": output_data or {},
            "time_taken_ms": time_taken_ms,
            "timestamp": now.isoformat(),
            "alternatives_considered": alternatives_considered or [],
        }
        self.trace.append(entry)

        logger.info(
            "Trace [%d] %s -> %s (%dms): %s",
            entry["step_number"],
            step_name,
            decision,
            time_taken_ms,
            reasoning,
        )

    def get_trace(self) -> List[Dict[str, Any]]:
        """Return the full decision trace."""
        return self.trace

    def get_total_time_ms(self) -> int:
        """Return total elapsed milliseconds since the tracer was created."""
        return int((datetime.now(timezone.utc) - self.start_time).total_seconds() * 1000)

    async def save_to_db(self, query_id: str, db) -> None:
        """Persist all trace entries to the SQLite decision_trace table."""
        from app.models.database import DecisionTrace as DBDecisionTrace

        for entry in self.trace:
            record = DBDecisionTrace(
                id=str(uuid.uuid4()),
                query_id=query_id,
                step_name=entry["step_name"],
                decision=entry["decision"],
                reasoning=entry["reasoning"],
                input_summary=entry["input_summary"],
                output_summary=entry["output_summary"],
                time_taken_ms=entry["time_taken_ms"],
                alternatives_considered=entry["alternatives_considered"],
            )
            db.add(record)

        await db.flush()
        logger.info("Saved %d trace entries to DB for query_id=%s", len(self.trace), query_id)

    def get_summary(self) -> Dict[str, Any]:
        """Return a high-level summary of the trace."""
        step_names = [e["step_name"] for e in self.trace]
        retries_count = sum(
            1 for e in self.trace if "retry" in e["step_name"].lower()
        )
        fallback_triggered = any(
            "fallback" in e["decision"].lower() for e in self.trace
        )

        return {
            "total_steps": len(self.trace),
            "total_time_ms": self.get_total_time_ms(),
            "steps": step_names,
            "retries_count": retries_count,
            "fallback_triggered": fallback_triggered,
        }
