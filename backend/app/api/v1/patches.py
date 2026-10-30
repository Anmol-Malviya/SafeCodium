"""Safe Vibe AI — Patch Generation API Endpoints."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.session import get_db
from backend.app.models.project import Patch, Project, Vulnerability
from backend.app.schemas.common import ApiResponse
from backend.app.schemas.patch import PatchDetailResponse, PatchGenerateRequest, PatchResponse
from backend.app.services.patching.synthesizer import PatchSynthesizer

router = APIRouter(prefix="/patches", tags=["Automated Patch Generation"])


@router.post("/generate", response_model=ApiResponse[PatchDetailResponse], status_code=status.HTTP_201_CREATED)
async def generate_patch(
    request: PatchGenerateRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Synthesizes a minimal unified diff defensive patch for the specified vulnerability.
    Persists the patch in the database and returns diff metadata.
    """
    result = await db.execute(select(Vulnerability).where(Vulnerability.id == request.vulnerability_id))
    vuln = result.scalar_one_or_none()
    if not vuln:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vulnerability not found")

    proj_res = await db.execute(select(Project).where(Project.id == vuln.project_id))
    project = proj_res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    patch_record, ai_resp = await PatchSynthesizer.synthesize_patch(
        vuln=vuln,
        project=project,
        db=db,
        custom_strategy=request.repair_strategy,
        provider=request.provider or "gemini",
    )

    return ApiResponse(
        success=True,
        message=f"Synthesized defensive patch for {vuln.cwe_id}",
        data=PatchDetailResponse(
            patch=PatchResponse.model_validate(patch_record),
            defensive_checks_added=ai_resp.defensive_checks_added,
            side_effect_assessment=ai_resp.side_effect_assessment,
        ),
    )


@router.get("/{patch_id}", response_model=ApiResponse[PatchResponse])
async def get_patch(patch_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieves a specific patch record."""
    result = await db.execute(select(Patch).where(Patch.id == patch_id))
    patch = result.scalar_one_or_none()
    if not patch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patch not found")

    return ApiResponse(
        success=True,
        message="Patch record retrieved",
        data=PatchResponse.model_validate(patch),
    )


@router.get("/vulnerability/{vuln_id}", response_model=ApiResponse[List[PatchResponse]])
async def list_vulnerability_patches(vuln_id: str, db: AsyncSession = Depends(get_db)):
    """Lists all patches synthesized for a vulnerability."""
    result = await db.execute(
        select(Patch).where(Patch.vulnerability_id == vuln_id).order_by(Patch.created_at.desc())
    )
    patches = result.scalars().all()
    return ApiResponse(
        success=True,
        message=f"Retrieved {len(patches)} patches",
        data=[PatchResponse.model_validate(p) for p in patches],
    )


@router.get("/project/{project_id}", response_model=ApiResponse[List[PatchResponse]])
async def list_project_patches(project_id: str, db: AsyncSession = Depends(get_db)):
    """Lists all patches synthesized across all findings in a project."""
    result = await db.execute(
        select(Patch)
        .join(Vulnerability, Patch.vulnerability_id == Vulnerability.id)
        .where(Vulnerability.project_id == project_id)
        .order_by(Patch.created_at.desc())
    )
    patches = result.scalars().all()
    return ApiResponse(
        success=True,
        message=f"Retrieved {len(patches)} project patches",
        data=[PatchResponse.model_validate(p) for p in patches],
    )
