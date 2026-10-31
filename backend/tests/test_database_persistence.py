"""SafeCodium — Automated Database Persistence and Concurrency Tests."""

import asyncio
import uuid
import pytest
from sqlalchemy import select, text
from backend.app.core.config import Settings
from backend.app.db.session import engine, AsyncSessionLocal
from backend.app.models.project import Project


@pytest.mark.asyncio
async def test_database_restart_persistence(tmp_path):
    """Verify data written to database survives session disposal and reconnection."""
    # Write record
    project_name = f"Persistent_IoT_Device_{uuid.uuid4().hex[:6]}"
    async with AsyncSessionLocal() as session:
        proj = Project(
            name=project_name,
            framework_type="arduino",
            source_type="single_file",
            original_path="/tmp/test_persist",
        )
        session.add(proj)
        await session.commit()
        saved_id = proj.id

    # Simulate restart by reading through a fresh session
    async with AsyncSessionLocal() as session:
        persisted = await session.get(Project, saved_id)
        assert persisted is not None
        assert persisted.name == project_name


@pytest.mark.asyncio
async def test_concurrent_transactions():
    """Verify concurrent reads and writes execute reliably without deadlocks."""
    async def create_project(idx: int):
        async with AsyncSessionLocal() as session:
            proj = Project(
                name=f"Concurrent_Device_{idx}_{uuid.uuid4().hex[:4]}",
                framework_type="generic_c",
                source_type="snippet",
                original_path="/tmp/concurrent",
            )
            session.add(proj)
            await session.commit()
            return proj.id

    # Execute concurrent writes
    tasks = [create_project(i) for i in range(5)]
    created_ids = await asyncio.gather(*tasks)
    assert len(created_ids) == 5

    # Execute concurrent reads
    async def read_project(pid: str):
        async with AsyncSessionLocal() as session:
            return await session.get(Project, pid)

    read_tasks = [read_project(pid) for pid in created_ids]
    results = await asyncio.gather(*read_tasks)
    assert all(r is not None for r in results)


@pytest.mark.asyncio
async def test_transaction_atomicity_and_rollback():
    """Verify that if an error occurs mid-transaction, no partial state is committed."""
    failing_name = f"Failing_Tx_{uuid.uuid4().hex[:6]}"
    try:
        async with AsyncSessionLocal() as session:
            proj = Project(
                name=failing_name,
                framework_type="esp_idf",
                source_type="snippet",
                original_path="/tmp/tx",
            )
            session.add(proj)
            await session.flush()
            # Force intentional exception before commit
            raise RuntimeError("Simulated transaction failure")
            await session.commit()
    except RuntimeError:
        pass

    # Verify project was not persisted
    async with AsyncSessionLocal() as session:
        stmt = select(Project).where(Project.name == failing_name)
        result = await session.execute(stmt)
        assert result.scalar_one_or_none() is None

