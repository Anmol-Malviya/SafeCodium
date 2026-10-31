"""Safe Vibe AI — System Health and Telemetry Endpoint."""

import os
import platform
import subprocess
import time
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

import psutil
from backend.app.db.session import get_db, engine
from backend.app.schemas.common import ApiResponse, SystemHealthInfo, DatabaseHealthInfo

router = APIRouter()
START_TIME = time.time()


def get_gpu_telemetry():
    """Queries nvidia-smi for real-time GPU telemetry."""
    try:
        res = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,memory.total,memory.free", "--format=csv,noheader,nounits"],
            capture_output=True,
            text=True,
            timeout=2,
            check=False,
        )
        if res.returncode == 0 and res.stdout.strip():
            parts = [p.strip() for p in res.stdout.strip().split(",")]
            if len(parts) >= 3:
                return {
                    "detected": True,
                    "model": parts[0],
                    "total_mb": int(parts[1]),
                    "free_mb": int(parts[2]),
                }
    except Exception:
        pass
    return {"detected": False, "model": None, "total_mb": None, "free_mb": None}


@router.get("/health", response_model=ApiResponse[SystemHealthInfo])
async def health_check(db: AsyncSession = Depends(get_db)):
    """Dynamic healthcheck reporting hardware and service health with full DB diagnostics."""
    db_connected = False
    latency_ms = 0.0
    db_error = None
    migration_version = None
    schema_initialized = False

    dialect_name = engine.dialect.name
    driver_name = engine.dialect.driver

    t_start = time.perf_counter()
    try:
        result = await db.execute(text("SELECT 1"))
        db_connected = result.scalar() == 1
        latency_ms = round((time.perf_counter() - t_start) * 1000, 2)

        # Query migration revision
        try:
            mig_res = await db.execute(text("SELECT version_num FROM alembic_version LIMIT 1"))
            migration_version = mig_res.scalar()
        except Exception:
            migration_version = "not_versioned"

        # Check essential tables presence
        try:
            check_res = await db.execute(text("SELECT COUNT(*) FROM projects"))
            schema_initialized = check_res.scalar() is not None
        except Exception:
            schema_initialized = False
    except Exception as e:
        latency_ms = round((time.perf_counter() - t_start) * 1000, 2)
        db_connected = False
        db_error = str(e)

    db_details = DatabaseHealthInfo(
        status="CONNECTED" if db_connected else "DISCONNECTED",
        dialect=dialect_name,
        driver=driver_name,
        latency_ms=latency_ms,
        schema_initialized=schema_initialized,
        migration_version=str(migration_version) if migration_version else None,
        error=db_error,
    )

    mem = psutil.virtual_memory()
    total_ram_gb = round(mem.total / (1024 ** 3), 2)
    free_ram_gb = round(mem.available / (1024 ** 3), 2)

    gpu = get_gpu_telemetry()
    uptime = round(time.time() - START_TIME, 2)

    data = SystemHealthInfo(
        status="OPERATIONAL" if db_connected else "DEGRADED",
        uptime_seconds=uptime,
        os=f"{platform.system()} {platform.release()} ({platform.architecture()[0]})",
        python_version=platform.python_version(),
        total_ram_gb=total_ram_gb,
        free_ram_gb=free_ram_gb,
        gpu_detected=gpu["detected"],
        gpu_model=gpu["model"],
        vram_total_mb=gpu["total_mb"],
        vram_free_mb=gpu["free_mb"],
        database_connected=db_connected,
        database_details=db_details,
    )

    return ApiResponse(
        success=True,
        message="Safe Vibe AI Engine Healthy",
        data=data,
    )

