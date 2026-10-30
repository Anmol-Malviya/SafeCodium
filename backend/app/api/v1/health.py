"""Safe Vibe AI — System Health and Telemetry Endpoint."""

import os
import platform
import subprocess
import time
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

import psutil
from backend.app.db.session import get_db
from backend.app.schemas.common import ApiResponse, SystemHealthInfo

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
    """Dynamic healthcheck reporting hardware and service health."""
    db_connected = False
    try:
        result = await db.execute(text("SELECT 1"))
        db_connected = result.scalar() == 1
    except Exception:
        db_connected = False

    mem = psutil.virtual_memory()
    total_ram_gb = round(mem.total / (1024 ** 3), 2)
    free_ram_gb = round(mem.available / (1024 ** 3), 2)

    gpu = get_gpu_telemetry()
    uptime = round(time.time() - START_TIME, 2)

    data = SystemHealthInfo(
        status="OPERATIONAL",
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
    )

    return ApiResponse(
        success=True,
        message="Safe Vibe AI Engine Healthy",
        data=data,
    )
