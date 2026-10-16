import io
import json
import typing
import urllib.error

import pytest

from app.models.product import Category, SimulationRequest
from app.services import llm_client
from app.services.simulation_service import run_simulation
from tests.conftest import VALID_REQUEST


def _request(**overrides) -> SimulationRequest:
    return SimulationRequest.model_validate({**VALID_REQUEST, **overrides})


# --- deterministic simulation core ---------------------------------------

def test_simulation_is_deterministic():
    first, second = run_simulation(_request()), run_simulation(_request())
    assert first.model_dump() == second.model_dump()


def test_simulation_totals_and_ranges():
    res = run_simulation(_request())
    dist = res.decision_distribution
    assert dist.buy + dist.watch + dist.skip == res.simulated_consumers == 500
    assert res.estimated_buyers == dist.buy
    for score in (res.overall_score, res.market_breadth_score, res.intent_conversion_score, res.problem_solution_fit):
        assert 0 <= score <= 100
    assert len(res.all_personas) == 12


def test_higher_price_does_not_increase_buyers():
    cheap = run_simulation(_request(price=199))
    pricey = run_simulation(_request(price=4999))
    assert pricey.decision_distribution.buy <= cheap.decision_distribution.buy


def test_without_key_insights_are_marked_as_fallback(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "")
    assert run_simulation(_request()).ai_insights.ai_generated is False


# --- llm_client ----------------------------------------------------------

def test_model_ranking_prefers_stable_newest_flash():
    names = ["gemini-2.0-flash", "gemini-2.5-pro", "gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-3.0-flash-preview"]
    assert sorted(names, key=llm_client._model_rank)[0] == "gemini-2.5-flash"


class _FakeResponse(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


def _reply(text: str) -> _FakeResponse:
    return _FakeResponse(json.dumps({"candidates": [{"content": {"parts": [{"text": text}]}}]}).encode())


def test_generate_json_falls_back_to_next_model_on_429(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setenv("GEMINI_MODEL", "")
    pool = llm_client._ModelPool()
    monkeypatch.setattr(pool, "_discover", lambda: ["gemini-2.5-flash", "gemini-2.0-flash"])
    monkeypatch.setattr(llm_client, "_pool", pool)
    calls = []

    def fake_urlopen(req, timeout):
        calls.append((req.full_url, req.headers.get("X-goog-api-key")))
        if "2.5-flash" in req.full_url:
            raise urllib.error.HTTPError(req.full_url, 429, "quota", {}, None)
        return _reply('{"ok": true}')

    monkeypatch.setattr(llm_client.urllib.request, "urlopen", fake_urlopen)
    assert llm_client.generate_json("sistem", {"x": 1}) == {"ok": True}
    assert len(calls) == 2
    assert all(key == "test-key" and "key=" not in url for url, key in calls)
    # the throttled model is skipped on the next call
    assert pool.candidates()[0] == "gemini-2.0-flash"


def test_generate_without_key_raises(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "")
    with pytest.raises(llm_client.LLMUnavailable):
        llm_client.generate_text("x", {})


def test_health_never_calls_network(client, monkeypatch):
    monkeypatch.setattr(llm_client.urllib.request, "urlopen", lambda *a, **k: pytest.fail("network call"))
    body = client.get("/api/health").json()
    assert body["status"] == "ok" and "configured" in body["ai"]


# --- graph ---------------------------------------------------------------

def test_graph_uses_llm_debate_and_skips_duplicate_analysis(monkeypatch):
    from app.services import graph, input_analysis_service
    from app.models.input_analysis import InputAnalysisResponse

    monkeypatch.setattr(input_analysis_service, "analyze_input", lambda r: pytest.fail("analysis should be reused"))

    def fake_json(instructions, data, **kwargs):
        if "personalar" in data:  # debate call
            first = data["personalar"][0]["ad"]
            return [{"name": first, "text": "Fiyat biraz yuksek ama kumas iyi."}, {"name": "assistant 2", "text": "Katiliyorum."}]
        raise llm_client.LLMUnavailable("insights not mocked")

    monkeypatch.setattr(llm_client, "generate_json", fake_json)
    monkeypatch.setattr(llm_client, "generate_text", lambda *a, **k: "Rakiplere gore fiyat uygun.")

    request = _request(inputAnalysis=InputAnalysisResponse().model_dump(by_alias=True))
    res = graph.run_agentic_simulation(request)
    names = {p.name for p in res.all_personas}
    assert res.debate_logs[0]["text"].startswith("Fiyat")
    assert all(log["name"] in names for log in res.debate_logs)  # "assistant 2" mapped to a real persona


# --- contracts -----------------------------------------------------------

def test_link_reader_only_returns_accepted_categories():
    from app.services.product_link_service import ProductLinkReader

    allowed = set(typing.get_args(Category))
    for title in ["iPhone 15 telefon", "Nike sneaker ayakkabı", "Deri çanta", "parfüm", "Oversize tişört", "rastgele"]:
        assert ProductLinkReader._map_category(None, title) in allowed
