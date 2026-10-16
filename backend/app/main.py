import contextlib
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Real environment variables (Docker, CI) win over the local .env file.
load_dotenv(override=False)

from app import security
from app.mcp_server import create_mcp_app, mcp
from app.observability import configure_logging
from app.api.analyze import router as analyze_router
from app.api.health import router as health_router
from app.api.product_link import router as product_link_router
from app.api.simulate import router as simulate_router
from app.api.whatif import router as whatif_router
from app.api.stream import router as stream_router

configure_logging()


def _get_allowed_origins() -> list[str]:
    raw = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
    return [origin.strip() for origin in raw.split(",") if origin.strip() and origin.strip() != "*"]


def create_app() -> FastAPI:
    is_production = os.getenv("ENV", "development").lower() == "production"
    mcp_app = create_mcp_app()

    @contextlib.asynccontextmanager
    async def lifespan(_app: FastAPI):
        # Starlette does not run a mounted app's lifespan, so the MCP session manager is started here.
        async with mcp.session_manager.run():
            yield

    app = FastAPI(
        lifespan=lifespan,
        title="PazarLab AI Backend",
        description="Sentetik e-ticaret pazar simulasyonu API servisi.",
        version="0.1.0",
        docs_url=None if is_production else "/docs",
        redoc_url=None if is_production else "/redoc",
        openapi_url=None if is_production else "/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=_get_allowed_origins(),
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
        expose_headers=["X-Request-ID", "Retry-After"],
    )
    security.install(app)

    app.include_router(health_router)
    app.include_router(analyze_router)
    app.include_router(product_link_router)
    app.include_router(simulate_router)
    app.include_router(whatif_router)
    app.include_router(stream_router)
    # Last, so every API route wins; the MCP app itself only answers /mcp (Faz 11).
    app.mount("/", mcp_app)
    return app


app = create_app()
