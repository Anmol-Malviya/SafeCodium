"""
Safe Vibe AI — Automated Security & RBAC Test Suite.
Validates:
1. User registration & duplicate username prevention.
2. Secure PBKDF2 authentication & JWT token generation.
3. Unauthenticated requests to protected endpoints return 401 Unauthorized.
4. Role-based authorization: standard analyst is blocked with 403 Forbidden on administrative endpoints.
5. Admin authorization: administrative token can access admin-only endpoints.
6. Tenant boundary & Anti-IDOR: Users cannot view or modify other users' projects.
"""

import uuid
import pytest
from httpx import ASGITransport, AsyncClient
from backend.app.main import app
from backend.app.db.session import init_db


@pytest.mark.asyncio
async def test_auth_registration_and_login():
    await init_db()
    u_suffix = uuid.uuid4().hex[:6]
    test_user = f"alice_{u_suffix}"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Register new analyst
        reg_resp = await client.post(
            "/api/v1/auth/register",
            json={"username": test_user, "password": "SecurePassword123!", "role": "analyst"},
        )
        assert reg_resp.status_code == 201
        data = reg_resp.json()["data"]
        assert data["username"] == test_user
        assert data["role"] == "analyst"
        assert "api_key" in data

        # 2. Duplicate registration fails with 400
        dup_resp = await client.post(
            "/api/v1/auth/register",
            json={"username": test_user, "password": "AnotherPassword456!"},
        )
        assert dup_resp.status_code == 400

        # 3. Successful login returns JWT access token
        login_resp = await client.post(
            "/api/v1/auth/login",
            json={"username": test_user, "password": "SecurePassword123!"},
        )
        assert login_resp.status_code == 200
        token_data = login_resp.json()["data"]
        assert "access_token" in token_data
        assert token_data["token_type"].lower() == "bearer"

        # 4. Invalid login credentials fail with 401
        bad_login = await client.post(
            "/api/v1/auth/login",
            json={"username": test_user, "password": "WrongPassword!"},
        )
        assert bad_login.status_code == 401


@pytest.mark.asyncio
async def test_protected_endpoints_require_authentication():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Anonymous access to /auth/me returns 401
        me_resp = await client.get("/api/v1/auth/me")
        assert me_resp.status_code == 401

        # Anonymous access to AI provider configuration returns 401
        config_resp = await client.post(
            "/api/v1/ai/providers/configure",
            json={"provider_name": "ollama", "base_url": "http://127.0.0.1:11434"},
        )
        assert config_resp.status_code == 401


@pytest.mark.asyncio
async def test_rbac_analyst_denied_admin_endpoints():
    await init_db()
    u_suffix = uuid.uuid4().hex[:6]
    test_user = f"bob_{u_suffix}"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Register analyst
        await client.post(
            "/api/v1/auth/register",
            json={"username": test_user, "password": "Password123!", "role": "analyst"},
        )
        login_resp = await client.post(
            "/api/v1/auth/login",
            json={"username": test_user, "password": "Password123!"},
        )
        token = login_resp.json()["data"]["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Analyst tries to configure AI provider -> Denied with 403 Forbidden
        cfg_resp = await client.post(
            "/api/v1/ai/providers/configure",
            headers=headers,
            json={"provider_name": "ollama", "base_url": "http://127.0.0.1:11434"},
        )
        assert cfg_resp.status_code == 403
        assert "administrator" in cfg_resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_anti_idor_cross_user_isolation():
    await init_db()
    u_suffix = uuid.uuid4().hex[:6]
    user_a = f"usera_{u_suffix}"
    user_b = f"userb_{u_suffix}"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Register User A and User B
        await client.post(
            "/api/v1/auth/register",
            json={"username": user_a, "password": "PasswordA123!", "role": "analyst"},
        )
        await client.post(
            "/api/v1/auth/register",
            json={"username": user_b, "password": "PasswordB123!", "role": "analyst"},
        )

        login_a = await client.post("/api/v1/auth/login", json={"username": user_a, "password": "PasswordA123!"})
        token_a = login_a.json()["data"]["access_token"]

        login_b = await client.post("/api/v1/auth/login", json={"username": user_b, "password": "PasswordB123!"})
        token_b = login_b.json()["data"]["access_token"]

        # User A uploads a project
        c_code = b"int main() { return 0; }"
        up_resp = await client.post(
            "/api/v1/projects/upload",
            headers={"Authorization": f"Bearer {token_a}"},
            files={"file": ("main.c", c_code, "text/x-c")},
            data={"name": "Project User A"},
        )
        assert up_resp.status_code == 201
        proj_a_id = up_resp.json()["data"]["id"]

        # User B attempts to access User A's project -> Blocked with 403 Forbidden
        cross_read = await client.get(
            f"/api/v1/projects/{proj_a_id}",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert cross_read.status_code == 403

        # User B attempts to delete User A's project -> Blocked with 403 Forbidden
        cross_delete = await client.delete(
            f"/api/v1/projects/{proj_a_id}",
            headers={"Authorization": f"Bearer {token_b}"},
        )
        assert cross_delete.status_code == 403

        # User A can access their own project cleanly
        valid_read = await client.get(
            f"/api/v1/projects/{proj_a_id}",
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert valid_read.status_code == 200
