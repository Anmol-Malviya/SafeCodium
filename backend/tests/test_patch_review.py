import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.main import app
from backend.app.models.project import Patch, Project, Vulnerability
from backend.app.services.patching.review_engine import PatchReviewEngine


SAMPLE_C_CODE = """#include <stdio.h>
#include <string.h>

void process_input(const char *data) {
    char local_buf[64];
    strcpy(local_buf, data);
    printf("Read: %s\\n", local_buf);
}
"""

SAMPLE_DIFF = """--- a/input.c
+++ b/input.c
@@ -5,3 +5,4 @@
-    strcpy(local_buf, data);
+    if (data != NULL) {
+        snprintf(local_buf, sizeof(local_buf), "%s", data);
+    }
"""


def test_unified_diff_parsing_and_string_application():
    hunks = PatchReviewEngine.parse_unified_diff(SAMPLE_DIFF)
    assert len(hunks) >= 1
    assert hunks[0]["old_start"] == 5

    success, patched, diags = PatchReviewEngine.apply_diff_to_string(SAMPLE_C_CODE, SAMPLE_DIFF)
    assert success is True
    assert "snprintf" in patched
    assert "sizeof(local_buf)" in patched


def test_independent_patch_critique():
    critique = PatchReviewEngine.critique_patch(
        patch_id="critique-test-1",
        cwe_id="CWE-120",
        original_code=SAMPLE_C_CODE,
        patched_code="void process_input() { snprintf(buf, sizeof(buf), \"%s\", s); }",
        diff_text=SAMPLE_DIFF,
    )
    assert critique.critique_score >= 0.8
    assert critique.summary_verdict == "APPROVED"
    assert critique.bounds_safety is True
    assert critique.zero_heap_allocation is True


@pytest.mark.asyncio
async def test_api_patch_critique_and_apply(tmp_path):
    from backend.app.db.session import AsyncSessionLocal, init_db
    await init_db()

    # Setup test workspace
    shadow_dir = tmp_path / "shadow"
    shadow_dir.mkdir()
    c_file = shadow_dir / "input.c"
    c_file.write_text(SAMPLE_C_CODE, encoding="utf-8")

    proj_id = f"test-review-proj-{uuid.uuid4().hex[:8]}"
    project = Project(
        id=proj_id,
        name="Review Test Project",
        original_path=str(tmp_path / "original"),
        shadow_path=str(shadow_dir),
    )
    vuln_id = f"vuln-review-{uuid.uuid4().hex[:8]}"
    vuln = Vulnerability(
        id=vuln_id,
        project_id=proj_id,
        cwe_id="CWE-120",
        title="Buffer Overflow",
        severity="CRITICAL",
        file_path="input.c",
        line_start=6,
        line_end=6,
        vulnerable_code="strcpy(local_buf, data);",
        scanner_source="semgrep",
    )
    patch_id = f"patch-review-{uuid.uuid4().hex[:8]}"
    patch = Patch(
        id=patch_id,
        vulnerability_id=vuln_id,
        ai_provider="gemini",
        model_name="gemini-2.5-flash",
        unified_diff=SAMPLE_DIFF,
        root_cause_explanation="Unbounded copy",
        repair_strategy="Bounded copy",
        status="GENERATED",
    )
    async with AsyncSessionLocal() as session:
        session.add(project)
        session.add(vuln)
        session.add(patch)
        await session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Test Critique
        crit_resp = await client.post(f"/api/v1/patches/{patch_id}/critique")
        assert crit_resp.status_code == 200
        crit_data = crit_resp.json()["data"]
        assert crit_data["critique_passed"] is True
        assert crit_data["summary_verdict"] == "APPROVED"

        # Test Dry Run Apply
        dry_resp = await client.post(f"/api/v1/patches/{patch_id}/apply", json={"patch_id": patch_id, "dry_run": True})
        assert dry_resp.status_code == 200
        dry_data = dry_resp.json()["data"]
        assert dry_data["success"] is True
        assert dry_data["is_dry_run"] is True

        # Check file was NOT modified in dry run
        assert "strcpy" in c_file.read_text(encoding="utf-8")

        # Test Real Apply
        real_resp = await client.post(f"/api/v1/patches/{patch_id}/apply", json={"patch_id": patch_id, "dry_run": False})
        assert real_resp.status_code == 200
        real_data = real_resp.json()["data"]
        assert real_data["success"] is True
        assert real_data["status"] == "APPLIED"

        # Check shadow file was modified
        assert "snprintf" in c_file.read_text(encoding="utf-8")
