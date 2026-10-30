import uuid
from pathlib import Path
import pytest
from httpx import ASGITransport, AsyncClient

from backend.app.main import app
from backend.app.models.project import Patch, Project, Verification, Vulnerability
from backend.app.services.verification.compiler_harness import DualCompilerHarness


SAMPLE_VALID_C = """#include <stdio.h>
#include <string.h>

void safe_function(const char *in) {
    char buf[32];
    if (in != NULL) {
        snprintf(buf, sizeof(buf), "%s", in);
    }
}
"""

SAMPLE_UNSAFE_C = """#include <stdio.h>
#include <string.h>

void unsafe_function(const char *in) {
    char buf[32];
    strcpy(buf, in);
}
"""

SAMPLE_BROKEN_SYNTAX_C = """#include <stdio.h>

void broken_syntax(void) {
    printf("Unclosed brace";
"""


def test_compiler_harness_single_file_clean(tmp_path):
    c_file = tmp_path / "valid.c"
    c_file.write_text(SAMPLE_VALID_C, encoding="utf-8")

    res = DualCompilerHarness.compile_file(str(c_file))
    assert res.success is True
    assert res.exit_code == 0
    assert res.errors_count == 0


def test_compiler_harness_detects_unsafe_and_syntax_error(tmp_path):
    unsafe_file = tmp_path / "unsafe.c"
    unsafe_file.write_text(SAMPLE_UNSAFE_C, encoding="utf-8")
    res_unsafe = DualCompilerHarness.compile_file(str(unsafe_file))
    # Warns on deprecated strcpy
    assert res_unsafe.warnings_count >= 1

    broken_file = tmp_path / "broken.c"
    broken_file.write_text(SAMPLE_BROKEN_SYNTAX_C, encoding="utf-8")
    res_broken = DualCompilerHarness.compile_file(str(broken_file))
    assert res_broken.success is False
    assert res_broken.exit_code == 1
    assert res_broken.errors_count >= 1


@pytest.mark.asyncio
async def test_api_dual_compilation_endpoint(tmp_path):
    from backend.app.db.session import AsyncSessionLocal, init_db
    await init_db()

    orig_dir = tmp_path / "original"
    orig_dir.mkdir()
    shadow_dir = tmp_path / "shadow"
    shadow_dir.mkdir()

    orig_file = orig_dir / "meter.c"
    orig_file.write_text(SAMPLE_UNSAFE_C, encoding="utf-8")

    shadow_file = shadow_dir / "meter.c"
    shadow_file.write_text(SAMPLE_VALID_C, encoding="utf-8")

    proj_id = f"test-comp-proj-{uuid.uuid4().hex[:8]}"
    project = Project(
        id=proj_id,
        name="Compilation Test Project",
        original_path=str(orig_dir),
        shadow_path=str(shadow_dir),
    )
    vuln_id = f"vuln-comp-{uuid.uuid4().hex[:8]}"
    vuln = Vulnerability(
        id=vuln_id,
        project_id=proj_id,
        cwe_id="CWE-120",
        title="Unbounded Copy",
        severity="CRITICAL",
        file_path="meter.c",
        line_start=6,
        line_end=6,
        vulnerable_code="strcpy(buf, in);",
        scanner_source="semgrep",
    )
    patch_id = f"patch-comp-{uuid.uuid4().hex[:8]}"
    patch = Patch(
        id=patch_id,
        vulnerability_id=vuln_id,
        ai_provider="gemini",
        model_name="gemini-2.5-flash",
        unified_diff="--- a/meter.c\n+++ b/meter.c",
        root_cause_explanation="Fixed bounds",
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
        resp = await client.post(f"/api/v1/verification/compile/{patch_id}")
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["compilation_passed"] is True
        assert data["post_patch"]["exit_code"] == 0
        assert data["pre_patch"]["warnings_count"] >= 1
        assert data["post_patch"]["warnings_count"] == 0

        # Check status endpoint
        stat_resp = await client.get(f"/api/v1/verification/status/{patch_id}")
        assert stat_resp.status_code == 200
        stat_data = stat_resp.json()["data"]
        assert stat_data["post_patch_compiler_exit"] == 0

