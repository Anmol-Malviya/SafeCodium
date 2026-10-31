"""Safe Vibe AI / SafeCodium — Autonomous Pipeline API Endpoints."""

import asyncio
import uuid
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.core.auth import get_current_user, verify_project_access
from backend.app.db.session import get_db, AsyncSessionLocal
from backend.app.models.project import AnalysisJob, Project
from backend.app.models.user import User
from backend.app.schemas.common import ApiResponse
from backend.app.services.pipeline.orchestrator import PipelineOrchestrator

router = APIRouter(prefix="/pipeline", tags=["Autonomous Pipeline Execution"])


class TriggerPipelineRequest(BaseModel):
    project_id: str
    ai_provider: Optional[str] = "gemini"


class StageInfo(BaseModel):
    stage_id: str
    name: str
    status: str
    details: str
    evidence: Dict[str, str] = {}
    elapsed_seconds: float = 0.0


class PipelineJobResponse(BaseModel):
    job_id: str
    project_id: str
    status: str
    current_stage: str
    progress_percentage: int
    stages: List[StageInfo] = []
    error_message: Optional[str] = None
    summary_data: Optional[Dict[str, Any]] = None


async def run_pipeline_task(project_id: str, job_id: str, ai_provider: str):
    """Background async runner with its own database session."""
    async with AsyncSessionLocal() as session:
        await PipelineOrchestrator.run_pipeline_for_project(
            project_id=project_id,
            job_id=job_id,
            db=session,
            ai_provider=ai_provider,
        )


@router.post("/run", response_model=ApiResponse[PipelineJobResponse], status_code=status.HTTP_202_ACCEPTED)
async def trigger_pipeline(
    req: TriggerPipelineRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Triggers the autonomous 9-stage analysis and repair pipeline in the background.
    Creates a persistent AnalysisJob record for live progress tracking.
    """
    proj_res = await db.execute(select(Project).where(Project.id == req.project_id))
    project = proj_res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    verify_project_access(project, current_user)

    job_id = f"job-{uuid.uuid4().hex[:12]}"
    job = AnalysisJob(
        id=job_id,
        project_id=project.id,
        status="running",
        current_stage="VALIDATE_FILES",
        progress_percentage=5,
        stages_data={},
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Launch in background
    background_tasks.add_task(run_pipeline_task, project.id, job_id, req.ai_provider or "gemini")

    return ApiResponse(
        success=True,
        message="Autonomous pipeline job triggered",
        data=PipelineJobResponse(
            job_id=job.id,
            project_id=job.project_id,
            status=job.status,
            current_stage=job.current_stage,
            progress_percentage=job.progress_percentage,
            stages=[],
            error_message=None,
            summary_data=None,
        ),
    )


@router.get("/status/{job_id}", response_model=ApiResponse[PipelineJobResponse])
async def get_pipeline_job_status(
    job_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves live or persisted progress for an autonomous analysis and repair job.
    Supports real-time UI polling and state restoration upon browser refresh.
    """
    job_res = await db.execute(select(AnalysisJob).where(AnalysisJob.id == job_id))
    job = job_res.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline job not found")

    proj_res = await db.execute(select(Project).where(Project.id == job.project_id))
    project = proj_res.scalar_one_or_none()
    if project:
        verify_project_access(project, current_user)

    stages_list: List[StageInfo] = []
    if job.stages_data:
        for s_id, s_info in job.stages_data.items():
            stages_list.append(
                StageInfo(
                    stage_id=s_info.get("stage_id", s_id),
                    name=s_info.get("name", s_id),
                    status=s_info.get("status", "PENDING"),
                    details=s_info.get("details", ""),
                    evidence=s_info.get("evidence", {}),
                    elapsed_seconds=s_info.get("elapsed_seconds", 0.0),
                )
            )

    return ApiResponse(
        success=True,
        message="Pipeline status retrieved",
        data=PipelineJobResponse(
            job_id=job.id,
            project_id=job.project_id,
            status=job.status,
            current_stage=job.current_stage,
            progress_percentage=job.progress_percentage,
            stages=stages_list,
            error_message=job.error_message,
            summary_data=job.summary_data,
        ),
    )


@router.get("/project/{project_id}/latest", response_model=ApiResponse[Optional[PipelineJobResponse]])
async def get_latest_project_pipeline_job(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves the most recent pipeline job for a project, allowing instant UI restoration.
    """
    proj_res = await db.execute(select(Project).where(Project.id == project_id))
    project = proj_res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")

    verify_project_access(project, current_user)

    job_res = await db.execute(
        select(AnalysisJob)
        .where(AnalysisJob.project_id == project_id)
        .order_by(AnalysisJob.created_at.desc())
        .limit(1)
    )
    job = job_res.scalar_one_or_none()
    if not job:
        return ApiResponse(success=True, message="No pipeline jobs found for project", data=None)

    stages_list: List[StageInfo] = []
    if job.stages_data:
        for s_id, s_info in job.stages_data.items():
            stages_list.append(
                StageInfo(
                    stage_id=s_info.get("stage_id", s_id),
                    name=s_info.get("name", s_id),
                    status=s_info.get("status", "PENDING"),
                    details=s_info.get("details", ""),
                    evidence=s_info.get("evidence", {}),
                    elapsed_seconds=s_info.get("elapsed_seconds", 0.0),
                )
            )

    return ApiResponse(
        success=True,
        message="Latest pipeline status retrieved",
        data=PipelineJobResponse(
            job_id=job.id,
            project_id=job.project_id,
            status=job.status,
            current_stage=job.current_stage,
            progress_percentage=job.progress_percentage,
            stages=stages_list,
            error_message=job.error_message,
            summary_data=job.summary_data,
        ),
    )
