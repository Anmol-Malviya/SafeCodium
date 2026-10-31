"""SafeCodium — Automated Database Configuration Tests."""

import os
from pathlib import Path
import pytest
from backend.app.core.config import Settings
from backend.app.db.session import get_engine_args


def test_sqlite_url_normalization(tmp_path):
    """Ensure relative SQLite database paths are automatically resolved to absolute paths."""
    rel_path = "./data/custom_test.db"
    settings = Settings(DATABASE_URL=f"sqlite+aiosqlite:///{rel_path}")
    assert settings.DATABASE_URL.startswith("sqlite+aiosqlite:///")
    # Ensure it resolved to an absolute path
    resolved_path = settings.DATABASE_URL.replace("sqlite+aiosqlite:///", "")
    assert Path(resolved_path).is_absolute()
    assert "custom_test.db" in resolved_path


def test_legacy_driver_auto_conversion():
    """Verify synchronous SQLite and PostgreSQL URLs are upgraded to async equivalents."""
    s1 = Settings(DATABASE_URL="sqlite:///./data/test.db")
    assert s1.DATABASE_URL.startswith("sqlite+aiosqlite:///")

    s2 = Settings(DATABASE_URL="postgresql://user:pass@localhost:5432/safecodium")
    assert s2.DATABASE_URL.startswith("postgresql+asyncpg://")

    s3 = Settings(DATABASE_URL="postgres://user:pass@localhost:5432/safecodium")
    assert s3.DATABASE_URL.startswith("postgresql+asyncpg://")


def test_invalid_scheme_rejection():
    """Ensure unsupported database schemes fail fast with clear validation errors."""
    with pytest.raises(ValueError, match="Unsupported DATABASE_URL scheme"):
        Settings(DATABASE_URL="mysql://user:pass@localhost:3306/db")


def test_engine_args_dialect_isolation():
    """Ensure SQLite connect_args are never passed to PostgreSQL."""
    sqlite_args = get_engine_args("sqlite+aiosqlite:///./test.db")
    assert "connect_args" in sqlite_args
    assert sqlite_args["connect_args"].get("check_same_thread") is False

    pg_args = get_engine_args("postgresql+asyncpg://user:pass@host:5432/db")
    assert "connect_args" not in pg_args
    assert pg_args.get("pool_pre_ping") is True
    assert pg_args.get("pool_size") == 10
