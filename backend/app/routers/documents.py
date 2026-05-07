"""
Agentic RAG System -- Document Management Routes

Endpoints for uploading, listing, and deleting documents.
"""

import logging
import magic
import os
import tempfile
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.database import Document, User, get_db
from app.services.ingestion import delete_document_chunks, ingest_document
from app.dependencies import get_current_user

logger = logging.getLogger("agentic_rag.routers.documents")

router = APIRouter(tags=["documents"])

ALLOWED_EXTENSIONS = {"pdf", "txt", "docx", "md", "markdown"}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25MB

# Expected MIME types for content verification
MIME_MAP = {
    "pdf": ["application/pdf"],
    "docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/zip"],
    "txt": ["text/plain", "application/octet-stream"],
    "md": ["text/plain", "text/markdown", "application/octet-stream"],
    "markdown": ["text/plain", "text/markdown", "application/octet-stream"],
}


def _get_file_extension(filename: str) -> str:
    """Extract the file extension (without dot) from a filename."""
    _, ext = os.path.splitext(filename)
    return ext.lower().lstrip(".")


def _secure_filename(filename: str) -> str:
    """Sanitize a filename to prevent path traversal and FS issues."""
    # Remove directory components
    base = os.path.basename(filename)
    # Remove null bytes and other dangerous characters
    safe = "".join(c for c in base if c.isalnum() or c in "._- ")
    # Ensure it's not empty and doesn't start with a dot (hidden file)
    if not safe or safe.startswith("."):
        return f"uploaded_file_{int(datetime.now().timestamp())}"
    return safe


# ---------------------------------------------------------------------------
# POST /api/documents/upload
# ---------------------------------------------------------------------------
@router.post("/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    tags: Optional[str] = Form(default=""),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upload a document, run the full ingestion pipeline, and return chunk counts."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    safe_name = _secure_filename(file.filename)
    file_ext = _get_file_extension(safe_name)
    
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: '.{file_ext}'",
        )

    # STEP 1: Strict Size Check (Avoid Disk Exhaustion)
    if file.size and file.size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({file.size} bytes). Max limit is {MAX_FILE_SIZE} bytes (25MB).",
        )

    # STEP 2: MIME-Magic Verification (Avoid payload spoofing)
    header = await file.read(2048)
    await file.seek(0)
    
    mime_type = magic.from_buffer(header, mime=True)
    expected_mimes = MIME_MAP.get(file_ext, [])
    
    if mime_type not in expected_mimes:
        logger.warning("MIME mismatch: file=%s, ext=%s, detected_mime=%s", file.filename, file_ext, mime_type)
        raise HTTPException(
            status_code=400,
            detail=f"Security Alert: File content for '.{file_ext}' does not match expected format (detected: {mime_type}).",
        )

    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = os.path.join(temp_dir, safe_name)

        try:
            content = await file.read()
            with open(temp_path, "wb") as f:
                f.write(content)

            logger.info("Saved uploaded file to temp path: %s (%d bytes)", temp_path, len(content))

            result = await ingest_document(
                file_path=temp_path,
                file_type=file_ext,
                filename=safe_name,
                tags=tag_list,
                db=db,
                user_id=current_user.sub,
            )
        except Exception as exc:
            logger.error("Ingestion failed: %s", exc)
            raise HTTPException(status_code=500, detail=f"Document ingestion failed: {str(exc)}")

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
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    response: Response = None,
):
    """Return a paginated list of documents for the current user."""
    # Cap limit to 100
    limit = min(limit, 100)
    
    # 1. Get total count for header
    from sqlalchemy import func
    count_stmt = select(func.count()).select_from(Document).where(Document.user_id == current_user.sub)
    count_result = await db.execute(count_stmt)
    total_count = count_result.scalar() or 0
    
    if response:
        response.headers["X-Total-Count"] = str(total_count)
        # Expose header to frontend (CORS)
        response.headers["Access-Control-Expose-Headers"] = "X-Total-Count"

    # 2. Get paginated results
    stmt = (
        select(Document)
        .where(Document.user_id == current_user.sub)
        .order_by(Document.upload_date.desc())
        .offset(skip)
        .limit(limit)
    )
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
@router.delete("/documents/{doc_id}", status_code=204)
async def delete_document(
    doc_id: str, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a document and all its chunks from ChromaDB and SQLite."""
    stmt = select(Document).where(Document.id == doc_id, Document.user_id == current_user.sub)
    result = await db.execute(stmt)
    doc = result.scalar_one_or_none()

    if doc is None:
        raise HTTPException(
            status_code=404,
            detail=f"Document with id '{doc_id}' not found for this user",
        )

    chunks_deleted = delete_document_chunks(doc_id, current_user.sub)

    await db.delete(doc)
    await db.commit()

    logger.info("Deleted document '%s' (doc_id=%s, %d chunks removed)", doc.filename, doc_id, chunks_deleted)
    return None
