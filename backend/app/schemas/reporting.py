"""Safe Vibe AI — Security Reporting Schemas."""

from typing import List, Optional
from pydantic import BaseModel


class CryptographicEvidenceHashesResponse(BaseModel):
    original_source_sha256: str
    repaired_source_sha256: str
    unified_diff_sha256: str
    sanitizer_output_sha256: str
    passport_signature_sha256: str


class VerificationPassportResponse(BaseModel):
    passport_id: str
    project_id: str
    project_name: str
    vulnerability_id: str
    cwe_id: str
    cwe_name: str
    patch_id: str
    ai_provider: str
    model_name: str
    pre_patch_cvss_score: float
    post_patch_cvss_score: float
    cvss_risk_reduction: float
    final_status: str
    verification_date: str
    compiler_exit_code: int
    asan_exit_code: int
    test_suite_passed: bool
    flash_delta_bytes: int
    cryptographic_hashes: CryptographicEvidenceHashesResponse
    defensive_idioms_applied: List[str]
    compliance_frameworks: List[str]
