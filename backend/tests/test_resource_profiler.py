import uuid
from pathlib import Path
import pytest
from httpx import ASGITransport, AsyncClient

from backend.app.main import app
from backend.app.models.project import Patch, Project, Verification, Vulnerability
from backend.app.services.verification.resource_profiler import ResourceProfiler


SAMPLE_SOURCE_A = """#include <stdio.h>
#include <string.h>

void func_a(const char *s) {
    char buf[32];
    strcpy(buf, s);
}
"""

SAMPLE_SOURCE_B = """#include <stdio.h>
#include <string.h>

void func_a(const char *s) {
    char buf[32];
    if (s != NULL) {
        snprintf(buf, sizeof(buf), "%s", s);
    }
}
"""


def test_resource_profiler_direct(tmp_path):
    orig_file = tmp_path / "orig.c"
    orig_file.write_text(SAMPLE_SOURCE_A, encoding="utf-8")

    shadow_file = tmp_path / "shadow.c"
    shadow_file.write_text(SAMPLE_SOURCE_B, encoding="utf-8")

    result = ResourceProfiler.compare_resource_profile(
        patch_id="patch-res-test",
        original_source_path=str(orig_file),
        shadow_source_path=str(shadow_file),
    )

    assert result.is_resource_safe is True
    assert result.verdict == "VERIFIED"
    assert result.flash_delta_bytes > 0
    assert result.flash_delta_bytes <= 256
    assert result.ram_delta_bytes == 0  # Same stack allocation


@pytest.mark.asyncio
async def test_api_resource_endpoint_and_verification_promotion(tmp_path):
    from backend.app.db.session import AsyncSessionLocal, init_db
    await init_db()

    orig_dir = tmp_path / "original"
    orig_dir.mkdir()
    shadow_dir = tmp_path / "shadow"
    shadow_dir.mkdir()

    orig_file = orig_dir / "firmware.c"
    orig_file.write_text(SAMPLE_SOURCE_A, encoding="utf-8")

    shadow_file = shadow_dir / "firmware.c"
    shadow_file.write_text(SAMPLE_SOURCE_B, encoding="utf-8")

    proj_id = f"test-prof-proj-{uuid.uuid4().hex[:8]}"
    project = Project(
        id=proj_id,
        name="Profile Test Project",
        original_path=str(orig_dir),
        shadow_path=str(shadow_dir),
    )
    vuln_id = f"vuln-prof-{uuid.uuid4().hex[:8]}"
    vuln = Vulnerability(
        id=vuln_id,
        project_id=proj_id,
        cwe_id="CWE-120",
        title="Unbounded Copy",
        severity="CRITICAL",
        file_path="firmware.c",
        line_start=6,
        line_end=6,
        vulnerable_code="strcpy(buf, s);",
        scanner_source="semgrep",
    )
    patch_id = f"patch-prof-{uuid.uuid4().hex[:8]}"
    patch = Patch(
        id=patch_id,
        vulnerability_id=vuln_id,
        ai_provider="gemini",
        model_name="gemini-2.5-flash",
        unified_diff="--- a/firmware.c\n+++ b/firmware.c",
        root_cause_explanation="Bounded snprintf",
        repair_strategy="snprintf",
        status="APPLIED",
    )
    # Verification with pre-requisite stages passing
    verification = Verification(
        patch_id=patch_id,
        pre_patch_compiler_exit=0,
        post_patch_compiler_exit=0,
        asan_exit_code=0,
        ubsan_exit_code=0,
        test_suite_passed=True,
        final_status="INCONCLUSIVE",
    )

    async with AsyncSessionLocal() as session:
        session.add(project)
        session.add(vuln)
        session.add(patch)
        session.add(verification)
        await session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post(f"/api/v1/verification/resource/{patch_id}")
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["is_resource_safe"] is True
        assert data["verdict"] == "VERIFIED"
        assert data["promoted_final_status"] == "VERIFIED"

        # Check DB verification updated to VERIFIED
        stat_resp = await client.get(f"/api/v1/verification/status/{patch_id}")
        assert stat_resp.status_code == 200
        stat_data = stat_resp.json()["data"]
        assert stat_data["final_status"] == "VERIFIED"
        assert stat_data["binary_size_delta_bytes"] > 0

