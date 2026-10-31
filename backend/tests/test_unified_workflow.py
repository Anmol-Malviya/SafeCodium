"""
Safe Vibe AI — Comprehensive End-to-End Workflow Integration Test.
Validates the complete autonomous lifecycle end-to-end:
1. Ingestion of C firmware
2. Static AST Scanning & Vulnerability Classification
3. IoT Context Extraction
4. AI Root-Cause Reasoning
5. Defensive Patch Synthesis
6. Monaco Patch Review & Dry-Run
7. Dual Toolchain Compilation
8. Runtime Sanitizers Verification
9. 4-Tier Regression Test Matrix
10. Hardware Resource Profiling (RAM & Flash)
11. Cryptographic Security Assurance Passport Generation
"""

from pathlib import Path
import pytest
from httpx import ASGITransport, AsyncClient

from backend.app.main import app
from backend.app.db.session import init_db


@pytest.mark.asyncio
async def test_full_project_vulnerability_lifecycle():
    await init_db()
    fixture_path = Path("fixtures/iot_firmware/sample_smart_meter.c")
    assert fixture_path.exists(), "sample_smart_meter.c fixture must exist"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Step 1: Ingest firmware project
        upload_res = await client.post(
            "/api/v1/projects/upload",
            files={"file": ("sample_smart_meter.c", fixture_path.read_bytes(), "text/x-c")},
            data={"name": "Lifecycle Integration Project"},
        )
        assert upload_res.status_code == 201
        proj_data = upload_res.json()["data"]
        project_id = proj_data["id"]
        assert project_id is not None
        assert proj_data["file_count"] == 1

        # Step 2: Run AST Scanner
        scan_res = await client.post(
            "/api/v1/scans/run",
            json={"project_id": project_id, "scanner_type": "ast_scanner"},
        )
        assert scan_res.status_code == 201
        scan_data = scan_res.json()["data"]
        findings = scan_data["vulnerabilities"]
        assert len(findings) >= 2

        cwe120_finding = next((f for f in findings if f["cwe_id"] == "CWE-120"), None)
        assert cwe120_finding is not None
        vuln_id = cwe120_finding["id"]

        # Step 3: Extract IoT Context
        ctx_res = await client.get(f"/api/v1/iot-context/vulnerability/{vuln_id}")
        assert ctx_res.status_code == 200
        ctx_data = ctx_res.json()["data"]
        assert ctx_data["target_architecture"] != ""

        # Step 4: AI Root Cause Reasoning
        reason_res = await client.post(f"/api/v1/reasoning/analyze/{vuln_id}")
        assert reason_res.status_code == 200
        reason_data = reason_res.json()["data"]
        assert reason_data["root_cause_analysis"] != ""
        assert len(reason_data["defensive_guidelines"]) > 0

        # Step 5: Synthesize Defensive Patch
        patch_res = await client.post(
            "/api/v1/patches/generate",
            json={"vulnerability_id": vuln_id, "provider": "gemini"},
        )
        assert patch_res.status_code == 201
        patch_data = patch_res.json()["data"]["patch"]
        patch_id = patch_data["id"]
        assert "---" in patch_data["unified_diff"]
        assert "+++" in patch_data["unified_diff"]

        # Step 6: Review and Apply Patch to Shadow Workspace
        apply_res = await client.post(
            f"/api/v1/patches/{patch_id}/apply",
            json={"patch_id": patch_id, "dry_run": False},
        )
        assert apply_res.status_code == 200
        apply_data = apply_res.json()["data"]
        assert apply_data["success"] is True

        # Step 7: Dual Compilation Verification
        comp_res = await client.post(f"/api/v1/verification/compile/{patch_id}")
        assert comp_res.status_code == 200
        comp_data = comp_res.json()["data"]
        assert comp_data["compilation_passed"] is True

        # Step 8: Runtime Sanitizer Evaluation
        san_res = await client.post(f"/api/v1/verification/sanitizers/{patch_id}")
        assert san_res.status_code == 200
        san_data = san_res.json()["data"]
        assert san_data["verification_passed"] is True

        # Step 9: 4-Tier Regression Matrix
        reg_res = await client.post(f"/api/v1/verification/regression/{patch_id}")
        assert reg_res.status_code == 200
        reg_data = reg_res.json()["data"]
        assert reg_data["suite_passed"] is True

        # Step 10: Hardware Resource Profiling & Final Status Promotion
        prof_res = await client.post(f"/api/v1/verification/resource/{patch_id}")
        assert prof_res.status_code == 200
        prof_data = prof_res.json()["data"]
        assert prof_data["is_resource_safe"] is True

        # Step 11: Cryptographic Verification Passport Generation
        pass_res = await client.get(f"/api/v1/reports/passport/{patch_id}")
        assert pass_res.status_code == 200
        pass_data = pass_res.json()["data"]
        assert pass_data["final_status"] == "VERIFIED"
        assert pass_data["passport_id"].startswith("PASSPORT-")
        assert len(pass_data["cryptographic_hashes"]["passport_signature_sha256"]) == 64
