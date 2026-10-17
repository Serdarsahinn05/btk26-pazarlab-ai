import logging
import os

from fastapi import APIRouter, Depends, HTTPException

from app.models.product import SimulationRequest
from app.models.simulation import SimulationResponse
from app.security import RateLimit
from app.services import history_store
from app.services.graph import run_agentic_simulation

router = APIRouter(prefix="/api", tags=["simulation"])
logger = logging.getLogger("simulate")


def _history_enabled() -> bool:
    return os.getenv("HISTORY_ENABLED", "true").lower() != "false"


# Sync handlers on purpose: the simulation pipeline and sqlite are blocking and FastAPI
# executes sync handlers in a threadpool instead of on the event loop.
@router.post(
    "/simulate",
    response_model=SimulationResponse,
    dependencies=[Depends(RateLimit("RATE_LIMIT_SIMULATE_PER_MIN", 5))],
)
def simulate_product(request: SimulationRequest) -> SimulationResponse:
    response = run_agentic_simulation(request)
    if _history_enabled():
        try:
            response.simulation_id = history_store.save(request, response)
        except Exception:
            # A full disk or read-only volume must not cost the user their result.
            logger.exception("Could not save simulation history")
    return response


@router.get(
    "/simulations/{sim_id}",
    dependencies=[Depends(RateLimit("RATE_LIMIT_HISTORY_PER_MIN", 60))],
)
def get_simulation(sim_id: str) -> dict:
    record = history_store.get(sim_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Bu sonuç bulunamadı ya da süresi doldu.")
    return record
