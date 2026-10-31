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
    RegressionSuiteResponse,
    ResourceProfileResponse,
    SanitizerRunResponse,
    SectionMetricsResponse,
    TestCaseResponse,
    VerificationStatusResponse,
)
from backend.app.services.verification.compiler_harness import DualCompilerHarness
from backend.app.services.verification.regression_harness import RegressionTestHarness
from backend.app.services.verification.resource_profiler import ResourceProfiler
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
                execution_mode=comparison.post_patch.execution_mode,
            ),
            compilation_passed=comparison.compilation_passed,
            status=comparison.status,
            delta_summary=comparison.delta_summary,
            execution_mode=comparison.execution_mode,
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
            execution_mode=res.execution_mode,
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
            execution_mode=san_comp.execution_mode,
        ),
    )


@router.post("/regression/{patch_id}", response_model=ApiResponse[RegressionSuiteResponse])
async def trigger_regression_suite(patch_id: str, db: AsyncSession = Depends(get_db)):
    """
    Executes 4-tier functional & exploit regression matrix:
    1. Benign functional sensor packet.
    2. Boundary limit capacity.
    3. Adversarial exploit payload.
    4. NULL fault injection.
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

    reg_suite = RegressionTestHarness.run_regression_suite(
        patch_id=patch.id,
        cwe_id=vuln.cwe_id,
        original_source_path=str(orig_path),
        shadow_source_path=str(shadow_path),
    )

    ver_res = await db.execute(select(Verification).where(Verification.patch_id == patch.id))
    verification = ver_res.scalar_one_or_none()
    if not verification:
        verification = Verification(
            patch_id=patch.id,
            test_suite_passed=reg_suite.suite_passed,
            test_results_json={
                "total_cases": reg_suite.total_cases,
                "passed_cases": reg_suite.passed_cases,
                "summary": reg_suite.summary,
            },
            final_status="INCONCLUSIVE",
        )
        db.add(verification)
    else:
        verification.test_suite_passed = reg_suite.suite_passed
        verification.test_results_json = {
            "total_cases": reg_suite.total_cases,
            "passed_cases": reg_suite.passed_cases,
            "summary": reg_suite.summary,
        }

    await db.commit()
    await db.refresh(verification)

    return ApiResponse(
        success=reg_suite.suite_passed,
        message=reg_suite.summary,
        data=RegressionSuiteResponse(
            patch_id=reg_suite.patch_id,
            total_cases=reg_suite.total_cases,
            passed_cases=reg_suite.passed_cases,
            failed_cases=reg_suite.failed_cases,
            suite_passed=reg_suite.suite_passed,
            status=reg_suite.status,
            cases=[
                TestCaseResponse(
                    case_id=c.case_id,
                    case_name=c.case_name,
                    category=c.category,
                    input_vector=c.input_vector,
                    expected_behavior=c.expected_behavior,
                    pre_patch_passed=c.pre_patch_passed,
                    pre_patch_behavior=c.pre_patch_behavior,
                    post_patch_passed=c.post_patch_passed,
                    post_patch_behavior=c.post_patch_behavior,
                    regression_detected=c.regression_detected,
                    vulnerability_neutralized=c.vulnerability_neutralized,
                )
                for c in reg_suite.cases
            ],
            summary=reg_suite.summary,
        ),
    )


@router.post("/resource/{patch_id}", response_model=ApiResponse[ResourceProfileResponse])
async def trigger_resource_profiling(patch_id: str, db: AsyncSession = Depends(get_db)):
    """
    Executes binary footprint analysis (Flash vs RAM delta).
    If Compiler (exit 0), Sanitizers (0 crashes), Regression (100%), and Resource (<256B) pass,
    promotes Verification.final_status to 'VERIFIED'.
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

    prof_res = ResourceProfiler.compare_resource_profile(
        patch_id=patch.id,
        original_source_path=str(orig_path),
        shadow_source_path=str(shadow_path),
    )

    ver_res = await db.execute(select(Verification).where(Verification.patch_id == patch.id))
    verification = ver_res.scalar_one_or_none()
    if not verification:
        verification = Verification(
            patch_id=patch.id,
            binary_size_delta_bytes=prof_res.flash_delta_bytes,
            final_status="INCONCLUSIVE",
        )
        db.add(verification)
    else:
        verification.binary_size_delta_bytes = prof_res.flash_delta_bytes

    # Promotion check according to AGENTS.md Rule 6:
    # 1. Compiler exit == 0
    # 2. ASan exit == 0
    # 3. Test suite passed == True
    # 4. Resource delta safe == True
    compiler_ok = (verification.post_patch_compiler_exit == 0)
    asan_ok = (verification.asan_exit_code == 0)
    tests_ok = (verification.test_suite_passed is True)
    resource_ok = prof_res.is_resource_safe

    if compiler_ok and asan_ok and tests_ok and resource_ok:
        verification.final_status = "VERIFIED"
        patch.status = "VERIFIED"
        vuln.status = "verified"
    elif not compiler_ok or not asan_ok or not tests_ok or not resource_ok:
        verification.final_status = "REJECTED"
        patch.status = "REJECTED"

    await db.commit()
    await db.refresh(verification)

    return ApiResponse(
        success=prof_res.is_resource_safe,
        message=prof_res.summary,
        data=ResourceProfileResponse(
            patch_id=prof_res.patch_id,
            pre_patch_metrics=SectionMetricsResponse(
                text_bytes=prof_res.pre_patch_metrics.text_bytes,
                data_bytes=prof_res.pre_patch_metrics.data_bytes,
                bss_bytes=prof_res.pre_patch_metrics.bss_bytes,
                total_flash_bytes=prof_res.pre_patch_metrics.total_flash_bytes,
                total_ram_bytes=prof_res.pre_patch_metrics.total_ram_bytes,
            ),
            post_patch_metrics=SectionMetricsResponse(
                text_bytes=prof_res.post_patch_metrics.text_bytes,
                data_bytes=prof_res.post_patch_metrics.data_bytes,
                bss_bytes=prof_res.post_patch_metrics.bss_bytes,
                total_flash_bytes=prof_res.post_patch_metrics.total_flash_bytes,
                total_ram_bytes=prof_res.post_patch_metrics.total_ram_bytes,
            ),
            flash_delta_bytes=prof_res.flash_delta_bytes,
            ram_delta_bytes=prof_res.ram_delta_bytes,
            flash_delta_percentage=prof_res.flash_delta_percentage,
            ram_delta_percentage=prof_res.ram_delta_percentage,
            is_resource_safe=prof_res.is_resource_safe,
            verdict=prof_res.verdict,
            summary=prof_res.summary,
            promoted_final_status=verification.final_status,
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

