import os

from fastapi import APIRouter

from app.services import llm_client

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
def health_check() -> dict:
    return {
        "status": "ok",
        "ai": llm_client.status(),
        "research": {"configured": bool(os.getenv("SERPER_API_KEY", "").strip())},
    }
