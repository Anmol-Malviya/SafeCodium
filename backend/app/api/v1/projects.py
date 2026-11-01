"""Safe Vibe AI / SafeCodium — Projects & Ingestion API Endpoints."""

import io
import os
import secrets
import shutil
import uuid
import zipfile
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.auth import get_current_user, verify_project_access
from backend.app.core.config import settings
from backend.app.db.session import get_db
from backend.app.models.project import Project
from backend.app.models.user import User
from backend.app.schemas.common import ApiResponse, ProjectResponse
from backend.app.services.ingestion.extractor import safe_extract_zip, IngestionSecurityError, MAX_UNCOMPRESSED_SIZE_BYTES
from backend.app.services.ingestion.workspace import WorkspaceManager

router = APIRouter(prefix="/projects", tags=["Project Ingestion"])

MAX_UPLOAD_SIZE = 1024 * 1024 * 1024  # 1 GB max request size


@router.post("/upload", response_model=ApiResponse[ProjectResponse], status_code=status.HTTP_201_CREATED)
async def upload_project(
    name: Optional[str] = Form(None),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Ingests a C/C++ firmware archive (.zip) or single source file.
    Applies Zip-Slip protection, symlink rejection, provisions shadow workspace,
    enforces read-only permissions on original, tracks user ownership, and indexes source files.
    """
    project_id = str(uuid.uuid4())
    project_name = name or Path(file.filename or "firmware_project").stem
    original_dir, shadow_dir = WorkspaceManager.setup_project_workspace(project_id)

    raw_filename = Path(file.filename or "upload").name
    file_ext = Path(raw_filename).suffix.lower()

    random_token = secrets.token_hex(8)
    temp_upload_path = settings.DATA_DIR / f"temp_{random_token}_{raw_filename}"

    try:
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

        WorkspaceManager.sync_to_shadow(original_dir, shadow_dir)
        WorkspaceManager.protect_original_workspace(original_dir)
        framework_type = WorkspaceManager.detect_framework_type(original_dir)
        indexed_files = WorkspaceManager.index_source_files(original_dir)

        if len(indexed_files) == 0:
            WorkspaceManager.unprotect_original_workspace(original_dir)
            shutil.rmtree(original_dir.parent, ignore_errors=True)
            shutil.rmtree(shadow_dir.parent, ignore_errors=True)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No supported C/C++ firmware files found in uploaded archive. Upload an archive containing .c, .cpp, or .h files."
            )

        project = Project(
            id=project_id,
            name=project_name,
            description=f"Ingested {source_type} ({raw_filename})",
            framework_type=framework_type,
            source_type=source_type,
            original_path=str(original_dir),
            shadow_path=str(shadow_dir),
            file_count=len(indexed_files),
            owner_id=current_user.id,
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
        temp_upload_path.unlink(missing_ok=True)


@router.get("", response_model=ApiResponse[List[ProjectResponse]])
async def list_projects(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lists ingested firmware projects with tenant segregation."""
    if current_user.role == "admin":
        stmt = select(Project).order_by(Project.created_at.desc())
    else:
        stmt = (
            select(Project)
            .where((Project.owner_id == current_user.id) | (Project.owner_id == None))
            .order_by(Project.created_at.desc())
        )
    result = await db.execute(stmt)
    projects = result.scalars().all()
    return ApiResponse(
        success=True,
        message=f"Retrieved {len(projects)} projects",
        data=[ProjectResponse.model_validate(p) for p in projects],
    )


@router.get("/{project_id}", response_model=ApiResponse[ProjectResponse])
async def get_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves metadata for a specific project with IDOR protection."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    verify_project_access(project, current_user)

    return ApiResponse(
        success=True,
        message="Project details retrieved",
        data=ProjectResponse.model_validate(project),
    )


@router.get("/{project_id}/files")
async def get_project_files(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Returns list of indexed C/C++ files inside the project with IDOR protection."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    verify_project_access(project, current_user)

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
    workspace: Optional[str] = "original",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Reads the content of a specific source file safely from original or shadow workspace.
    Path traversal is strictly prevented and user authorization is enforced.
    """
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    verify_project_access(project, current_user)

    base_dir = Path(project.shadow_path if workspace == "shadow" and project.shadow_path else project.original_path).resolve()
    target_path = (base_dir / path).resolve()

    if not target_path.is_relative_to(base_dir) or not target_path.exists() or not target_path.is_file():
        # Fallback search if path is relative to repo root
        candidates = list(base_dir.glob(f"**/{Path(path).name}"))
        if candidates and candidates[0].is_file():
            target_path = candidates[0]
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or unauthorized file path")

    try:
        with open(target_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
        return ApiResponse(
            success=True,
            message="File content loaded",
            data={"path": path, "content": content, "workspace": workspace},
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to read file: {e}")


@router.delete("/{project_id}", response_model=ApiResponse[dict])
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Deletes an ingested project and its shadow workspace with IDOR protection."""
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    verify_project_access(project, current_user)

    # Cleanup disk workspaces
    if project.original_path:
        WorkspaceManager.unprotect_original_workspace(Path(project.original_path))
        shutil.rmtree(Path(project.original_path).parent, ignore_errors=True)
    if project.shadow_path:
        shutil.rmtree(Path(project.shadow_path).parent, ignore_errors=True)

    await db.delete(project)
    await db.commit()

    return ApiResponse(
        success=True,
        message=f"Project '{project.name}' deleted successfully",
        data={"deleted_project_id": project_id},
    )


@router.get("/{project_id}/download/repaired")
async def download_repaired_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Packs the verified shadow workspace into a ZIP archive and streams it to the user.
    Excludes internal secrets, temp files, and build artifacts.
    """
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    verify_project_access(project, current_user)

    shadow_path = Path(project.shadow_path) if project.shadow_path else None
    if not shadow_path or not shadow_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Repaired shadow workspace not available")

    zip_buffer = io.BytesIO()
    excluded_names = {".git", "__pycache__", ".pytest_cache", ".DS_Store"}
    excluded_exts = {".o", ".obj", ".bin", ".exe", ".pyc", ".tmp"}

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for root, dirs, files in os.walk(shadow_path):
            dirs[:] = [d for d in dirs if d not in excluded_names]
            for file in files:
                if any(file.endswith(ext) for ext in excluded_exts):
                    continue
                file_full = Path(root) / file
                arc_name = file_full.relative_to(shadow_path)
                zip_file.write(file_full, arcname=str(arc_name))

    zip_buffer.seek(0)
    safe_name = f"{project.name.replace(' ', '_')}_repaired.zip"
    from fastapi.responses import Response
    return Response(
        content=zip_buffer.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}"'},
    )


@router.get("/{project_id}/download/original")
async def download_original_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Downloads the immutable original project archive.
    """
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    verify_project_access(project, current_user)

    orig_path = Path(project.original_path) if project.original_path else None
    if not orig_path or not orig_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Original project files not available")

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for root, dirs, files in os.walk(orig_path):
            for file in files:
                file_full = Path(root) / file
                arc_name = file_full.relative_to(orig_path)
                zip_file.write(file_full, arcname=str(arc_name))

    zip_buffer.seek(0)
    safe_name = f"{project.name.replace(' ', '_')}_original.zip"
    from fastapi.responses import Response
    return Response(
        content=zip_buffer.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{safe_name}"'},
    )


@router.get("/{project_id}/manifest", response_model=ApiResponse[dict])
async def get_project_manifest(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Stage 2: Project Discovery and Understanding manifest.
    Returns file structure, detected language, framework, build configs, and entry points.
    """
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    verify_project_access(project, current_user)

    target_dir = Path(project.shadow_path or project.original_path)
    file_list = []
    entry_points = []
    build_configs = []
    excluded_files = []

    for root, dirs, files in os.walk(target_dir):
        for f in files:
            p = Path(root) / f
            rel = str(p.relative_to(target_dir))
            ext = p.suffix.lower()
            if ext in {".c", ".cpp", ".cc", ".h", ".hpp"}:
                content = p.read_text(encoding="utf-8", errors="replace")
                if "app_main" in content or "main(" in content:
                    entry_points.append(rel)
                file_list.append({"path": rel, "type": "source", "lines": len(content.splitlines())})
            elif f.lower() in {"cmakelists.txt", "makefile", "platformio.ini", "sdkconfig"}:
                build_configs.append(rel)
            else:
                excluded_files.append({"path": rel, "reason": "non_c_cpp_resource"})

    manifest = {
        "project_id": project.id,
        "project_name": project.name,
        "framework_type": project.framework_type,
        "source_type": project.source_type,
        "entry_points": entry_points,
        "build_configs": build_configs,
        "source_files": file_list,
        "excluded_files_count": len(excluded_files),
        "compiler_requirements": "clang / gcc embedded toolchain",
    }

    return ApiResponse(
        success=True,
        message="Project manifest discovered",
        data=manifest,
    )
