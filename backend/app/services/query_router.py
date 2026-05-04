"""
Agentic RAG System -- Query Router

Classifies queries into types (FACTUAL, ANALYTICAL, SUMMARIZATION,
CONVERSATIONAL, OUT_OF_SCOPE), selects the appropriate retrieval
strategy, and provides query refinement for CRAG retries.
"""

import json
import logging
from typing import Any, Dict, List, Optional

from app.config import settings
from app.services.llm_client import llm

logger = logging.getLogger("agentic_rag.query_router")

# ---------------------------------------------------------------------------
# Classification prompt template
# ---------------------------------------------------------------------------
CLASSIFICATION_PROMPT = """You are a query classifier for a RAG system.
Classify the following query into EXACTLY ONE of these types:

FACTUAL - asks for a specific fact, number, date, name, or data point
          Example: 'What was the revenue in Q3?' or 'Who is the CEO?'

ANALYTICAL - requires reasoning, comparison, or analysis across multiple pieces
             Example: 'Compare the growth rates of all regions' or 
                      'What are the key differences between Plan A and Plan B?'

SUMMARIZATION - asks for a broad overview or summary of content
                Example: 'Summarize the executive summary' or 
                         'Give me an overview of the document'

CONVERSATIONAL - follows up on a previous answer or references prior context
                 Example: 'Tell me more about that' or 'Can you elaborate?'

OUT_OF_SCOPE - cannot be answered from documents, asks about external world
               Example: 'What is the weather today?' or 'Who won the election?'

Query: {query}

Respond with ONLY a valid JSON object. No explanation. No markdown. No preamble.
Format: 
{{"type": "FACTUAL|ANALYTICAL|SUMMARIZATION|CONVERSATIONAL|OUT_OF_SCOPE", "confidence": 0.0, "reasoning": "one sentence explaining why this classification was chosen", "alternative_type": "second most likely type if confidence < 0.85"}}"""

STRICT_CLASSIFICATION_PROMPT = """Classify this query as EXACTLY one of: FACTUAL, ANALYTICAL, SUMMARIZATION, CONVERSATIONAL, OUT_OF_SCOPE.

Query: {query}

Return ONLY valid JSON, nothing else:
{{"type": "FACTUAL", "confidence": 0.8, "reasoning": "reason", "alternative_type": "ANALYTICAL"}}"""


# ---------------------------------------------------------------------------
# Query Classification
# ---------------------------------------------------------------------------
async def classify_query(query: str) -> Dict[str, Any]:
    """Classify a query into a type using the LLM."""
    prompt = CLASSIFICATION_PROMPT.format(query=query)

    try:
        response = await llm.ainvoke(prompt)
        response_text = response.content if hasattr(response, "content") else str(response)
        response_text = response_text.strip()

        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.lower().startswith("json"):
                response_text = response_text[4:]
            response_text = response_text.strip()

        result = json.loads(response_text)

        classification = {
            "query_type": result.get("type", "FACTUAL").upper(),
            "confidence": float(result.get("confidence", 0.5)),
            "reasoning": result.get("reasoning", ""),
            "alternative_type": result.get("alternative_type", ""),
        }

        logger.info(
            "Query classified as %s (confidence=%.2f): %s",
            classification["query_type"],
            classification["confidence"],
            classification["reasoning"],
        )
        return classification

    except (json.JSONDecodeError, KeyError, TypeError) as exc:
        logger.warning("First classification attempt failed (%s), retrying with strict prompt", exc)

    try:
        strict_prompt = STRICT_CLASSIFICATION_PROMPT.format(query=query)
        response = await llm.ainvoke(strict_prompt)
        response_text = response.content if hasattr(response, "content") else str(response)
        response_text = response_text.strip()

        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.lower().startswith("json"):
                response_text = response_text[4:]
            response_text = response_text.strip()

        result = json.loads(response_text)
        classification = {
            "query_type": result.get("type", "FACTUAL").upper(),
            "confidence": float(result.get("confidence", 0.5)),
            "reasoning": result.get("reasoning", ""),
            "alternative_type": result.get("alternative_type", ""),
        }

        logger.info("Strict retry succeeded: %s (confidence=%.2f)", classification["query_type"], classification["confidence"])
        return classification

    except Exception as exc:
        logger.error("Classification failed on retry: %s. Using safe default.", exc)
        return {
            "query_type": "FACTUAL",
            "confidence": 0.5,
            "reasoning": "classification failed, using safe default",
            "alternative_type": "",
        }


# ---------------------------------------------------------------------------
# Strategy Routing
# ---------------------------------------------------------------------------
async def route_query(query: str) -> Dict[str, Any]:
    """Classify the query and map it to a retrieval strategy."""
    classification = await classify_query(query)
    query_type = classification["query_type"]
    confidence = classification["confidence"]
    confidence_override = False

    if confidence < settings.routing_confidence_threshold:
        strategy = "hybrid_rerank"
        confidence_override = True
        logger.info(
            "Confidence %.2f < threshold %.2f; overriding to hybrid_rerank",
            confidence,
            settings.routing_confidence_threshold,
        )
    else:
        strategy = settings.routing_table.get(query_type.lower(), "hybrid_rerank")
        logger.info("Routed %s -> strategy=%s", query_type, strategy)

    return {
        "query_type": query_type,
        "confidence": confidence,
        "strategy": strategy,
        "reasoning": classification["reasoning"],
        "confidence_override": confidence_override,
        "alternative_type": classification["alternative_type"],
    }


# ---------------------------------------------------------------------------
# Query Refinement (called by CRAG on retrieval failure)
# ---------------------------------------------------------------------------
REFINEMENT_PROMPT = """The following query failed to retrieve relevant information from documents.
Reason for failure: {failed_reason}

Rewrite the query to be more specific and likely to find relevant content.
Extract key entities, remove ambiguity, add specificity.

Original query: {original_query}

Respond with ONLY the rewritten query as a plain string.
No explanation. No JSON. Just the improved query."""


async def refine_query(original_query: str, failed_reason: str) -> str:
    """Rewrite a query to improve retrieval results."""
    prompt = REFINEMENT_PROMPT.format(
        original_query=original_query, failed_reason=failed_reason
    )

    try:
        response = await llm.ainvoke(prompt)
        refined = response.content if hasattr(response, "content") else str(response)
        refined = refined.strip().strip('"').strip("'")

        if refined and refined != original_query:
            logger.info("Query refined: '%s' -> '%s'", original_query, refined)
            return refined
        else:
            logger.warning("Refinement returned same or empty query, using original")
            return original_query

    except Exception as exc:
        logger.error("Query refinement failed: %s. Returning original query.", exc)
        return original_query


# ---------------------------------------------------------------------------
# Alternative Strategy Selector
# ---------------------------------------------------------------------------
_FALLBACK_STRATEGIES: Dict[str, Dict[int, str]] = {
    "hybrid_rerank": {2: "multi_query", 3: "basic_vector"},
    "multi_query": {2: "hybrid_rerank", 3: "section_based"},
    "section_based": {2: "hybrid_rerank", 3: "multi_query"},
    "basic_vector": {2: "hybrid_rerank", 3: "multi_query"},
    "context_aware": {2: "hybrid_rerank", 3: "multi_query"},
    "fallback": {2: "hybrid_rerank", 3: "hybrid_rerank"},
}


def get_alternative_strategy(current_strategy: str, attempt_number: int) -> str:
    """Return a different retrieval strategy when the current one fails."""
    if attempt_number > 3:
        return "fallback"

    strategy_map = _FALLBACK_STRATEGIES.get(current_strategy, {})
    alternative = strategy_map.get(attempt_number, "hybrid_rerank")

    logger.info(
        "Alternative strategy for '%s' attempt %d -> '%s'",
        current_strategy,
        attempt_number,
        alternative,
    )
    return alternative
