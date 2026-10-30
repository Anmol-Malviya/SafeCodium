"""Safe Vibe AI — IoT Context Intelligence API Endpoints."""

import os
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.session import get_db
from backend.app.models.project import Project, Vulnerability
from backend.app.schemas.common import ApiResponse
from backend.app.schemas.iot_context import IotProjectContextSummary
from backend.app.services.iot_context.context_bundle import IotContextBuilder, IotContextBundle
from backend.app.services.iot_context.peripheral_analyzer import PeripheralAnalyzer

router = APIRouter(prefix="/iot-context", tags=["IoT Context Intelligence"])


@router.get("/vulnerability/{vuln_id}", response_model=ApiResponse[IotContextBundle])
async def get_vulnerability_iot_context(
    vuln_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Constructs an IoT context bundle for a vulnerability finding, identifying
    hardware peripheral taint sources, function AST, and embedded memory constraints.
    """
    result = await db.execute(select(Vulnerability).where(Vulnerability.id == vuln_id))
    vuln = result.scalar_one_or_none()
    if not vuln:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vulnerability not found")

    proj_res = await db.execute(select(Project).where(Project.id == vuln.project_id))
    project = proj_res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    bundle = IotContextBuilder.build_bundle(project, vuln)
    return ApiResponse(
        success=True,
        message="IoT context bundle generated for vulnerability",
        data=bundle,
    )


@router.get("/project/{project_id}", response_model=ApiResponse[IotProjectContextSummary])
async def get_project_iot_summary(
    project_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Scans an entire firmware project to build a hardware architecture summary,
    identifying all active peripherals (UART, SPI, ADC, WiFi, etc.).
    """
    proj_res = await db.execute(select(Project).where(Project.id == project_id))
    project = proj_res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    shadow_dir = Path(project.shadow_path)
    all_code = []
    file_count = 0

    if shadow_dir.exists():
        for root, _, files in os.walk(shadow_dir):
            for file in files:
                if Path(file).suffix.lower() in {".c", ".cpp", ".h", ".hpp"}:
                    file_count += 1
                    try:
                        content = (Path(root) / file).read_text(encoding="utf-8", errors="replace")
                        all_code.append(content)
                    except Exception:
                        pass

    combined = "\n".join(all_code)
    detected_peripherals = PeripheralAnalyzer.analyze_snippet(combined)

    is_esp = project.framework_type == "esp_idf" or "esp_" in combined
    operating_system = "FreeRTOS" if ("freertos" in combined.lower() or is_esp) else "Bare-Metal"
    memory_arch = "Harvard Architecture (Xtensa / ARM) with flat physical addressing"

    summary = IotProjectContextSummary(
        project_id=project.id,
        framework_type=project.framework_type,
        detected_peripherals=detected_peripherals,
        total_source_files=file_count,
        memory_architecture=memory_arch,
        operating_system=operating_system,
    )

    return ApiResponse(
        success=True,
        message="Project IoT hardware summary generated",
        data=summary,
    )

