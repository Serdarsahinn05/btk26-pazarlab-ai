import os

from fastapi import APIRouter

from app.observability import client_ip_var
from app.services import llm_client

router = APIRouter(prefix="/api", tags=["health"])


@router.get("/health")
def health_check() -> dict:
    return {
        "status": "ok",
        # The address limits are counted by; after deploying behind a proxy, two different networks must show two values.
        "clientIp": client_ip_var.get(),
        "ai": llm_client.status(),
        "research": {"configured": bool(os.getenv("SERPER_API_KEY", "").strip())},
    }
