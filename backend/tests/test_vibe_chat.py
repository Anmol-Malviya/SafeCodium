"""SAFE-CODIUM — Tests for Vibe Coding Copilot Chat Router."""

import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app


@pytest.mark.asyncio
async def test_vibe_chat_message_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/vibe-chat/message",
            json={
                "project_id": "test-project-123",
                "file_path": "src/network_parser.c",
                "code_snippet": "char buf[64]; strcpy(buf, input);",
                "prompt": "Fix buffer overflow error in this file",
                "provider": "gemini",
            },
            headers={"Authorization": "Bearer dev-session-analyst-token"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "reply" in data["data"]
        assert "has_patch" in data["data"]
        assert data["data"]["verification_mode"] == "SYNTACTIC_AND_AST_VALIDATED"

