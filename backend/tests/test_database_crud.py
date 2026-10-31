"""SafeCodium — Automated Database CRUD and Isolation Tests."""

import uuid
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.auth import hash_password
from backend.app.db.session import AsyncSessionLocal
from backend.app.main import app
from backend.app.models.project import Project, Scan, Vulnerability, Patch, Verification
from backend.app.models.user import User


@pytest.mark.asyncio
async def test_user_registration_login_profile_flow():
    """Verify end-to-end user registration, authentication, and profile retrieval."""
    unique_user = f"user_{uuid.uuid4().hex[:8]}"
    password = "SecurePassword123!"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Register
        reg_resp = await client.post(
            "/api/v1/auth/register",
            json={"username": unique_user, "password": password, "role": "analyst"},
        )
        assert reg_resp.status_code == 201
        user_data = reg_resp.json()["data"]
        assert user_data["username"] == unique_user

        # Login
        login_resp = await client.post(
            "/api/v1/auth/login",
            json={"username": unique_user, "password": password},
        )
        assert login_resp.status_code == 200
        token = login_resp.json()["data"]["access_token"]
        assert token is not None

        # Profile /me
        profile_resp = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert profile_resp.status_code == 200
        profile = profile_resp.json()["data"]
        assert profile["username"] == unique_user


@pytest.mark.asyncio
async def test_project_crud_and_relationships():
    """Verify relational persistence of project, scan, vulnerability, patch, and verification."""
    async with AsyncSessionLocal() as session:
        # 1. Create project
        proj = Project(
            name="Test Device Firmware",
            description="Integration test firmware",
            framework_type="esp_idf",
            source_type="snippet",
            original_path="/tmp/test/firmware",
            shadow_path="/tmp/test/shadow",
            file_count=5,
        )
        session.add(proj)
        await session.flush()
        project_id = proj.id

        # 2. Create scan
        scan = Scan(
            project_id=project_id,
            scanner_type="composite",
            status="completed",
            findings_count=1,
            raw_output="test output",
        )
        session.add(scan)
        await session.flush()
        scan_id = scan.id

        # 3. Create vulnerability
        vuln = Vulnerability(
            project_id=project_id,
            scan_id=scan_id,
            cwe_id="CWE-120",
            title="Buffer Copy without Checking Size of Input",
            severity="HIGH",
            file_path="main.c",
            line_start=42,
            line_end=42,
            vulnerable_code="strcpy(dest, src);",
            scanner_source="semgrep",
            status="detected",
        )
        session.add(vuln)
        await session.flush()
        vuln_id = vuln.id

        # 4. Create patch
        patch = Patch(
            vulnerability_id=vuln_id,
            ai_provider="gemini",
            model_name="gemini-2.5-flash",
            unified_diff="--- a/main.c\n+++ b/main.c\n- strcpy(dest, src);\n+ strncpy(dest, src, sizeof(dest)-1);",
            root_cause_explanation="Unbounded string copy",
            repair_strategy="Bounded copy replacement",
            status="proposed",
        )
        session.add(patch)
        await session.flush()
        patch_id = patch.id

        # 5. Create verification
        verif = Verification(
            patch_id=patch_id,
            pre_patch_compiler_exit=0,
            post_patch_compiler_exit=0,
            asan_exit_code=0,
            ubsan_exit_code=0,
            test_suite_passed=True,
            binary_size_delta_bytes=12,
            final_status="VERIFIED",
        )
        session.add(verif)
        await session.commit()

    # Query back using separate session to confirm persistence
    async with AsyncSessionLocal() as session:
        fetched_proj = await session.get(Project, project_id)
        assert fetched_proj is not None
        assert fetched_proj.name == "Test Device Firmware"

        # Relational query
        stmt = select(Vulnerability).where(Vulnerability.project_id == project_id)
        result = await session.execute(stmt)
        persisted_vulns = result.scalars().all()
        assert len(persisted_vulns) == 1
        assert persisted_vulns[0].cwe_id == "CWE-120"

        # Patch query
        patch_stmt = select(Patch).where(Patch.vulnerability_id == vuln_id)
        p_result = await session.execute(patch_stmt)
        persisted_patch = p_result.scalar_one_or_none()
        assert persisted_patch is not None
        assert persisted_patch.repair_strategy == "Bounded copy replacement"

        # Verification query
        v_stmt = select(Verification).where(Verification.patch_id == patch_id)
        v_result = await session.execute(v_stmt)
        persisted_verif = v_result.scalar_one_or_none()
        assert persisted_verif is not None
        assert persisted_verif.final_status == "VERIFIED"


@pytest.mark.asyncio
async def test_cross_user_isolation_protection():
    """Verify that projects owned by User A cannot be accessed or deleted by User B without privileges."""
    user_a_name = f"user_a_{uuid.uuid4().hex[:6]}"
    user_b_name = f"user_b_{uuid.uuid4().hex[:6]}"
    password = "StrongPassword2026!"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Register User A
        reg_a = await client.post("/api/v1/auth/register", json={"username": user_a_name, "password": password})
        token_a = (await client.post("/api/v1/auth/login", json={"username": user_a_name, "password": password})).json()["data"]["access_token"]
        user_a_id = reg_a.json()["data"]["id"]

        # Register User B
        reg_b = await client.post("/api/v1/auth/register", json={"username": user_b_name, "password": password})
        token_b = (await client.post("/api/v1/auth/login", json={"username": user_b_name, "password": password})).json()["data"]["access_token"]

        # Create project directly for User A
        async with AsyncSessionLocal() as session:
            proj = Project(
                name="Confidential A Project",
                framework_type="generic_c",
                source_type="snippet",
                original_path="/tmp/a",
                owner_id=user_a_id,
            )
            session.add(proj)
            await session.commit()
            project_id = proj.id

        # User B attempts to delete project belonging to User A
        del_resp = await client.delete(
            f"/api/v1/projects/{project_id}",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        # Should be forbidden (403)
        assert del_resp.status_code == 403
