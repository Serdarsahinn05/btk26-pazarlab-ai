import io
import json

import pytest

from app.services import llm_client


def parse_sse(text: str) -> list[tuple[str, dict]]:
    events = []
    for block in text.strip().split("\n\n"):
        lines = dict(line.split(": ", 1) for line in block.splitlines() if ": " in line)
        events.append((lines["event"], json.loads(lines["data"])))
    return events


@pytest.fixture
def stored_id(client, payload):
    return client.post("/api/simulate", json=payload).json()["simulationId"]


# --- live simulation progress -------------------------------------------

def test_simulate_stream_reports_every_step_then_result(client, payload, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "")
    res = client.post("/api/simulate/stream", json=payload)
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/event-stream")
    events = parse_sse(res.text)
    steps = [data["step"] for kind, data in events if kind == "step"]
    assert steps == ["input_analysis", "research", "benchmark", "simulate", "debate"]
    kind, result = events[-1]
    assert kind == "result"
    assert result["simulatedConsumers"] == 500
    assert client.get(f"/api/simulations/{result['simulationId']}").status_code == 200


def test_simulate_stream_validates_input(client, payload):
    assert client.post("/api/simulate/stream", json={**payload, "price": 0}).status_code == 422


# --- persona chat ---------------------------------------------------------

def test_persona_chat_streams_answer_with_server_side_context(client, stored_id, monkeypatch):
    seen = {}

    def fake_stream(instructions, turns, **kwargs):
        seen["instructions"], seen["turns"] = instructions, turns
        yield "Fiyat "
        yield "bana biraz yüksek geldi."

    monkeypatch.setattr(llm_client, "stream_chat", fake_stream)
    res = client.post(
        "/api/persona-chat",
        json={"simulationId": stored_id, "persona": "Fiyat Hassas Alici", "messages": [{"role": "user", "text": "Neden almadın?"}]},
    )
    events = parse_sse(res.text)
    assert "".join(d["text"] for k, d in events if k == "delta") == "Fiyat bana biraz yüksek geldi."
    assert events[-1][0] == "done"
    assert "Fiyat Hassas Alıcı" in seen["instructions"]  # displayName, not the ASCII id
    assert "Basic Pamuklu Tisort" in seen["instructions"]  # product comes from the stored request
    assert seen["turns"] == [{"role": "user", "text": "Neden almadın?"}]


@pytest.mark.parametrize(
    "body, status",
    [
        ({"simulationId": "AAAAAAAAAAAA", "persona": "Fiyat Hassas Alici", "messages": [{"role": "user", "text": "x"}]}, 404),
        ({"simulationId": "short", "persona": "Fiyat Hassas Alici", "messages": [{"role": "user", "text": "x"}]}, 422),
        ({"persona": "Hacker", "messages": [{"role": "user", "text": "x"}]}, 422),
        ({"persona": "Fiyat Hassas Alici", "messages": [{"role": "persona", "text": "x"}]}, 422),
        ({"persona": "Fiyat Hassas Alici", "messages": [{"role": "user", "text": "x" * 601}]}, 422),
        ({"persona": "Fiyat Hassas Alici", "messages": [{"role": "user", "text": "x"}] * 13}, 422),
    ],
)
def test_persona_chat_rejects_bad_requests(client, stored_id, body, status):
    body = {"simulationId": stored_id, **body}
    assert client.post("/api/persona-chat", json=body).status_code == status


def test_persona_chat_reports_unavailable_ai_as_event(client, stored_id, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "")
    res = client.post(
        "/api/persona-chat",
        json={"simulationId": stored_id, "persona": "Trend Takipcisi", "messages": [{"role": "user", "text": "Merhaba"}]},
    )
    kind, data = parse_sse(res.text)[-1]
    assert kind == "error" and "AI" in data["detail"]


# --- llm_client.stream_chat SSE parsing -----------------------------------

class _FakeStream(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def test_stream_chat_parses_gemini_sse_and_keeps_spaces(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "k")
    monkeypatch.setenv("GEMINI_MODEL", "gemini-test")
    pool = llm_client._ModelPool()
    monkeypatch.setattr(pool, "_discover", lambda: [])
    monkeypatch.setattr(llm_client, "_pool", pool)

    def chunk(text, thought=False):
        part = {"text": text, **({"thought": True} if thought else {})}
        return b"data: " + json.dumps({"candidates": [{"content": {"parts": [part]}}]}).encode() + b"\r\n\r\n"

    body = chunk("düşünüyorum", thought=True) + chunk("Merhaba ") + chunk("satıcı!")
    monkeypatch.setattr(llm_client.urllib.request, "urlopen", lambda req, timeout: _FakeStream(body))
    assert "".join(llm_client.stream_chat("sys", [{"role": "user", "text": "hi"}])) == "Merhaba satıcı!"
