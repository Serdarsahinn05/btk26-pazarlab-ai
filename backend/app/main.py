import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.api.analyze import router as analyze_router
from app.api.health import router as health_router
from app.api.product_link import router as product_link_router
from app.api.simulate import router as simulate_router

load_dotenv(override=True)


def _get_allowed_origins() -> list[str]:

    return ["*"]


def create_app() -> FastAPI:
    app = FastAPI(
        title="PazarLab AI Backend",
        description="Sentetik e-ticaret pazar simulasyonu API servisi.",
        version="0.1.0",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=_get_allowed_origins(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(analyze_router)
    app.include_router(product_link_router)
    app.include_router(simulate_router)
    return app


app = create_app()
