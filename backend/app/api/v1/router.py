"""Safe Vibe AI — API v1 Router Aggregator."""

from fastapi import APIRouter
from backend.app.api.v1.health import router as health_router
from backend.app.api.v1.projects import router as projects_router
from backend.app.api.v1.scans import router as scans_router
from backend.app.api.v1.iot_context import router as iot_context_router
from backend.app.api.v1.ai import router as ai_router
from backend.app.api.v1.reasoning import router as reasoning_router
from backend.app.api.v1.patches import router as patches_router
from backend.app.api.v1.verification import router as verification_router
from backend.app.api.v1.reports import router as reports_router
from backend.app.api.v1.analytics import router as analytics_router

api_router = APIRouter(prefix="/v1")
api_router.include_router(health_router, tags=["Health & Diagnostics"])
api_router.include_router(projects_router, tags=["Project Ingestion"])
api_router.include_router(scans_router, tags=["Vulnerability Scanning"])
api_router.include_router(iot_context_router, tags=["IoT Context Intelligence"])
api_router.include_router(ai_router, tags=["AI Engine & Providers"])
api_router.include_router(reasoning_router, tags=["AI Root-Cause Reasoning"])
api_router.include_router(patches_router, tags=["Automated Patch Generation"])
api_router.include_router(verification_router, tags=["Dual Compilation & Verification"])
api_router.include_router(reports_router, tags=["Security Assurance & Audit Passports"])
api_router.include_router(analytics_router, tags=["Full-Stack System Analytics & Pipeline"])

