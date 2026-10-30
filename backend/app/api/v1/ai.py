"""Safe Vibe AI — AI Engine API Endpoints."""

from typing import List
from fastapi import APIRouter, HTTPException, status

from backend.app.ai_engine.router import ai_router
from backend.app.ai_engine.schemas import (
    AiPatchRequest,
    AiPatchResponse,
    AiReasoningRequest,
    AiReasoningResponse,
    ProviderStatus,
)
from backend.app.schemas.common import ApiResponse

router = APIRouter(prefix="/ai", tags=["AI Engine & Providers"])


@router.get("/providers", response_model=ApiResponse[List[ProviderStatus]])
async def list_providers():
    """Returns real-time availability status for Gemini API, OpenAI, and Ollama."""
    statuses = await ai_router.check_all_providers()
    return ApiResponse(
        success=True,
        message=f"Checked {len(statuses)} AI providers",
        data=statuses,
    )


@router.post("/reasoning", response_model=ApiResponse[AiReasoningResponse])
async def get_vulnerability_reasoning(request: AiReasoningRequest):
    """Generates AI root-cause analysis, attack vector, and recommended defensive strategy."""
    try:
        response = await ai_router.generate_reasoning(request)
        return ApiResponse(
            success=True,
            message=f"Generated reasoning via {response.provider} ({response.model_name})",
            data=response,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI reasoning generation failed: {str(e)}",
        )


@router.post("/patch", response_model=ApiResponse[AiPatchResponse])
async def synthesize_patch(request: AiPatchRequest):
    """Synthesizes a minimal unified diff defensive repair patch."""
    try:
        response = await ai_router.generate_patch(request)
        return ApiResponse(
            success=True,
            message=f"Synthesized patch via {response.provider} ({response.model_name})",
            data=response,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI patch synthesis failed: {str(e)}",
        )
