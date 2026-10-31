"""Safe Vibe AI — AI Engine API Endpoints."""

from typing import List
from fastapi import APIRouter, HTTPException, status

from backend.app.ai_engine.router import ai_router
from backend.app.ai_engine.schemas import (
    AdvancedSettings,
    AiPatchRequest,
    AiPatchResponse,
    AiReasoningRequest,
    AiReasoningResponse,
    ProviderConfigureRequest,
    ProviderStatus,
    RoutingSettings,
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


@router.post("/providers/configure", response_model=ApiResponse[ProviderStatus])
async def configure_provider(req: ProviderConfigureRequest):
    """Safely updates provider runtime configuration without leaking credentials."""
    success = ai_router.update_provider_config(
        provider_name=req.provider_name.lower(),
        api_key=req.api_key,
        model_name=req.model_name,
        endpoint=req.endpoint,
        enabled=req.enabled,
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"AI Provider '{req.provider_name}' not found",
        )
    
    # Re-probe this provider
    statuses = await ai_router.check_all_providers()
    for s in statuses:
        if s.provider_name.lower() == req.provider_name.lower():
            return ApiResponse(
                success=True,
                message=f"Configured and verified {req.provider_name}",
                data=s,
            )
            
    raise HTTPException(status_code=500, detail="Failed to retrieve updated provider status")


@router.get("/routing", response_model=ApiResponse[RoutingSettings])
async def get_routing_settings():
    """Returns current active AI routing configuration."""
    return ApiResponse(
        success=True,
        message="AI routing configuration retrieved",
        data=RoutingSettings(**ai_router.routing_settings),
    )


@router.post("/routing", response_model=ApiResponse[RoutingSettings])
async def update_routing_settings(settings_req: RoutingSettings):
    """Updates AI routing and fallback policies."""
    ai_router.routing_settings = settings_req.model_dump()
    return ApiResponse(
        success=True,
        message="AI routing configuration updated",
        data=settings_req,
    )


@router.get("/advanced", response_model=ApiResponse[AdvancedSettings])
async def get_advanced_settings():
    """Returns advanced engine policies and timeouts."""
    return ApiResponse(
        success=True,
        message="Advanced AI engine configuration retrieved",
        data=AdvancedSettings(**ai_router.advanced_settings),
    )


@router.post("/advanced", response_model=ApiResponse[AdvancedSettings])
async def update_advanced_settings(settings_req: AdvancedSettings):
    """Updates advanced engine policies."""
    ai_router.advanced_settings = settings_req.model_dump()
    return ApiResponse(
        success=True,
        message="Advanced AI engine configuration updated",
        data=settings_req,
    )


@router.get("/local-models", response_model=ApiResponse[List[dict]])
async def get_local_models():
    """Dynamically probes local Ollama runtime for installed models."""
    ollama_provider = ai_router.providers.get("ollama")
    models_list = []
    base_url = getattr(ollama_provider, "base_url", "http://localhost:11434")
    try:
        import httpx
        async with httpx.AsyncClient(timeout=2.0) as client:
            res = await client.get(f"{base_url}/api/tags")
            if res.status_code == 200:
                for m in res.json().get("models", []):
                    name = m.get("name", "")
                    size_gb = round(m.get("size", 0) / (1024 * 1024 * 1024), 2)
                    models_list.append({
                        "name": name,
                        "size_gb": size_gb,
                        "modified_at": m.get("modified_at", ""),
                        "status": "Available",
                        "enabled": name == getattr(ollama_provider, "model_name", "gemma3:4b"),
                    })
    except Exception:
        pass

    return ApiResponse(
        success=True,
        message=f"Found {len(models_list)} local runtime models",
        data=models_list,
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

