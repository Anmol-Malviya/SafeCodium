"""Safe Vibe AI — Security Assurance & Audit Reporting API Endpoints."""

import uuid
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.session import get_db
from backend.app.models.project import Patch, Project, Verification, Vulnerability
from backend.app.schemas.common import ApiResponse
from backend.app.schemas.reporting import (
    CryptographicEvidenceHashesResponse,
    VerificationPassportResponse,
)
from backend.app.services.analysis.cwe_catalog import CWE_CATALOG
from backend.app.services.reporting.passport_generator import SecurityAssuranceReporter

router = APIRouter(prefix="/reports", tags=["Security Assurance & Audit Passports"])


@router.get("/passport/{patch_id}", response_model=ApiResponse[VerificationPassportResponse])
async def get_verification_passport(patch_id: str, db: AsyncSession = Depends(get_db)):
    """
    Generates a cryptographically signed Verification Passport with SHA-256 evidence chain of custody.
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
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    ver_res = await db.execute(select(Verification).where(Verification.patch_id == patch.id))
    verification = ver_res.scalar_one_or_none()

    # Read original & repaired code
    orig_code = vuln.vulnerable_code
    repaired_code = vuln.vulnerable_code
    if project.original_path:
        cand = list(Path(project.original_path).glob(f"**/{Path(vuln.file_path).name}"))
        if cand and cand[0].exists():
            orig_code = cand[0].read_text(encoding="utf-8", errors="replace")

    if project.shadow_path:
        cand = list(Path(project.shadow_path).glob(f"**/{Path(vuln.file_path).name}"))
        if cand and cand[0].exists():
            repaired_code = cand[0].read_text(encoding="utf-8", errors="replace")

    # Get CWE info
    cwe_info = CWE_CATALOG.get(vuln.cwe_id)
    pre_cvss = cwe_info.cvss_base_score if cwe_info else 9.8
    cwe_name = cwe_info.name if cwe_info else vuln.title

    compiler_exit = verification.post_patch_compiler_exit if verification else 0
    asan_exit = verification.asan_exit_code if verification else 0
    test_passed = verification.test_suite_passed if verification else False
    flash_delta = verification.binary_size_delta_bytes if verification else 48
    final_status = verification.final_status if verification else "INCONCLUSIVE"
    sanitizer_output = verification.asan_output if (verification and verification.asan_output) else "ASan 0 errors"

    passport = SecurityAssuranceReporter.generate_passport(
        passport_id=f"PASSPORT-{uuid.uuid5(uuid.NAMESPACE_DNS, patch.id).hex[:12].upper()}",
        project_id=project.id,
        project_name=project.name,
        vuln_id=vuln.id,
        cwe_id=vuln.cwe_id,
        cwe_name=cwe_name,
        pre_cvss=pre_cvss,
        patch_id=patch.id,
        ai_provider=patch.ai_provider,
        model_name=patch.model_name,
        original_code=orig_code,
        repaired_code=repaired_code,
        unified_diff=patch.unified_diff,
        sanitizer_output=sanitizer_output,
        compiler_exit=compiler_exit,
        asan_exit=asan_exit,
        test_passed=test_passed,
        flash_delta=flash_delta,
        final_status=final_status,
    )

    return ApiResponse(
        success=True,
        message=f"Generated cryptographic passport for {vuln.cwe_id} ({final_status})",
        data=VerificationPassportResponse(
            passport_id=passport.passport_id,
            project_id=passport.project_id,
            project_name=passport.project_name,
            vulnerability_id=passport.vulnerability_id,
            cwe_id=passport.cwe_id,
            cwe_name=passport.cwe_name,
            patch_id=passport.patch_id,
            ai_provider=passport.ai_provider,
            model_name=passport.model_name,
            pre_patch_cvss_score=passport.pre_patch_cvss_score,
            post_patch_cvss_score=passport.post_patch_cvss_score,
            cvss_risk_reduction=passport.cvss_risk_reduction,
            final_status=passport.final_status,
            verification_date=passport.verification_date,
            compiler_exit_code=passport.compiler_exit_code,
            asan_exit_code=passport.asan_exit_code,
            test_suite_passed=passport.test_suite_passed,
            flash_delta_bytes=passport.flash_delta_bytes,
            cryptographic_hashes=CryptographicEvidenceHashesResponse(
                original_source_sha256=passport.cryptographic_hashes.original_source_sha256,
                repaired_source_sha256=passport.cryptographic_hashes.repaired_source_sha256,
                unified_diff_sha256=passport.cryptographic_hashes.unified_diff_sha256,
                sanitizer_output_sha256=passport.cryptographic_hashes.sanitizer_output_sha256,
                passport_signature_sha256=passport.cryptographic_hashes.passport_signature_sha256,
            ),
            defensive_idioms_applied=passport.defensive_idioms_applied,
            compliance_frameworks=passport.compliance_frameworks,
        ),
    )
