import uuid
from pathlib import Path
import pytest
from httpx import ASGITransport, AsyncClient

from backend.app.main import app
from backend.app.models.project import Patch, Project, Verification, Vulnerability
from backend.app.services.verification.regression_harness import RegressionTestHarness


SAMPLE_VULNERABLE_SOURCE = """#include <stdio.h>
#include <string.h>

void parse_telemetry_packet(const char *raw_stream) {
    char meter_serial[32];
    strcpy(meter_serial, raw_stream);
}

void validate_sensor_reading(int *reading) {
    int val = *reading;
}
"""

SAMPLE_REPAIRED_SOURCE = """#include <stdio.h>
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


def test_regression_suite_direct(tmp_path):
    orig_file = tmp_path / "orig.c"
    orig_file.write_text(SAMPLE_VULNERABLE_SOURCE, encoding="utf-8")

    shadow_file = tmp_path / "shadow.c"
    shadow_file.write_text(SAMPLE_REPAIRED_SOURCE, encoding="utf-8")

    result = RegressionTestHarness.run_regression_suite(
        patch_id="patch-reg-test",
        cwe_id="CWE-120",
        original_source_path=str(orig_file),
        shadow_source_path=str(shadow_file),
    )

    assert result.total_cases == 4
    assert result.passed_cases == 4
    assert result.suite_passed is True
    assert result.status == "VERIFIED"

    # Verify benign input passes for both
    tc1 = result.cases[0]
    assert tc1.pre_patch_passed is True
    assert tc1.post_patch_passed is True

    # Verify exploit input failed for pre-patch, but handled safely for post-patch
    tc3 = result.cases[2]
    assert tc3.pre_patch_passed is False
    assert tc3.post_patch_passed is True
    assert tc3.vulnerability_neutralized is True


@pytest.mark.asyncio
async def test_api_regression_endpoint(tmp_path):
    from backend.app.db.session import AsyncSessionLocal, init_db
    await init_db()

    orig_dir = tmp_path / "original"
    orig_dir.mkdir()
    shadow_dir = tmp_path / "shadow"
    shadow_dir.mkdir()

    orig_file = orig_dir / "smart_meter.c"
    orig_file.write_text(SAMPLE_VULNERABLE_SOURCE, encoding="utf-8")

    shadow_file = shadow_dir / "smart_meter.c"
    shadow_file.write_text(SAMPLE_REPAIRED_SOURCE, encoding="utf-8")

    proj_id = f"test-reg-proj-{uuid.uuid4().hex[:8]}"
    project = Project(
        id=proj_id,
        name="Regression Test Project",
        original_path=str(orig_dir),
        shadow_path=str(shadow_dir),
    )
    vuln_id = f"vuln-reg-{uuid.uuid4().hex[:8]}"
    vuln = Vulnerability(
        id=vuln_id,
        project_id=proj_id,
        cwe_id="CWE-120",
        title="Unbounded Copy",
        severity="CRITICAL",
        file_path="smart_meter.c",
        line_start=6,
        line_end=6,
        vulnerable_code="strcpy(meter_serial, raw_stream);",
        scanner_source="semgrep",
    )
    patch_id = f"patch-reg-{uuid.uuid4().hex[:8]}"
    patch = Patch(
        id=patch_id,
        vulnerability_id=vuln_id,
        ai_provider="gemini",
        model_name="gemini-2.5-flash",
        unified_diff="--- a/smart_meter.c\n+++ b/smart_meter.c",
        root_cause_explanation="Safe bounds copy",
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
        resp = await client.post(f"/api/v1/verification/regression/{patch_id}")
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["suite_passed"] is True
        assert data["total_cases"] == 4
        assert data["passed_cases"] == 4
        assert data["status"] == "VERIFIED"

        # Check DB updated
        stat_resp = await client.get(f"/api/v1/verification/status/{patch_id}")
        assert stat_resp.status_code == 200
        stat_data = stat_resp.json()["data"]
        assert stat_data["test_suite_passed"] is True
