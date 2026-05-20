"""
Agentic RAG System -- Retrieval Strategies

Provides 6 retrieval strategies (basic_vector, bm25, hybrid_rerank,
multi_query, section_based, context_aware) and a master retrieve()
dispatcher. All strategies return List[dict] with a unified schema.
"""

import asyncio
import json
import logging
from collections import defaultdict
from typing import Any, Dict, List, Optional

import numpy as np

from app.config import settings
from app.services import ingestion
from app.services.reranker import rerank_with_metadata
from app.services.llm_client import parse_llm_json

logger = logging.getLogger("agentic_rag.retrieval")


# ---------------------------------------------------------------------------
# Unified chunk schema helper
# ---------------------------------------------------------------------------
def _normalise_chunk(raw: dict) -> dict:
    """Ensure every chunk dict has the standard set of keys."""
    return {
        "chunk_id": raw.get("chunk_id", ""),
        "text": raw.get("text", ""),
        "source": raw.get("source", ""),
        "page_number": raw.get("page_number", 0),
        "section": raw.get("section", raw.get("section_title", "")),
        "strategy": raw.get("strategy", ""),
        "doc_id": raw.get("doc_id", ""),
        "similarity_score": raw.get("similarity_score", 0.0),
        "bm25_score": raw.get("bm25_score", 0.0),
        "rerank_score": raw.get("rerank_score", 0.0),
        "rrf_score": raw.get("rrf_score", 0.0),
        "original_rank": raw.get("original_rank", 0),
        "new_rank": raw.get("new_rank", 0),
        "parent_chunk_id": raw.get("parent_chunk_id", ""),
    }


# ---------------------------------------------------------------------------
# Reciprocal Rank Fusion
# ---------------------------------------------------------------------------
def reciprocal_rank_fusion(
    result_lists: List[List[dict]], k: int = 60
) -> List[dict]:
    """Merge multiple ranked result lists using Reciprocal Rank Fusion.

    score(doc) = sum(1 / (k + rank)) across all lists where doc appears.
    rank is 1-based.
    """
    scores: Dict[str, float] = defaultdict(float)
    chunk_map: Dict[str, dict] = {}

    for result_list in result_lists:
        for rank_0, chunk in enumerate(result_list):
            cid = chunk.get("chunk_id", "")
            if not cid:
                continue
            rank = rank_0 + 1  # 1-based
            scores[cid] += 1.0 / (k + rank)
            if cid not in chunk_map:
                chunk_map[cid] = chunk.copy()

    merged = []
    for cid, rrf_score in sorted(scores.items(), key=lambda x: x[1], reverse=True):
        entry = chunk_map[cid]
        entry["rrf_score"] = rrf_score
        merged.append(entry)

    return merged


# ---------------------------------------------------------------------------
# Strategy 1 -- Basic Vector Search
# ---------------------------------------------------------------------------
async def retrieve_basic_vector(
    query: str, 
    top_k: int = 20, 
    filters: Optional[dict] = None,
    user_id: Optional[str] = None
) -> List[dict]:
    """Embed query and search ChromaDB for nearest neighbours."""
    collection = ingestion.get_chroma_collection()
    if collection.count() == 0:
        logger.warning("ChromaDB collection is empty -- returning no results")
        return []

    query_embedding = await asyncio.to_thread(
        ingestion.get_embedding_model().encode, query, show_progress_bar=False
    )

    # Combine user filter with any provided filters
    chroma_filters = {}
    if user_id:
        chroma_filters["user_id"] = user_id
    
    if filters:
        if chroma_filters:
            chroma_filters = {"$and": [chroma_filters, filters]}
        else:
            chroma_filters = filters

    kwargs: Dict[str, Any] = {
        "query_embeddings": [query_embedding.tolist()],
        "n_results": max(1, min(top_k, collection.count() or 1)),
        "include": ["documents", "metadatas", "distances"],
    }
    if chroma_filters:
        kwargs["where"] = chroma_filters

    results = await asyncio.to_thread(collection.query, **kwargs)

    chunks: List[dict] = []
    if not results["ids"] or not results["ids"][0]:
        return chunks

    for idx in range(len(results["ids"][0])):
        meta = results["metadatas"][0][idx] if results["metadatas"] else {}
        distance = results["distances"][0][idx] if results["distances"] else 1.0
        similarity = 1.0 - distance  # cosine distance -> similarity

        chunk = {
            "chunk_id": results["ids"][0][idx],
            "text": results["documents"][0][idx],
            "similarity_score": similarity,
        }
        chunk.update(meta)
        chunks.append(_normalise_chunk(chunk))

    logger.info("Basic vector search returned %d chunks for query (user_id=%s)", len(chunks), user_id)
    return chunks


# ---------------------------------------------------------------------------
# Strategy 2 -- BM25 Keyword Search
# ---------------------------------------------------------------------------
async def retrieve_bm25(query: str, top_k: int = 20, user_id: Optional[str] = None) -> List[dict]:
    """Tokenize query and score documents with BM25, filtered by user."""
    # Get user-specific BM25 index
    user_bm25 = await ingestion.get_user_bm25(user_id)
    if not user_bm25 or not user_bm25["index"]:
        logger.warning("BM25 index not available for user %s -- returning no results", user_id)
        return []

    index = user_bm25["index"]
    corpus = user_bm25["corpus"]

    import re
    tokens = re.findall(r"\w+", query.lower())
    scores = index.get_scores(tokens)

    scored_indices = sorted(
        range(len(scores)), key=lambda i: scores[i], reverse=True
    )[:top_k]

    chunks: List[dict] = []
    for idx in scored_indices:
        if scores[idx] <= 0:
            continue
        entry = corpus[idx].copy()
        meta = entry.pop("metadata", {})
        entry.update(meta)
        entry["bm25_score"] = float(scores[idx])
        chunks.append(_normalise_chunk(entry))

    logger.info("BM25 search returned %d chunks for query (user_id=%s)", len(chunks), user_id)
    return chunks


# ---------------------------------------------------------------------------
# Strategy 3 -- Hybrid + ReRank (DEFAULT)
# ---------------------------------------------------------------------------
async def retrieve_hybrid_rerank(
    query: str,
    top_k_initial: int = 20,
    top_k_final: int = 5,
    filters: Optional[dict] = None,
    user_id: Optional[str] = None,
) -> List[dict]:
    """Run vector + BM25 in parallel, fuse with RRF, then cross-encoder rerank."""
    vector_task = retrieve_basic_vector(query, top_k=top_k_initial, filters=filters, user_id=user_id)
    bm25_task = retrieve_bm25(query, top_k_initial, user_id=user_id)

    vector_results, bm25_results = await asyncio.gather(vector_task, bm25_task)

    merged = reciprocal_rank_fusion([vector_results, bm25_results])

    if not merged:
        logger.warning("Hybrid retrieval produced 0 results")
        return []

    rerank_result = await asyncio.to_thread(
        rerank_with_metadata, query, merged, top_k_final
    )
    reranked = rerank_result["reranked_chunks"]

    normalised = [_normalise_chunk(c) for c in reranked]
    logger.info(
        "Hybrid+rerank: vector=%d, bm25=%d, fused=%d, final=%d",
        len(vector_results), len(bm25_results), len(merged), len(normalised),
    )
    return normalised


# ---------------------------------------------------------------------------
# Strategy 4 -- Multi-Query
# ---------------------------------------------------------------------------
async def retrieve_multi_query(
    query: str, 
    top_k: int = 5, 
    llm: Any = None,
    user_id: Optional[str] = None
) -> List[dict]:
    """Generate query variants via LLM, retrieve for each, merge with RRF."""
    if llm is None:
        logger.warning("No LLM provided for multi-query; falling back to hybrid_rerank")
        return await retrieve_hybrid_rerank(query, top_k_final=top_k, user_id=user_id)

    prompt = (
        "Generate 4 different phrasings of this question that might retrieve "
        "different relevant information. Return ONLY a JSON array of 4 strings. "
        "No explanation. No markdown. Just the JSON array.\n"
        f"Original question: {query}"
    )

    try:
        llm_response = await asyncio.to_thread(llm.invoke, prompt)
        response_text = llm_response.content if hasattr(llm_response, "content") else str(llm_response)
        variants = parse_llm_json(response_text)
        if not isinstance(variants, list):
            variants = [query]
    except Exception as exc:
        logger.error("Failed to parse multi-query LLM response: %s", exc)
        variants = [query]

    all_queries = [query] + variants[:4]
    logger.info("Multi-query strategy using %d query variants", len(all_queries))

    tasks = []
    for q in all_queries:
        tasks.append(retrieve_basic_vector(q, top_k=20, user_id=user_id))
        tasks.append(retrieve_bm25(q, 20, user_id=user_id))

    results = await asyncio.gather(*tasks)

    result_lists = [r for r in results if r]
    merged = reciprocal_rank_fusion(result_lists)

    seen_ids: set = set()
    unique: List[dict] = []
    for chunk in merged:
        cid = chunk.get("chunk_id", "")
        if cid not in seen_ids:
            seen_ids.add(cid)
            unique.append(_normalise_chunk(chunk))

    final = unique[:top_k]
    logger.info("Multi-query retrieval returned %d unique chunks", len(final))
    return final


# ---------------------------------------------------------------------------
# Strategy 5 -- Section Based
# ---------------------------------------------------------------------------
async def retrieve_section_based(
    query: str, 
    top_k: int = 5, 
    filters: Optional[dict] = None,
    user_id: Optional[str] = None
) -> List[dict]:
    """Retrieve only section-based chunks from ChromaDB."""
    section_filter = {"strategy": "section_based"}
    if filters:
        section_filter = {"$and": [section_filter, filters]}

    results = await retrieve_basic_vector(query, top_k=top_k, filters=section_filter, user_id=user_id)
    logger.info("Section-based retrieval returned %d chunks", len(results))
    return results


# ---------------------------------------------------------------------------
# Strategy 6 -- Context Aware (Conversational)
# ---------------------------------------------------------------------------
async def retrieve_context_aware(
    query: str,
    conversation_history: Optional[List[dict]] = None,
    top_k: int = 5,
    user_id: Optional[str] = None
) -> List[dict]:
    """Enrich query with conversation history and run hybrid_rerank."""
    history_summary = ""
    if conversation_history:
        recent = conversation_history[-3:]
        parts = []
        for turn in recent:
            role = turn.get("role", "user")
            content = turn.get("content", "")
            parts.append(f"{role}: {content}")
        history_summary = " | ".join(parts)

    if history_summary:
        enriched_query = f"Previous context: {history_summary}. Current question: {query}"
    else:
        enriched_query = query

    logger.info("Context-aware retrieval with enriched query (%d chars)", len(enriched_query))
    return await retrieve_hybrid_rerank(enriched_query, top_k_final=top_k, user_id=user_id)


# ---------------------------------------------------------------------------
# Master Retrieve Dispatcher
# ---------------------------------------------------------------------------
async def retrieve(
    query: str,
    strategy: str,
    top_k_initial: int = 20,
    top_k_final: int = 5,
    filters: Optional[dict] = None,
    conversation_history: Optional[List[dict]] = None,
    llm: Any = None,
    user_id: Optional[str] = None,
) -> List[dict]:
    """Route to the correct retrieval strategy and return normalised chunks."""
    logger.info("Retrieve called with strategy='%s', top_k_initial=%d, top_k_final=%d, user_id=%s",
                strategy, top_k_initial, top_k_final, user_id)

    if strategy == "basic_vector":
        return await retrieve_basic_vector(query, top_k=top_k_final, filters=filters, user_id=user_id)

    elif strategy == "hybrid_rerank":
        return await retrieve_hybrid_rerank(
            query, top_k_initial=top_k_initial, top_k_final=top_k_final, filters=filters, user_id=user_id
        )

    elif strategy == "multi_query":
        return await retrieve_multi_query(query, top_k=top_k_final, llm=llm, user_id=user_id)

    elif strategy == "section_based":
        return await retrieve_section_based(query, top_k=top_k_final, filters=filters, user_id=user_id)

    elif strategy == "context_aware":
        return await retrieve_context_aware(
            query, conversation_history=conversation_history, top_k=top_k_final, user_id=user_id
        )

    elif strategy == "fallback":
        logger.info("Fallback strategy: broadening retrieval to top_k_initial=30")
        return await retrieve_hybrid_rerank(
            query, top_k_initial=30, top_k_final=top_k_final, filters=filters, user_id=user_id
        )

    else:
        logger.warning("Unknown strategy '%s', defaulting to hybrid_rerank", strategy)
        return await retrieve_hybrid_rerank(
            query, top_k_initial=top_k_initial, top_k_final=top_k_final, filters=filters, user_id=user_id
        )
