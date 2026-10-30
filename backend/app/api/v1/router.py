"""Safe Vibe AI — API v1 Router Aggregator."""

from fastapi import APIRouter
from backend.app.api.v1.health import router as health_router

api_router = APIRouter(prefix="/v1")
api_router.include_router(health_router, tags=["Health & Diagnostics"])
