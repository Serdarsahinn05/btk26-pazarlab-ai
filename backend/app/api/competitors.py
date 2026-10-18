"""Competitor choice on a saved result (Faz 21). Deterministic, no AI; the rivals are stored with the result."""

import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import ValidationError

from app.api.simulate import _history_enabled
from app.models.competitor import CompetitorChoiceRequest, CompetitorInput
from app.models.product import SimulationRequest
from app.security import RateLimit
from app.services import history_store
from app.services.competitor_choice import competitor_choice

router = APIRouter(prefix="/api", tags=["competitors"])
logger = logging.getLogger("competitors")

NOT_FOUND = "Bu sonuç bulunamadı ya da süresi doldu."
NO_REQUEST = "Bu sonuç eski bir sürümle kaydedilmiş; rakip karşılaştırması için ürünü yeniden simüle et."


def _own_request(sim_id: str) -> tuple[SimulationRequest, dict[str, Any]]:
    record = history_store.get(sim_id) if _history_enabled() else None
    if record is None:
        raise HTTPException(status_code=404, detail=NOT_FOUND)
    if not record["request"]:
        raise HTTPException(status_code=409, detail=NO_REQUEST)
    return SimulationRequest.model_validate(record["request"]), record


def _payload(rivals: list[CompetitorInput], own: SimulationRequest) -> dict[str, Any]:
    return {
        "competitors": [r.model_dump(mode="json", by_alias=True, exclude_none=True) for r in rivals],
        "result": competitor_choice(own, rivals),
    }


@router.post("/competitor-choice", dependencies=[Depends(RateLimit("RATE_LIMIT_WHATIF_PER_MIN", 20))])
def choose_between(payload: CompetitorChoiceRequest) -> dict[str, Any]:
    own, _ = _own_request(payload.simulation_id)
    response = _payload(payload.competitors, own)
    try:
        history_store.save_competitors(payload.simulation_id, response["competitors"])
    except Exception:
        # Same rule as the simulation itself: a storage problem must not cost the user the answer.
        logger.exception("Could not save competitors")
    return response


@router.get("/competitor-choice/{sim_id}", dependencies=[Depends(RateLimit("RATE_LIMIT_HISTORY_PER_MIN", 60))])
def saved_choice(sim_id: str) -> dict[str, Any]:
    """The rivals saved with a result and their share, recomputed (the engine is deterministic)."""
    own, record = _own_request(sim_id)
    try:
        rivals = [CompetitorInput.model_validate(c) for c in record["competitors"]]
    except ValidationError:
        rivals = []
    return _payload(rivals, own) if rivals else {"competitors": [], "result": None}
