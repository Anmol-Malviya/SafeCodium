"""Safe Vibe AI / SafeCodium — Projects & Ingestion API Endpoints."""

import secrets
import shutil
import uuid
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.config import settings
from backend.app.db.session import get_db
from backend.app.models.project import Project
from backend.app.schemas.common import ApiResponse, ProjectResponse
from backend.app.services.ingestion.extractor import safe_extract_zip, IngestionSecurityError, MAX_UNCOMPRESSED_SIZE_BYTES
from backend.app.services.ingestion.workspace import WorkspaceManager

router = APIRouter(prefix="/projects", tags=["Project Ingestion"])

MAX_UPLOAD_SIZE = 100 * 1024 * 1024  # 100 MB max request size


@router.post("/upload", response_model=ApiResponse[ProjectResponse], status_code=status.HTTP_201_CREATED)
async def upload_project(
    name: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Ingests a C/C++ firmware archive (.zip) or single source file.
    Applies Zip-Slip protection, symlink rejection, provisions shadow workspace,
    enforces read-only permissions on original, and indexes source files.
    """
    project_id = str(uuid.uuid4())
    project_name = name or Path(file.filename or "firmware_project").stem
    original_dir, shadow_dir = WorkspaceManager.setup_project_workspace(project_id)

    raw_filename = Path(file.filename or "upload").name
    file_ext = Path(raw_filename).suffix.lower()

    # Use cryptographically random server-side temporary file
    random_token = secrets.token_hex(8)
    temp_upload_path = settings.DATA_DIR / f"temp_{random_token}_{raw_filename}"

    try:
        # Stream upload with size enforcement
        bytes_read = 0
        with open(temp_upload_path, "wb") as buffer:
            while chunk := await file.read(65536):
                bytes_read += len(chunk)
                if bytes_read > MAX_UPLOAD_SIZE:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="Uploaded file exceeds maximum allowed size of 100MB."
                    )
                buffer.write(chunk)

        if file_ext == ".zip":
            # Safely extract with Zip-Slip defense and symlink rejection
            safe_extract_zip(temp_upload_path, original_dir)
            source_type = "zip"

        elif file_ext in {".c", ".cpp", ".cc", ".cxx", ".h", ".hpp"}:
            dest_file = (original_dir / raw_filename).resolve()
            if not dest_file.is_relative_to(original_dir.resolve()):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid destination path")

            shutil.copyfile(temp_upload_path, dest_file)
            source_type = "single_file"

        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file format '{file_ext}'. Upload a .zip archive or C/C++ source file."
            )

        # Clone original to shadow workspace for patch experimentation
        WorkspaceManager.sync_to_shadow(original_dir, shadow_dir)

        # Protect original workspace files (mark as read-only at OS level)
        WorkspaceManager.protect_original_workspace(original_dir)

        # Detect framework and index files
        framework_type = WorkspaceManager.detect_framework_type(original_dir)
        indexed_files = WorkspaceManager.index_source_files(original_dir)

        # Persist project entity
        project = Project(
            id=project_id,
            name=project_name,
            description=f"Ingested {source_type} ({raw_filename})",
            framework_type=framework_type,
            source_type=source_type,
            original_path=str(original_dir),
            shadow_path=str(shadow_dir),
            file_count=len(indexed_files),
        )
        db.add(project)
        await db.commit()
        await db.refresh(project)

        return ApiResponse(
            success=True,
            message=f"Successfully ingested {project_name} ({len(indexed_files)} C/C++ files indexed)",
            data=ProjectResponse.model_validate(project),
        )

    except IngestionSecurityError as sec_err:
        WorkspaceManager.unprotect_original_workspace(original_dir)
        shutil.rmtree(original_dir.parent, ignore_errors=True)
        shutil.rmtree(shadow_dir.parent, ignore_errors=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Security Validation Failed: {str(sec_err)}",
        )
    except HTTPException:
        WorkspaceManager.unprotect_original_workspace(original_dir)
        shutil.rmtree(original_dir.parent, ignore_errors=True)
        shutil.rmtree(shadow_dir.parent, ignore_errors=True)
        raise
    except Exception as e:
        WorkspaceManager.unprotect_original_workspace(original_dir)
        shutil.rmtree(original_dir.parent, ignore_errors=True)
        shutil.rmtree(shadow_dir.parent, ignore_errors=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to ingest project: {str(e)}",
        )
    finally:
        # Always remove temporary upload artifact
        temp_upload_path.unlink(missing_ok=True)


@router.get("", response_model=ApiResponse[List[ProjectResponse]])
async def list_projects(db: AsyncSession = Depends(get_db)):
    """Lists all ingested firmware projects."""
    result = await db.execute(select(Project).order_by(Project.created_at.desc()))
    projects = result.scalars().all()
    return ApiResponse(
        success=True,
        message=f"Retrieved {len(projects)} projects",
        data=[ProjectResponse.model_validate(p) for p in projects],
    )


@router.get("/{project_id}", response_model=ApiResponse[ProjectResponse])
async def get_project(project_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieves metadata for a specific project."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    return ApiResponse(
        success=True,
        message="Project details retrieved",
        data=ProjectResponse.model_validate(project),
    )


@router.get("/{project_id}/files")
async def get_project_files(project_id: str, db: AsyncSession = Depends(get_db)):
    """Returns list of indexed C/C++ files inside the project."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    original_dir = Path(project.original_path)
    if not original_dir.exists():
        return ApiResponse(success=True, message="Workspace directory not found", data=[])

    files = WorkspaceManager.index_source_files(original_dir)
    return ApiResponse(
        success=True,
        message=f"Indexed {len(files)} source files",
        data=files,
    )


@router.get("/{project_id}/file-content")
async def get_file_content(
    project_id: str,
    path: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Reads the content of a specific source file safely.
    Path traversal is strictly prevented.
    """
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    original_dir = Path(project.original_path).resolve()
    target_path = (original_dir / path).resolve()

    if not target_path.is_relative_to(original_dir) or not target_path.exists() or not target_path.is_file():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or unauthorized file path")

    try:
        with open(target_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
        return ApiResponse(
            success=True,
            message="File content loaded",
            data={"path": path, "content": content},
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to read file: {e}")
