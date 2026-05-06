"""
Agentic RAG System -- Document Management Routes

Endpoints for uploading, listing, and deleting documents.
"""

import logging
import os
import tempfile
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import Document, get_db
from app.services.ingestion import delete_document_chunks, ingest_document
from app.dependencies import get_current_user

logger = logging.getLogger("agentic_rag.routers.documents")

router = APIRouter(tags=["documents"])

ALLOWED_EXTENSIONS = {"pdf", "txt", "docx", "doc", "md", "markdown"}


def _get_file_extension(filename: str) -> str:
    """Extract the file extension (without dot) from a filename."""
    _, ext = os.path.splitext(filename)
    return ext.lower().lstrip(".")


# ---------------------------------------------------------------------------
# POST /api/documents/upload
# ---------------------------------------------------------------------------
@router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    tags: Optional[str] = Form(default=""),
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Upload a document, run the full ingestion pipeline, and return chunk counts."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    file_ext = _get_file_extension(file.filename)
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file type: '.{file_ext}'. "
                f"Allowed types: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            ),
        )

    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []

    temp_dir = tempfile.mkdtemp()
    temp_path = os.path.join(temp_dir, file.filename)

    try:
        content = await file.read()
        with open(temp_path, "wb") as f:
            f.write(content)

        logger.info("Saved uploaded file to temp path: %s (%d bytes)", temp_path, len(content))

        result = await ingest_document(
            file_path=temp_path,
            file_type=file_ext,
            filename=file.filename,
            tags=tag_list,
            db=db,
            user_id=user_id,
        )

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        if os.path.exists(temp_dir):
            os.rmdir(temp_dir)

    return {
        "document_id": result["doc_id"],
        "filename": result["filename"],
        "file_type": file_ext,
        "chunk_counts": result["chunk_counts"],
        "total_chunks": result["total_chunks"],
        "upload_date": datetime.now(timezone.utc).isoformat(),
    }


# ---------------------------------------------------------------------------
# GET /api/documents
# ---------------------------------------------------------------------------
@router.get("/documents")
async def list_documents(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Return all ingested documents sorted by upload date (newest first)."""
    stmt = select(Document).where(Document.user_id == user_id).order_by(Document.upload_date.desc())
    result = await db.execute(stmt)
    documents = result.scalars().all()

    return [
        {
            "doc_id": doc.id,
            "filename": doc.filename,
            "file_type": doc.file_type,
            "total_pages": doc.total_pages,
            "upload_date": doc.upload_date.isoformat() if doc.upload_date else None,
            "file_size": doc.file_size,
            "tags": doc.tags,
            "chunk_counts": doc.chunk_counts,
            "summary": doc.summary,
        }
        for doc in documents
    ]


# ---------------------------------------------------------------------------
# DELETE /api/documents/{doc_id}
# ---------------------------------------------------------------------------
@router.delete("/documents/{doc_id}")
async def delete_document(
    doc_id: str, 
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user),
):
    """Delete a document and all its chunks from ChromaDB and SQLite."""
    stmt = select(Document).where(Document.id == doc_id, Document.user_id == user_id)
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()

    if doc is None:
        raise HTTPException(
            status_code=404,
            detail=f"Document with id '{doc_id}' not found for this user",
        )

    chunks_deleted = delete_document_chunks(doc_id, user_id)

    await db.delete(doc)
    await db.flush()

    logger.info("Deleted document '%s' (doc_id=%s, %d chunks removed)", doc.filename, doc_id, chunks_deleted)

    return {
        "message": "Document deleted successfully",
        "chunks_deleted": chunks_deleted,
    }
