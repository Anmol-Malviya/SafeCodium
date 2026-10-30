import uuid
from pathlib import Path
import pytest
from httpx import ASGITransport, AsyncClient

from backend.app.main import app
from backend.app.models.project import Patch, Project, Verification, Vulnerability
from backend.app.services.reporting.passport_generator import SecurityAssuranceReporter


def test_passport_generator_direct():
    passport = SecurityAssuranceReporter.generate_passport(
        passport_id="PASSPORT-TEST-001",
        project_id="proj-123",
        project_name="Smart Meter Test",
        vuln_id="vuln-456",
        cwe_id="CWE-120",
        cwe_name="Classic Buffer Overflow",
        pre_cvss=9.8,
        patch_id="patch-789",
        ai_provider="gemini",
        model_name="gemini-2.5-flash",
        original_code="strcpy(buf, s);",
        repaired_code="snprintf(buf, sizeof(buf), \"%s\", s);",
        unified_diff="--- a/firmware.c\n+++ b/firmware.c",
        sanitizer_output="Clean run. 0 errors.",
        compiler_exit=0,
        asan_exit=0,
        test_passed=True,
        flash_delta=48,
        final_status="VERIFIED",
    )

    assert passport.final_status == "VERIFIED"
    assert passport.pre_patch_cvss_score == 9.8
    assert passport.post_patch_cvss_score == 0.0
    assert passport.cvss_risk_reduction == 9.8
    assert len(passport.cryptographic_hashes.passport_signature_sha256) == 64
    assert len(passport.cryptographic_hashes.original_source_sha256) == 64


@pytest.mark.asyncio
async def test_api_verification_passport_endpoint(tmp_path):
    from backend.app.db.session import AsyncSessionLocal, init_db
    await init_db()

    orig_dir = tmp_path / "original"
    orig_dir.mkdir()
    shadow_dir = tmp_path / "shadow"
    shadow_dir.mkdir()

    orig_file = orig_dir / "firmware.c"
    orig_file.write_text("void f() { char buf[32]; strcpy(buf, s); }", encoding="utf-8")

    shadow_file = shadow_dir / "firmware.c"
    shadow_file.write_text("void f() { char buf[32]; snprintf(buf, sizeof(buf), \"%s\", s); }", encoding="utf-8")

    proj_id = f"test-pass-proj-{uuid.uuid4().hex[:8]}"
    project = Project(
        id=proj_id,
        name="Passport Verification Project",
        original_path=str(orig_dir),
        shadow_path=str(shadow_dir),
    )
    vuln_id = f"vuln-pass-{uuid.uuid4().hex[:8]}"
    vuln = Vulnerability(
        id=vuln_id,
        project_id=proj_id,
        cwe_id="CWE-120",
        title="Unbounded Copy via strcpy",
        severity="CRITICAL",
        file_path="firmware.c",
        line_start=6,
        line_end=6,
        vulnerable_code="strcpy(buf, s);",
        scanner_source="semgrep",
    )
    patch_id = f"patch-pass-{uuid.uuid4().hex[:8]}"
    patch = Patch(
        id=patch_id,
        vulnerability_id=vuln_id,
        ai_provider="gemini",
        model_name="gemini-2.5-flash",
        unified_diff="--- a/firmware.c\n+++ b/firmware.c",
        root_cause_explanation="Bounded snprintf",
        repair_strategy="snprintf",
        status="VERIFIED",
    )
    verification = Verification(
        patch_id=patch_id,
        pre_patch_compiler_exit=0,
        post_patch_compiler_exit=0,
        asan_exit_code=0,
        ubsan_exit_code=0,
        test_suite_passed=True,
        binary_size_delta_bytes=48,
        final_status="VERIFIED",
    )

    async with AsyncSessionLocal() as session:
        session.add(project)
        session.add(vuln)
        session.add(patch)
        session.add(verification)
        await session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(f"/api/v1/reports/passport/{patch_id}")
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["final_status"] == "VERIFIED"
        assert data["cwe_id"] == "CWE-120"
        assert data["cvss_risk_reduction"] == 9.8
        assert data["cryptographic_hashes"]["passport_signature_sha256"] is not None

