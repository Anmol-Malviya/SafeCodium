"""Safe Vibe AI — AI Reasoning & Root-Cause API Endpoints."""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.ai_engine.schemas import AiReasoningResponse
from backend.app.db.session import get_db
from backend.app.models.project import Project, Vulnerability
from backend.app.schemas.common import ApiResponse
from backend.app.services.reasoning.service import ReasoningService

router = APIRouter(prefix="/reasoning", tags=["AI Root-Cause Reasoning"])


@router.post("/analyze/{vuln_id}", response_model=ApiResponse[AiReasoningResponse])
async def analyze_vulnerability_root_cause(
    vuln_id: str,
    provider: Optional[str] = Query(None, description="Target AI provider (gemini, openai, ollama)"),
    db: AsyncSession = Depends(get_db),
):
    """
    Synthesizes IoT context and generates in-depth AI root-cause reasoning,
    attack reproduction scenario, and microcontroller safety impact.
    """
    result = await db.execute(select(Vulnerability).where(Vulnerability.id == vuln_id))
    vuln = result.scalar_one_or_none()
    if not vuln:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vulnerability not found")

    proj_res = await db.execute(select(Project).where(Project.id == vuln.project_id))
    project = proj_res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    reasoning = await ReasoningService.analyze_vulnerability(vuln, project, provider=provider)
    return ApiResponse(
        success=True,
        message=f"Root-cause analysis generated via {reasoning.provider} ({reasoning.model_name})",
        data=reasoning,
    )

