"""Safe Vibe AI — IoT Context Intelligence Schemas."""

from typing import List, Optional
from pydantic import BaseModel
from backend.app.services.iot_context.peripheral_analyzer import PeripheralSource
from backend.app.services.iot_context.context_bundle import IotContextBundle

class IotProjectContextSummary(BaseModel):
    project_id: str
    framework_type: str
    detected_peripherals: List[PeripheralSource]
    total_source_files: int
    memory_architecture: str
    operating_system: str
