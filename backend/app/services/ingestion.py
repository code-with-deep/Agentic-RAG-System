"""
Agentic RAG System -- Document Ingestion Pipeline

Handles document loading, 4 chunking strategies (recursive, parent-child,
section-based, semantic), ChromaDB storage, and BM25 index management.
"""

import asyncio
import json
import logging
import os
import pickle
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
from langchain_community.document_loaders import (
    Docx2txtLoader,
    PyPDFLoader,
    TextLoader,
    UnstructuredMarkdownLoader,
)
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document as LCDocument
from rank_bm25 import BM25Okapi

from app.config import settings

logger = logging.getLogger("agentic_rag.ingestion")

# ---------------------------------------------------------------------------
# Module-level singletons (lazy loaded)
# ---------------------------------------------------------------------------
_embedding_model = None
def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        import torch
        from sentence_transformers import SentenceTransformer
        torch.set_num_threads(1)
        logger.info("Loading SentenceTransformer model: %s ...", settings.embedding_model)
        _embedding_model = SentenceTransformer(settings.embedding_model, device="cpu")
        logger.info("SentenceTransformer model loaded successfully")
    return _embedding_model

_chroma_client = None
_chroma_collection = None
def get_chroma_collection():
    global _chroma_client, _chroma_collection
    if _chroma_collection is None:
        import chromadb
        logger.info("Initialising ChromaDB persistent client at: %s", settings.chroma_db_path)
        _chroma_client = chromadb.PersistentClient(path=settings.chroma_db_path)
        _chroma_collection = _chroma_client.get_or_create_collection(
            name="agentic_rag_chunks",
            metadata={"hnsw:space": "cosine"},
        )
        logger.info("ChromaDB collection 'agentic_rag_chunks' ready")
    return _chroma_collection

# BM25 index persistence path (next to chroma data)
_bm25_path = Path(settings.chroma_db_path) / "bm25_index.pkl"
_bm25_corpus_path = Path(settings.chroma_db_path) / "bm25_corpus.pkl"

bm25_index: Optional[BM25Okapi] = None
bm25_corpus: List[Dict[str, Any]] = []


def _load_bm25_from_disk() -> None:
    """Load persisted BM25 index and corpus from disk if available."""
    global bm25_index, bm25_corpus
    if _bm25_path.exists() and _bm25_corpus_path.exists():
        with open(_bm25_path, "rb") as f:
            bm25_index = pickle.load(f)
        with open(_bm25_corpus_path, "rb") as f:
            bm25_corpus = pickle.load(f)
        logger.info("BM25 index loaded from disk (%d documents)", len(bm25_corpus))
    else:
        logger.info("No existing BM25 index found on disk")


def _save_bm25_to_disk() -> None:
    """Persist BM25 index and corpus to disk."""
    os.makedirs(_bm25_path.parent, exist_ok=True)
    with open(_bm25_path, "wb") as f:
        pickle.dump(bm25_index, f)
    with open(_bm25_corpus_path, "wb") as f:
        pickle.dump(bm25_corpus, f)
    logger.info("BM25 index saved to disk (%d documents)", len(bm25_corpus))


def _rebuild_bm25_from_chroma() -> None:
    """Rebuild BM25 index from all chunks currently in ChromaDB."""
    global bm25_index, bm25_corpus
    collection = get_chroma_collection()
    total = collection.count()
    if total == 0:
        bm25_index = None
        bm25_corpus = []
        _save_bm25_to_disk()
        return

    all_data = collection.get(include=["documents", "metadatas"])
    tokenized = []
    corpus_items: List[Dict[str, Any]] = []
    for idx, (doc_text, meta, cid) in enumerate(
        zip(all_data["documents"], all_data["metadatas"], all_data["ids"])
    ):
        tokens = doc_text.lower().split()
        tokenized.append(tokens)
        corpus_items.append({"chunk_id": cid, "text": doc_text, "metadata": meta})

    bm25_index = BM25Okapi(tokenized)
    bm25_corpus = corpus_items
    _save_bm25_to_disk()


# We do not load bm25 from disk on import anymore, to save memory.
# It will be loaded on demand or explicitly in startup.
# _load_bm25_from_disk()


# ---------------------------------------------------------------------------
# Document Loaders
# ---------------------------------------------------------------------------
def load_document(file_path: str, file_type: str) -> List[LCDocument]:
    """Load a document from disk and return LangChain Document objects."""
    file_type_lower = file_type.lower().strip(".")
    file_name = os.path.basename(file_path)
    upload_date = datetime.now(timezone.utc).isoformat()

    if file_type_lower == "pdf":
        loader = PyPDFLoader(file_path)
    elif file_type_lower == "txt":
        loader = TextLoader(file_path, encoding="utf-8")
    elif file_type_lower in ("docx", "doc"):
        loader = Docx2txtLoader(file_path)
    elif file_type_lower in ("md", "markdown"):
        loader = UnstructuredMarkdownLoader(file_path)
    else:
        raise ValueError(
            f"Unsupported file type: '{file_type}'. "
            "Supported types: pdf, txt, docx, md"
        )

    raw_docs = loader.load()
    for i, doc in enumerate(raw_docs):
        doc.metadata.update({
            "source": file_path,
            "page_number": doc.metadata.get("page", i),
            "file_type": file_type_lower,
            "file_name": file_name,
            "upload_date": upload_date,
        })

    logger.info("Loaded %d pages/sections from %s (%s)", len(raw_docs), file_name, file_type_lower)
    return raw_docs


# ---------------------------------------------------------------------------
# Chunking Strategy 1 -- Recursive Character Split
# ---------------------------------------------------------------------------
def chunk_recursive(docs: List[LCDocument], doc_id: str) -> List[dict]:
    """Split documents using recursive character text splitter."""
    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    splits = splitter.split_documents(docs)
    chunks = []
    for idx, split in enumerate(splits):
        chunks.append({
            "chunk_id": str(uuid.uuid4()),
            "text": split.page_content,
            "source": split.metadata.get("source", ""),
            "page_number": split.metadata.get("page_number", 0),
            "section": split.metadata.get("section", ""),
            "strategy": "recursive",
            "doc_id": doc_id,
            "chunk_index": idx,
        })
    logger.info("Recursive chunking produced %d chunks for doc %s", len(chunks), doc_id)
    return chunks


# ---------------------------------------------------------------------------
# Chunking Strategy 2 -- Parent-Child
# ---------------------------------------------------------------------------
def chunk_parent_child(docs: List[LCDocument], doc_id: str) -> List[dict]:
    """Create parent (large) and child (small) chunk pairs."""
    parent_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    child_splitter = RecursiveCharacterTextSplitter(chunk_size=200, chunk_overlap=20)

    parent_splits = parent_splitter.split_documents(docs)
    all_chunks: List[dict] = []
    child_idx = 0

    for p_idx, parent_doc in enumerate(parent_splits):
        parent_id = str(uuid.uuid4())
        all_chunks.append({
            "chunk_id": parent_id,
            "text": parent_doc.page_content,
            "source": parent_doc.metadata.get("source", ""),
            "page_number": parent_doc.metadata.get("page_number", 0),
            "strategy": "parent_child_parent",
            "doc_id": doc_id,
            "chunk_index": p_idx,
        })

        child_docs = child_splitter.split_documents([parent_doc])
        for child_doc in child_docs:
            all_chunks.append({
                "chunk_id": str(uuid.uuid4()),
                "parent_chunk_id": parent_id,
                "text": child_doc.page_content,
                "source": child_doc.metadata.get("source", ""),
                "page_number": child_doc.metadata.get("page_number", 0),
                "strategy": "parent_child_child",
                "doc_id": doc_id,
                "chunk_index": child_idx,
            })
            child_idx += 1

    logger.info("Parent-child chunking produced %d chunks for doc %s", len(all_chunks), doc_id)
    return all_chunks


# ---------------------------------------------------------------------------
# Chunking Strategy 3 -- Section Based
# ---------------------------------------------------------------------------
_HEADER_PATTERN = re.compile(
    r"(?:^#{1,2}\s+.+$)"       # Markdown H1/H2 headers
    r"|(?:^[A-Z][A-Z\s]{4,}$)" # ALL-CAPS lines (min 5 chars)
    r"|(?:^[A-Z].{3,}:\s*$)",  # Lines ending with colon
    re.MULTILINE,
)


def chunk_section_based(docs: List[LCDocument], doc_id: str) -> List[dict]:
    """Split documents at section headers."""
    full_text = "\n\n".join(doc.page_content for doc in docs)
    source = docs[0].metadata.get("source", "") if docs else ""

    headers = list(_HEADER_PATTERN.finditer(full_text))

    if not headers:
        logger.info("No headers detected in doc %s, falling back to recursive chunking", doc_id)
        return chunk_recursive(docs, doc_id)

    sections: List[dict] = []
    for i, match in enumerate(headers):
        section_title = match.group().strip().lstrip("#").strip()
        start = match.start()
        end = headers[i + 1].start() if i + 1 < len(headers) else len(full_text)
        section_text = full_text[start:end].strip()

        if not section_text:
            continue

        sections.append({
            "chunk_id": str(uuid.uuid4()),
            "text": section_text,
            "source": source,
            "section_title": section_title,
            "strategy": "section_based",
            "doc_id": doc_id,
            "chunk_index": i,
        })

    if not sections:
        logger.info("Empty sections for doc %s, falling back to recursive chunking", doc_id)
        return chunk_recursive(docs, doc_id)

    logger.info("Section-based chunking produced %d chunks for doc %s", len(sections), doc_id)
    return sections


# ---------------------------------------------------------------------------
# Chunking Strategy 4 -- Semantic Chunking
# ---------------------------------------------------------------------------
def _split_into_sentences(text: str) -> List[str]:
    """Split text into sentences using period/newline boundaries."""
    raw = re.split(r'(?<=[.!?])\s+|\n{2,}', text)
    return [s.strip() for s in raw if s.strip()]


def chunk_semantic(docs: List[LCDocument], doc_id: str) -> List[dict]:
    """Chunk by detecting semantic boundaries between consecutive sentences."""
    full_text = "\n\n".join(doc.page_content for doc in docs)
    source = docs[0].metadata.get("source", "") if docs else ""
    page_number = docs[0].metadata.get("page_number", 0) if docs else 0

    sentences = _split_into_sentences(full_text)
    if len(sentences) <= 1:
        return [{
            "chunk_id": str(uuid.uuid4()),
            "text": full_text,
            "source": source,
            "page_number": page_number,
            "strategy": "semantic",
            "doc_id": doc_id,
            "chunk_index": 0,
        }]

    embeddings = get_embedding_model().encode(sentences, show_progress_bar=False)

    similarity_threshold = 0.75
    max_chunk_chars = 2400  # ~600 tokens at 4 chars/token

    chunks: List[dict] = []
    current_sentences: List[str] = [sentences[0]]
    chunk_idx = 0

    for i in range(1, len(sentences)):
        sim = float(np.dot(embeddings[i - 1], embeddings[i]) / (
            np.linalg.norm(embeddings[i - 1]) * np.linalg.norm(embeddings[i]) + 1e-9
        ))
        current_text = " ".join(current_sentences)

        if sim < similarity_threshold or len(current_text) > max_chunk_chars:
            chunks.append({
                "chunk_id": str(uuid.uuid4()),
                "text": current_text,
                "source": source,
                "page_number": page_number,
                "strategy": "semantic",
                "doc_id": doc_id,
                "chunk_index": chunk_idx,
            })
            current_sentences = [sentences[i]]
            chunk_idx += 1
        else:
            current_sentences.append(sentences[i])

    if current_sentences:
        chunks.append({
            "chunk_id": str(uuid.uuid4()),
            "text": " ".join(current_sentences),
            "source": source,
            "page_number": page_number,
            "strategy": "semantic",
            "doc_id": doc_id,
            "chunk_index": chunk_idx,
        })

    logger.info("Semantic chunking produced %d chunks for doc %s", len(chunks), doc_id)
    return chunks


# ---------------------------------------------------------------------------
# ChromaDB Storage Helpers
# ---------------------------------------------------------------------------
def _flatten_metadata(meta: dict) -> dict:
    """Ensure all metadata values are flat (str/int/float) for ChromaDB."""
    flat: Dict[str, Any] = {}
    for k, v in meta.items():
        if isinstance(v, (list, dict)):
            flat[k] = json.dumps(v)
        elif v is None:
            flat[k] = ""
        else:
            flat[k] = v
    return flat


def _store_chunks_in_chroma(chunks: List[dict]) -> None:
    """Batch-add chunks to the ChromaDB collection."""
    if not chunks:
        return

    batch_size = 500
    for start in range(0, len(chunks), batch_size):
        batch = chunks[start : start + batch_size]
        ids = [c["chunk_id"] for c in batch]
        documents = [c["text"] for c in batch]
        embeddings = get_embedding_model().encode(documents, show_progress_bar=False).tolist()
        metadatas = []
        for c in batch:
            meta = {k: v for k, v in c.items() if k not in ("text",)}
            metadatas.append(_flatten_metadata(meta))

        get_chroma_collection().add(
            ids=ids,
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas,
        )

    logger.info("Stored %d chunks in ChromaDB", len(chunks))


# ---------------------------------------------------------------------------
# Main Ingestion Function
# ---------------------------------------------------------------------------
async def ingest_document(
    file_path: str,
    file_type: str,
    filename: str,
    tags: List[str],
    db,
) -> dict:
    """Full ingestion pipeline: load -> chunk (4 strategies) -> store -> index."""
    doc_id = str(uuid.uuid4())
    logger.info("Starting ingestion for '%s' (doc_id=%s)", filename, doc_id)

    # STEP 1 -- Load document
    raw_docs = await asyncio.to_thread(load_document, file_path, file_type)
    total_pages = len(raw_docs)
    file_size = os.path.getsize(file_path)

    # STEP 2 -- Run all 4 chunking strategies in parallel
    recursive_task = asyncio.to_thread(chunk_recursive, raw_docs, doc_id)
    parent_child_task = asyncio.to_thread(chunk_parent_child, raw_docs, doc_id)
    section_task = asyncio.to_thread(chunk_section_based, raw_docs, doc_id)
    semantic_task = asyncio.to_thread(chunk_semantic, raw_docs, doc_id)

    recursive_chunks, parent_child_chunks, section_chunks, semantic_chunks = (
        await asyncio.gather(recursive_task, parent_child_task, section_task, semantic_task)
    )

    all_chunks = recursive_chunks + parent_child_chunks + section_chunks + semantic_chunks

    chunk_counts = {
        "recursive": len(recursive_chunks),
        "parent_child": len(parent_child_chunks),
        "section_based": len(section_chunks),
        "semantic": len(semantic_chunks),
    }
    total_chunks = len(all_chunks)

    logger.info(
        "Chunking complete for '%s': %d total chunks %s",
        filename, total_chunks, chunk_counts,
    )

    # STEP 3 -- Store all chunks in ChromaDB
    await asyncio.to_thread(_store_chunks_in_chroma, all_chunks)

    # STEP 4 -- Rebuild BM25 index from all ChromaDB data
    await asyncio.to_thread(_rebuild_bm25_from_chroma)

    # STEP 5 -- Save document record to SQLite
    from app.models.database import Document as DBDocument

    doc_record = DBDocument(
        id=doc_id,
        filename=filename,
        file_type=file_type,
        total_pages=total_pages,
        file_size=file_size,
        tags=tags,
        chunk_counts=chunk_counts,
    )
    db.add(doc_record)
    await db.flush()

    logger.info("Ingestion complete for '%s' (doc_id=%s, %d chunks)", filename, doc_id, total_chunks)

    # STEP 6 -- Return result
    return {
        "doc_id": doc_id,
        "filename": filename,
        "total_chunks": total_chunks,
        "chunk_counts": chunk_counts,
    }


# ---------------------------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------------------------
def get_all_chunks(filters: Optional[dict] = None) -> List[dict]:
    """Query ChromaDB with optional metadata filters."""
    kwargs: Dict[str, Any] = {"include": ["documents", "metadatas", "embeddings"]}
    if filters:
        kwargs["where"] = filters

    collection = get_chroma_collection()
    total = collection.count()
    if total == 0:
        return []

    kwargs["limit"] = total
    results = collection.get(**kwargs)

    chunks = []
    for idx in range(len(results["ids"])):
        chunk = {
            "chunk_id": results["ids"][idx],
            "text": results["documents"][idx],
        }
        if results["metadatas"] and idx < len(results["metadatas"]):
            chunk.update(results["metadatas"][idx])
        chunks.append(chunk)

    return chunks


def delete_document_chunks(doc_id: str) -> int:
    """Delete all chunks belonging to a document and rebuild BM25."""
    collection = get_chroma_collection()
    existing = collection.get(where={"doc_id": doc_id}, include=[])
    chunk_ids = existing["ids"]

    if not chunk_ids:
        logger.info("No chunks found in ChromaDB for doc_id=%s", doc_id)
        return 0

    collection.delete(ids=chunk_ids)
    count = len(chunk_ids)
    logger.info("Deleted %d chunks from ChromaDB for doc_id=%s", count, doc_id)

    _rebuild_bm25_from_chroma()
    return count
