"""Safe Vibe AI — Verification API Endpoints."""

from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.session import get_db
from backend.app.models.project import Patch, Project, Verification, Vulnerability
from backend.app.schemas.common import ApiResponse
from backend.app.schemas.verification import (
    CompileResultResponse,
    DualCompileResponse,
    DualSanitizerResponse,
    SanitizerRunResponse,
    VerificationStatusResponse,
)
from backend.app.services.verification.compiler_harness import DualCompilerHarness
from backend.app.services.verification.sanitizer_harness import SanitizerVerificationHarness

router = APIRouter(prefix="/verification", tags=["Dual Compilation & Verification"])


@router.post("/compile/{patch_id}", response_model=ApiResponse[DualCompileResponse])
async def trigger_dual_compilation(patch_id: str, db: AsyncSession = Depends(get_db)):
    """
    Executes deterministic dual compilation (pre-patch vs post-patch) on the target source file.
    Updates or creates a Verification database record with the exit codes.
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
    if not project or not project.original_path or not project.shadow_path:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Project workspaces not properly configured")

    orig_path = Path(project.original_path) / vuln.file_path
    if not orig_path.exists():
        candidates = list(Path(project.original_path).glob(f"**/{Path(vuln.file_path).name}"))
        if candidates:
            orig_path = candidates[0]

    shadow_path = Path(project.shadow_path) / vuln.file_path
    if not shadow_path.exists():
        candidates = list(Path(project.shadow_path).glob(f"**/{Path(vuln.file_path).name}"))
        if candidates:
            shadow_path = candidates[0]

    comparison = DualCompilerHarness.compare_compilation(
        patch_id=patch.id,
        original_file_path=str(orig_path),
        shadow_file_path=str(shadow_path),
    )

    ver_res = await db.execute(select(Verification).where(Verification.patch_id == patch.id))
    verification = ver_res.scalar_one_or_none()
    if not verification:
        verification = Verification(
            patch_id=patch.id,
            pre_patch_compiler_exit=comparison.pre_patch.exit_code,
            post_patch_compiler_exit=comparison.post_patch.exit_code,
            final_status="INCONCLUSIVE",
        )
        db.add(verification)
    else:
        verification.pre_patch_compiler_exit = comparison.pre_patch.exit_code
        verification.post_patch_compiler_exit = comparison.post_patch.exit_code

    await db.commit()
    await db.refresh(verification)

    return ApiResponse(
        success=comparison.compilation_passed,
        message=comparison.delta_summary,
        data=DualCompileResponse(
            patch_id=comparison.patch_id,
            compiler_name=comparison.compiler_name,
            pre_patch=CompileResultResponse(
                compiler_used=comparison.pre_patch.compiler_used,
                target_file=comparison.pre_patch.target_file,
                exit_code=comparison.pre_patch.exit_code,
                success=comparison.pre_patch.success,
                stdout=comparison.pre_patch.stdout,
                stderr=comparison.pre_patch.stderr,
                warnings_count=comparison.pre_patch.warnings_count,
                errors_count=comparison.pre_patch.errors_count,
                diagnostics=comparison.pre_patch.diagnostics,
            ),
            post_patch=CompileResultResponse(
                compiler_used=comparison.post_patch.compiler_used,
                target_file=comparison.post_patch.target_file,
                exit_code=comparison.post_patch.exit_code,
                success=comparison.post_patch.success,
                stdout=comparison.post_patch.stdout,
                stderr=comparison.post_patch.stderr,
                warnings_count=comparison.post_patch.warnings_count,
                errors_count=comparison.post_patch.errors_count,
                diagnostics=comparison.post_patch.diagnostics,
            ),
            compilation_passed=comparison.compilation_passed,
            status=comparison.status,
            delta_summary=comparison.delta_summary,
        ),
    )


@router.post("/sanitizers/{patch_id}", response_model=ApiResponse[DualSanitizerResponse])
async def trigger_sanitizer_verification(patch_id: str, db: AsyncSession = Depends(get_db)):
    """
    Executes AddressSanitizer (ASan) and UndefinedBehaviorSanitizer (UBSan) passes.
    Verifies that pre-patch memory corruptions (CWE-120/787/476) are neutralized in post-patch shadow firmware.
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
    if not project or not project.original_path or not project.shadow_path:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Project workspaces not properly configured")

    orig_path = Path(project.original_path) / vuln.file_path
    if not orig_path.exists():
        candidates = list(Path(project.original_path).glob(f"**/{Path(vuln.file_path).name}"))
        if candidates:
            orig_path = candidates[0]

    shadow_path = Path(project.shadow_path) / vuln.file_path
    if not shadow_path.exists():
        candidates = list(Path(project.shadow_path).glob(f"**/{Path(vuln.file_path).name}"))
        if candidates:
            shadow_path = candidates[0]

    san_comp = SanitizerVerificationHarness.compare_sanitizers(
        patch_id=patch.id,
        original_file_path=str(orig_path),
        shadow_file_path=str(shadow_path),
    )

    ver_res = await db.execute(select(Verification).where(Verification.patch_id == patch.id))
    verification = ver_res.scalar_one_or_none()
    if not verification:
        verification = Verification(
            patch_id=patch.id,
            asan_exit_code=san_comp.post_patch_asan.exit_code,
            asan_output=san_comp.post_patch_asan.report_output,
            ubsan_exit_code=san_comp.post_patch_ubsan.exit_code,
            ubsan_output=san_comp.post_patch_ubsan.report_output,
            final_status="INCONCLUSIVE",
        )
        db.add(verification)
    else:
        verification.asan_exit_code = san_comp.post_patch_asan.exit_code
        verification.asan_output = san_comp.post_patch_asan.report_output
        verification.ubsan_exit_code = san_comp.post_patch_ubsan.exit_code
        verification.ubsan_output = san_comp.post_patch_ubsan.report_output

    await db.commit()
    await db.refresh(verification)

    def to_run_response(res) -> SanitizerRunResponse:
        return SanitizerRunResponse(
            sanitizer_type=res.sanitizer_type,
            exit_code=res.exit_code,
            passed=res.passed,
            crash_detected=res.crash_detected,
            crash_type=res.crash_type,
            report_output=res.report_output,
            stack_trace=res.stack_trace,
            memory_leak_detected=res.memory_leak_detected,
        )

    return ApiResponse(
        success=san_comp.verification_passed,
        message=san_comp.summary,
        data=DualSanitizerResponse(
            patch_id=san_comp.patch_id,
            pre_patch_asan=to_run_response(san_comp.pre_patch_asan),
            post_patch_asan=to_run_response(san_comp.post_patch_asan),
            pre_patch_ubsan=to_run_response(san_comp.pre_patch_ubsan),
            post_patch_ubsan=to_run_response(san_comp.post_patch_ubsan),
            verification_passed=san_comp.verification_passed,
            status=san_comp.status,
            summary=san_comp.summary,
        ),
    )


@router.get("/status/{patch_id}", response_model=ApiResponse[VerificationStatusResponse])
async def get_verification_status(patch_id: str, db: AsyncSession = Depends(get_db)):
    """Retrieves full verification telemetry for a patch."""
    ver_res = await db.execute(select(Verification).where(Verification.patch_id == patch_id))
    verification = ver_res.scalar_one_or_none()
    if not verification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Verification record not found")

    return ApiResponse(
        success=True,
        message="Verification record retrieved",
        data=VerificationStatusResponse.model_validate(verification),
    )
