"""Safe Vibe AI — Patch Generation & Review API Endpoints."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.session import get_db
from backend.app.models.project import Patch, Project, Vulnerability
from backend.app.schemas.common import ApiResponse
from backend.app.schemas.patch import (
    PatchApplyRequest,
    PatchApplyResponse,
    PatchCritiqueResponse,
    PatchDetailResponse,
    PatchGenerateRequest,
    PatchResponse,
)
from backend.app.services.patching.review_engine import PatchReviewEngine
from backend.app.services.patching.synthesizer import PatchSynthesizer

router = APIRouter(prefix="/patches", tags=["Automated Patch Generation & Review"])


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


@router.post("/{patch_id}/critique", response_model=ApiResponse[PatchCritiqueResponse])
async def critique_patch_endpoint(patch_id: str, db: AsyncSession = Depends(get_db)):
    """
    Performs independent heuristic and security critique on a candidate patch:
    C syntax validity, bounds safety, zero heap dynamic allocations, and side-effect assessment.
    """
    result = await db.execute(select(Patch).where(Patch.id == patch_id))
    patch = result.scalar_one_or_none()
    if not patch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patch not found")

    vuln_res = await db.execute(select(Vulnerability).where(Vulnerability.id == patch.vulnerability_id))
    vuln = vuln_res.scalar_one_or_none()
    if not vuln:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vulnerability not found")

    proj_res = await db.execute(select(Project).where(Project.id == vuln.project_id))
    project = proj_res.scalar_one_or_none()

    # Read original code from shadow or original workspace
    original_code = vuln.vulnerable_code
    if project and project.shadow_path:
        from pathlib import Path
        candidate = Path(project.shadow_path) / vuln.file_path
        if candidate.exists():
            original_code = candidate.read_text(encoding="utf-8", errors="replace")

    # Generate dry-run patched code in memory
    success, patched_code, _ = PatchReviewEngine.apply_diff_to_string(original_code, patch.unified_diff)

    critique = PatchReviewEngine.critique_patch(
        patch_id=patch.id,
        cwe_id=vuln.cwe_id,
        original_code=original_code,
        patched_code=patched_code,
        diff_text=patch.unified_diff,
    )

    return ApiResponse(
        success=True,
        message=f"Critique verdict: {critique.summary_verdict}",
        data=PatchCritiqueResponse(
            patch_id=critique.patch_id,
            critique_passed=critique.critique_passed,
            critique_score=critique.critique_score,
            semantic_integrity=critique.semantic_integrity,
            side_effects=critique.side_effects,
            c_syntax_valid=critique.c_syntax_valid,
            bounds_safety=critique.bounds_safety,
            zero_heap_allocation=critique.zero_heap_allocation,
            summary_verdict=critique.summary_verdict,
        ),
    )


@router.post("/{patch_id}/apply", response_model=ApiResponse[PatchApplyResponse])
async def apply_patch_endpoint(
    patch_id: str,
    request: PatchApplyRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Applies unified diff patch strictly to the shadow workspace.
    Guarantees original source repository files in uploads remain completely untouched.
    """
    result = await db.execute(select(Patch).where(Patch.id == patch_id))
    patch = result.scalar_one_or_none()
    if not patch:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patch not found")

    vuln_res = await db.execute(select(Vulnerability).where(Vulnerability.id == patch.vulnerability_id))
    vuln = vuln_res.scalar_one_or_none()
    if not vuln:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vulnerability not found")

    proj_res = await db.execute(select(Project).where(Project.id == vuln.project_id))
    project = proj_res.scalar_one_or_none()
    if not project or not project.shadow_path:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Project shadow workspace unavailable")

    app_result = PatchReviewEngine.apply_patch_to_shadow(
        shadow_workspace_path=project.shadow_path,
        relative_file_path=vuln.file_path,
        diff_text=patch.unified_diff,
        dry_run=request.dry_run,
    )

    if app_result.success and not request.dry_run:
        patch.status = "APPLIED"
        await db.commit()
        await db.refresh(patch)

    return ApiResponse(
        success=app_result.success,
        message="Dry-run application simulated" if request.dry_run else "Patch applied cleanly to shadow workspace",
        data=PatchApplyResponse(
            patch_id=patch.id,
            success=app_result.success,
            is_dry_run=app_result.is_dry_run,
            target_file=app_result.target_file,
            original_code=app_result.original_content,
            patched_code=app_result.patched_content,
            hunks_applied=app_result.hunks_applied,
            hunks_total=app_result.hunks_total,
            status=patch.status,
            diagnostics=app_result.diagnostics,
        ),
    )
