"""Safe Vibe AI — Common Pydantic v2 Schemas."""

from datetime import datetime
from typing import Generic, List, Optional, TypeVar, Any
from pydantic import BaseModel, Field

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    """Standardized API response contract."""
    success: bool = True
    message: str = "Success"
    data: Optional[T] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class DatabaseHealthInfo(BaseModel):
    """Detailed database connectivity and diagnostics telemetry."""
    status: str  # CONNECTED, DISCONNECTED, DEGRADED
    dialect: str  # sqlite, postgresql
    driver: str  # aiosqlite, asyncpg
    latency_ms: float
    schema_initialized: bool
    migration_version: Optional[str] = None
    error: Optional[str] = None


class SystemHealthInfo(BaseModel):
    """Runtime host and hardware telemetry."""
    status: str
    uptime_seconds: float
    os: str
    python_version: str
    total_ram_gb: float
    free_ram_gb: float
    gpu_detected: bool
    gpu_model: Optional[str] = None
    vram_total_mb: Optional[int] = None
    vram_free_mb: Optional[int] = None
    database_connected: bool
    database_details: Optional[DatabaseHealthInfo] = None


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    framework_type: str = "generic_c"


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    framework_type: str
    source_type: str
    original_path: str
    shadow_path: Optional[str] = None
    file_count: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

