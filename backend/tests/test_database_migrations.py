"""SafeCodium — Automated Database Migration Tests."""

import os
import shutil
import tempfile
import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from backend.app.core.config import settings


def test_alembic_upgrade_downgrade_cycle(tmp_path):
    """Test full Alembic upgrade and downgrade lifecycle on a disposable database."""
    temp_db_path = (tmp_path / "migration_test.db").as_posix()
    db_url = f"sqlite+aiosqlite:///{temp_db_path}"

    base_dir = settings.BASE_DIR
    alembic_ini_path = (base_dir / "alembic.ini").resolve().as_posix()

    cfg = Config(alembic_ini_path)
    cfg.set_main_option("sqlalchemy.url", db_url)

    # 1. Upgrade to head
    command.upgrade(cfg, "head")

    # Verify tables created
    engine = create_async_engine(db_url)

    async def verify_tables():
        async with engine.connect() as conn:
            res = await conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
            tables = [row[0] for row in res.fetchall()]
            for expected in ["users", "projects", "scans", "vulnerabilities", "patches", "verifications", "alembic_version"]:
                assert expected in tables

    import asyncio
    asyncio.run(verify_tables())

    # 2. Downgrade to base
    command.downgrade(cfg, "base")

    async def verify_empty():
        async with engine.connect() as conn:
            res = await conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' AND name != 'alembic_version'"))
            tables = [row[0] for row in res.fetchall()]
            assert len(tables) == 0

    asyncio.run(verify_empty())

    # 3. Re-upgrade to head
    command.upgrade(cfg, "head")
    asyncio.run(verify_tables())
    asyncio.run(engine.dispose())
