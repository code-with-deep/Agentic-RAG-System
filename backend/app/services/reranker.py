"""
Agentic RAG System -- Cross-Encoder Re-Ranking Service

Loads a cross-encoder model once at module level and provides
reranking functions for retrieved chunks.
"""

import logging
import time
from typing import Any, Dict, List

from sentence_transformers import CrossEncoder

from app.config import settings

logger = logging.getLogger("agentic_rag.reranker")

# ---------------------------------------------------------------------------
# Module-level singleton
# ---------------------------------------------------------------------------
_start = time.perf_counter()
logger.info("Loading CrossEncoder model: %s ...", settings.reranker_model)
cross_encoder = CrossEncoder(settings.reranker_model)
_elapsed = time.perf_counter() - _start
logger.info("CrossEncoder model loaded in %.2f seconds", _elapsed)


# ---------------------------------------------------------------------------
# Main rerank function
# ---------------------------------------------------------------------------
def rerank(query: str, chunks: List[dict], top_k: int = 5) -> List[dict]:
    """Re-rank chunks using the cross-encoder and return the top-k results.

    Each returned chunk is augmented with:
      - original_rank (int): 1-based position before reranking
      - new_rank (int): 1-based position after reranking
      - rerank_score (float): cross-encoder relevance score
    """
    if not chunks:
        return []

    pairs = [[query, chunk["text"]] for chunk in chunks]
    scores = cross_encoder.predict(pairs)

    for idx, chunk in enumerate(chunks):
        chunk["original_rank"] = idx + 1
        chunk["rerank_score"] = float(scores[idx])

    sorted_chunks = sorted(chunks, key=lambda c: c["rerank_score"], reverse=True)

    for new_idx, chunk in enumerate(sorted_chunks):
        chunk["new_rank"] = new_idx + 1

    result = sorted_chunks[:top_k]

    logger.info(
        "Reranked %d chunks -> top %d (best score=%.4f, worst score=%.4f)",
        len(chunks),
        len(result),
        result[0]["rerank_score"] if result else 0.0,
        result[-1]["rerank_score"] if result else 0.0,
    )
    return result


# ---------------------------------------------------------------------------
# Batch reranking with metadata
# ---------------------------------------------------------------------------
def rerank_with_metadata(
    query: str, chunks: List[dict], top_k: int = 5
) -> Dict[str, Any]:
    """Re-rank chunks and return detailed scoring metadata.

    Returns:
        {
            "reranked_chunks": List[dict],
            "score_changes": List[dict],
            "avg_score_before": float,
            "avg_score_after": float,
        }
    """
    if not chunks:
        return {
            "reranked_chunks": [],
            "score_changes": [],
            "avg_score_before": 0.0,
            "avg_score_after": 0.0,
        }

    original_scores = [
        chunk.get("similarity_score", 0.0)
        or chunk.get("rrf_score", 0.0)
        or chunk.get("bm25_score", 0.0)
        for chunk in chunks
    ]
    avg_score_before = sum(original_scores) / len(original_scores) if original_scores else 0.0

    reranked = rerank(query, chunks, top_k)

    avg_score_after = (
        sum(c["rerank_score"] for c in reranked) / len(reranked) if reranked else 0.0
    )

    score_changes = []
    for chunk in reranked:
        original_score = chunk.get("similarity_score", 0.0) or chunk.get("rrf_score", 0.0)
        score_changes.append({
            "chunk_id": chunk.get("chunk_id", ""),
            "original_rank": chunk["original_rank"],
            "new_rank": chunk["new_rank"],
            "score_delta": chunk["rerank_score"] - original_score,
        })

    return {
        "reranked_chunks": reranked,
        "score_changes": score_changes,
        "avg_score_before": avg_score_before,
        "avg_score_after": avg_score_after,
    }
