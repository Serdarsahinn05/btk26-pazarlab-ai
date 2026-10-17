"""Server-sent-event endpoints: live simulation progress and persona chat."""

import json
import logging
import os
import re
from typing import Iterator, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, model_validator

from app.models.product import SimulationRequest
from app.security import RateLimit
from app.services import history_store, llm_client
from app.services.graph import STEP_LABELS, iter_agentic_simulation
from app.services.persona_chat import build_persona_prompt, build_resident_prompt, find_persona, find_resident
from app.services.persona_offline import rule_based_reply

router = APIRouter(prefix="/api", tags=["stream"])
logger = logging.getLogger("stream")

SSE_HEADERS = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}


def _event(event: str, data: object) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False, default=str)}\n\n"


# Sync generators run in Starlette's threadpool, so the blocking graph/LLM calls
# never stall the event loop.
@router.post("/simulate/stream", dependencies=[Depends(RateLimit("RATE_LIMIT_SIMULATE_PER_MIN", 5))])
def simulate_stream(request: SimulationRequest) -> StreamingResponse:
    def events() -> Iterator[str]:
        for kind, value in iter_agentic_simulation(request):
            if kind == "step":
                yield _event("step", {"step": value, "label": STEP_LABELS.get(value, value)})
                continue
            response = value
            if os.getenv("HISTORY_ENABLED", "true").lower() != "false":
                try:
                    response.simulation_id = history_store.save(request, response)
                except Exception:
                    logger.exception("Could not save simulation history")
            yield _event("result", response.model_dump(by_alias=True, mode="json"))

    return StreamingResponse(events(), media_type="text/event-stream", headers=SSE_HEADERS)


class ChatTurn(BaseModel):
    role: Literal["user", "persona"]
    text: str = Field(min_length=1, max_length=600)


class PersonaChatRequest(BaseModel):
    simulation_id: str = Field(alias="simulationId", min_length=12, max_length=12)
    persona: str = Field(default="", max_length=80)
    # A town resident shown on this result ("r042"); the chat is then with that person instead of the persona.
    resident: Optional[str] = Field(default=None, pattern=r"^r\d{3}$")
    messages: list[ChatTurn] = Field(min_length=1, max_length=12)

    @model_validator(mode="after")
    def _someone(self) -> "PersonaChatRequest":
        if not self.persona and not self.resident:
            raise ValueError("persona ya da resident gerekli")
        return self


@router.post("/persona-chat", dependencies=[Depends(RateLimit("RATE_LIMIT_CHAT_PER_MIN", 15))])
def persona_chat(payload: PersonaChatRequest) -> StreamingResponse:
    # Product context comes from the stored result, never from the client.
    record = history_store.get(payload.simulation_id)
    if record is None or not record.get("request"):
        raise HTTPException(status_code=404, detail="Bu sonuç için sohbet açılamıyor (kayıt bulunamadı).")
    if payload.messages[-1].role != "user":
        raise HTTPException(status_code=422, detail="Son mesaj kullanıcıdan olmalı.")
    shown = None
    if payload.resident:
        # Only the residents this result shows: their decision and reason on this product are stored with it.
        shown = next((r for r in record["response"].get("representatives", []) if r.get("id") == payload.resident), None)
        resident = find_resident(payload.resident) if shown else None
        if resident is None:
            raise HTTPException(status_code=404, detail="Bu sakin bu sonuçta yok.")
        persona = find_persona(resident["persona"])
    else:
        persona = find_persona(payload.persona)
    if persona is None:
        raise HTTPException(status_code=422, detail="Bilinmeyen persona.")

    if shown:
        instructions = build_resident_prompt(resident, shown, persona, record["request"], record["response"])
    else:
        instructions = build_persona_prompt(persona, record["request"], record["response"])
    turns = [{"role": "user" if m.role == "user" else "model", "text": m.text} for m in payload.messages]

    def events() -> Iterator[str]:
        sent = False
        try:
            for chunk in llm_client.stream_chat(instructions, turns):
                sent = True
                yield _event("delta", {"text": chunk})
            yield _event("done", {})
        except llm_client.LLMUnavailable as exc:
            if sent:  # never append a template to a half-written AI answer
                yield _event("error", {"detail": "Cevap yarıda kesildi. Biraz sonra tekrar deneyin."})
                return
            # No AI (down or this visitor's daily quota): answer from the simulation data instead (Faz 10b).
            reply = rule_based_reply(persona, record["request"], record["response"], payload.messages[-1].text, resident=shown)
            for sentence in re.findall(r"[^.!?]+[.!?]", reply) or [reply]:
                yield _event("delta", {"text": sentence.strip() + " "})
            reason = "quota" if isinstance(exc, llm_client.AIQuotaExceeded) else "unavailable"
            yield _event("done", {"ruleBased": True, "reason": reason})
        except Exception:
            logger.exception("persona chat failed")
            yield _event("error", {"detail": "Beklenmeyen bir hata oluştu."})

    return StreamingResponse(events(), media_type="text/event-stream", headers=SSE_HEADERS)
