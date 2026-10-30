import uuid
from pathlib import Path
import pytest
from httpx import ASGITransport, AsyncClient

from backend.app.main import app
from backend.app.models.project import Patch, Project, Verification, Vulnerability
from backend.app.services.verification.sanitizer_harness import SanitizerVerificationHarness


SAMPLE_VULNERABLE_C = """#include <stdio.h>
#include <string.h>

void parse_telemetry_packet(const char *raw_stream) {
    char meter_serial[32];
    strcpy(meter_serial, raw_stream);
}

void validate_sensor_reading(int *reading) {
    int val = *reading;
}
"""

SAMPLE_REPAIRED_C = """#include <stdio.h>
#include <string.h>

void parse_telemetry_packet(const char *raw_stream) {
    char meter_serial[32];
    if (raw_stream != NULL) {
        snprintf(meter_serial, sizeof(meter_serial), "%s", raw_stream);
    }
}

void validate_sensor_reading(int *reading) {
    if (reading == NULL) return;
    int val = *reading;
}
"""


def test_sanitizer_harness_detects_asan_buffer_overflow(tmp_path):
    vuln_file = tmp_path / "vuln.c"
    vuln_file.write_text(SAMPLE_VULNERABLE_C, encoding="utf-8")

    res = SanitizerVerificationHarness.run_asan_pass(str(vuln_file))
    assert res.crash_detected is True
    assert res.passed is False
    assert "stack-buffer-overflow" in res.crash_type
    assert "AddressSanitizer" in res.report_output


def test_sanitizer_harness_verifies_repaired_source(tmp_path):
    repaired_file = tmp_path / "repaired.c"
    repaired_file.write_text(SAMPLE_REPAIRED_C, encoding="utf-8")

    res_asan = SanitizerVerificationHarness.run_asan_pass(str(repaired_file))
    assert res_asan.crash_detected is False
    assert res_asan.passed is True
    assert res_asan.exit_code == 0

    res_ubsan = SanitizerVerificationHarness.run_ubsan_pass(str(repaired_file))
    assert res_ubsan.crash_detected is False
    assert res_ubsan.passed is True
    assert res_ubsan.exit_code == 0


@pytest.mark.asyncio
async def test_api_sanitizer_verification_endpoint(tmp_path):
    from backend.app.db.session import AsyncSessionLocal, init_db
    await init_db()

    orig_dir = tmp_path / "original"
    orig_dir.mkdir()
    shadow_dir = tmp_path / "shadow"
    shadow_dir.mkdir()

    orig_file = orig_dir / "firmware.c"
    orig_file.write_text(SAMPLE_VULNERABLE_C, encoding="utf-8")

    shadow_file = shadow_dir / "firmware.c"
    shadow_file.write_text(SAMPLE_REPAIRED_C, encoding="utf-8")

    proj_id = f"test-san-proj-{uuid.uuid4().hex[:8]}"
    project = Project(
        id=proj_id,
        name="Sanitizer Test Project",
        original_path=str(orig_dir),
        shadow_path=str(shadow_dir),
    )
    vuln_id = f"vuln-san-{uuid.uuid4().hex[:8]}"
    vuln = Vulnerability(
        id=vuln_id,
        project_id=proj_id,
        cwe_id="CWE-120",
        title="Unbounded Copy",
        severity="CRITICAL",
        file_path="firmware.c",
        line_start=6,
        line_end=6,
        vulnerable_code="strcpy(meter_serial, raw_stream);",
        scanner_source="semgrep",
    )
    patch_id = f"patch-san-{uuid.uuid4().hex[:8]}"
    patch = Patch(
        id=patch_id,
        vulnerability_id=vuln_id,
        ai_provider="gemini",
        model_name="gemini-2.5-flash",
        unified_diff="--- a/firmware.c\n+++ b/firmware.c",
        root_cause_explanation="Fixed buffer copy",
        repair_strategy="snprintf",
        status="APPLIED",
    )

    async with AsyncSessionLocal() as session:
        session.add(project)
        session.add(vuln)
        session.add(patch)
        await session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(f"/api/v1/verification/sanitizers/{patch_id}")
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["verification_passed"] is True
        assert data["status"] == "VERIFIED"
        assert data["pre_patch_asan"]["crash_detected"] is True
        assert data["post_patch_asan"]["passed"] is True
        assert data["post_patch_asan"]["exit_code"] == 0

        # Verify DB record updated
        stat_resp = await client.get(f"/api/v1/verification/status/{patch_id}")
        assert stat_resp.status_code == 200
        stat_data = stat_resp.json()["data"]
        assert stat_data["asan_exit_code"] == 0

