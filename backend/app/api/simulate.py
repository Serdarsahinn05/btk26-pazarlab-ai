from fastapi import APIRouter, Depends

from app.models.product import SimulationRequest
from app.models.simulation import SimulationResponse
from app.security import RateLimit
from app.services.graph import run_agentic_simulation

router = APIRouter(prefix="/api", tags=["simulation"])


# Sync handler on purpose: the LangGraph run is blocking and FastAPI executes
# sync handlers in a threadpool instead of on the event loop.
@router.post(
    "/simulate",
    response_model=SimulationResponse,
    dependencies=[Depends(RateLimit("RATE_LIMIT_SIMULATE_PER_MIN", 5))],
)
def simulate_product(request: SimulationRequest) -> SimulationResponse:
    return run_agentic_simulation(request)
