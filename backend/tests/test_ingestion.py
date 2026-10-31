"""Tests for Safe Vibe AI Source Code & Firmware Ingestion."""

import io
import zipfile
from pathlib import Path
import pytest
from httpx import AsyncClient, ASGITransport

from backend.app.main import app
from backend.app.db.session import init_db
from backend.app.services.ingestion.extractor import (
    safe_extract_zip,
    IngestionSecurityError,
)
from backend.app.services.ingestion.workspace import WorkspaceManager


def create_mock_zip(files: dict) -> io.BytesIO:
    """Helper to create an in-memory zip archive."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for name, content in files.items():
            z.writestr(name, content)
    buf.seek(0)
    return buf


@pytest.mark.asyncio
async def test_safe_zip_extraction(tmp_path: Path):
    """Verify clean extraction of valid embedded firmware zip."""
    dest = tmp_path / "extracted"
    zip_buf = create_mock_zip({
        "main.c": "#include <stdio.h>\nint main() { return 0; }",
        "include/config.h": "#define SENSOR_PIN 4",
    })
    zip_path = tmp_path / "valid.zip"
    zip_path.write_bytes(zip_buf.getvalue())

    extracted = safe_extract_zip(zip_path, dest)
    assert len(extracted) == 2
    assert (dest / "main.c").exists()
    assert (dest / "include" / "config.h").exists()


@pytest.mark.asyncio
async def test_zip_slip_rejection(tmp_path: Path):
    """Verify that path traversal in ZIP archive is strictly detected and rejected."""
    dest = tmp_path / "slip_target"
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        # Create a malicious entry attempting to escape to parent directory
        z.writestr("../malicious_pwn.c", "void pwn() {}")
    buf.seek(0)

    zip_path = tmp_path / "malicious.zip"
    zip_path.write_bytes(buf.getvalue())

    with pytest.raises(IngestionSecurityError, match="Zip-Slip path traversal"):
        safe_extract_zip(zip_path, dest)


@pytest.mark.asyncio
async def test_decompression_ratio_rejection(tmp_path: Path):
    """Verify that excessive compression ratios (decompression bomb defense) are rejected."""
    dest = tmp_path / "bomb_target"
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        # Create repetitive data that compresses heavily
        big_data = b"A" * 500000
        z.writestr("huge_sparse.c", big_data)
    buf.seek(0)

    zip_path = tmp_path / "bomb.zip"
    zip_path.write_bytes(buf.getvalue())

    # If the ratio exceeds MAX_COMPRESSION_RATIO (100:1), safe_extract_zip will raise IngestionSecurityError
    # We test with a controlled small sample or ensure extractor validates ratio
    with pytest.raises(IngestionSecurityError, match="Suspicious compression ratio"):
        safe_extract_zip(zip_path, dest)


@pytest.mark.asyncio
async def test_workspace_manager_sync_and_indexing(tmp_path: Path):
    """Verify shadow workspace cloning and C/C++ indexing."""
    orig = tmp_path / "orig"
    shadow = tmp_path / "shadow"
    orig.mkdir()
    (orig / "sensor.c").write_text("int read() { return 42; }", encoding="utf-8")
    (orig / "sensor.h").write_text("int read();", encoding="utf-8")
    (orig / "README.md").write_text("# Firmware", encoding="utf-8")

    WorkspaceManager.sync_to_shadow(orig, shadow)
    assert (shadow / "sensor.c").exists()
    assert (shadow / "sensor.h").exists()

    files = WorkspaceManager.index_source_files(orig)
    assert len(files) == 2
    extensions = {f["extension"] for f in files}
    assert extensions == {".c", ".h"}


@pytest.mark.asyncio
async def test_upload_api_single_c_file():
    """Verify POST /api/v1/projects/upload with a single C source file."""
    await init_db()
    c_content = b"#include <stdio.h>\nint main() { printf(\"hello\"); return 0; }\n"
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        files = {"file": ("test_meter.c", c_content, "text/x-c")}
        response = await client.post("/api/v1/projects/upload", files=files)
        assert response.status_code == 201
        payload = response.json()
        assert payload["success"] is True
        project_id = payload["data"]["id"]
        assert payload["data"]["source_type"] == "single_file"
        assert payload["data"]["file_count"] == 1

        # Check list endpoint
        list_res = await client.get("/api/v1/projects")
        assert list_res.status_code == 200
        projects = list_res.json()["data"]
        assert any(p["id"] == project_id for p in projects)

        # Check files endpoint
        files_res = await client.get(f"/api/v1/projects/{project_id}/files")
        assert files_res.status_code == 200
        assert len(files_res.json()["data"]) == 1

