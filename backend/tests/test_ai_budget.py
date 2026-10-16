"""Faz 10a: AI cache and per-IP daily quota."""

import json

import pytest

from app.observability import client_ip_var
from app.services import llm_client


class _Response:
    def __init__(self, text: str):
        self._body = json.dumps({"candidates": [{"content": {"parts": [{"text": text}]}}]}).encode()

    def read(self):
        return self._body

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


@pytest.fixture
def gemini(monkeypatch):
    """Configured Gemini whose answers come from `answers` (a list, consumed in order; last one repeats)."""
    monkeypatch.setenv("GEMINI_API_KEY", "k")
    monkeypatch.setenv("GEMINI_MODEL", "gemini-test")
    pool = llm_client._ModelPool()
    monkeypatch.setattr(pool, "_discover", lambda: [])
    monkeypatch.setattr(llm_client, "_pool", pool)
    state = {"calls": 0, "answers": ['{"ok": true}']}

    def fake_urlopen(req, timeout):
        state["calls"] += 1
        answers = state["answers"]
        return _Response(answers.pop(0) if len(answers) > 1 else answers[0])

    monkeypatch.setattr(llm_client.urllib.request, "urlopen", fake_urlopen)
    return state


@pytest.fixture
def as_client():
    """Run code as if inside a request from the given IP."""
    tokens = []

    def enter(ip: str):
        tokens.append(client_ip_var.set(ip))

    yield enter
    for token in reversed(tokens):
        client_ip_var.reset(token)


def test_identical_calls_hit_the_cache(gemini):
    first = llm_client.generate_json("sys", {"product": "a"})
    first["ok"] = "mutated by caller"
    assert llm_client.generate_json("sys", {"product": "a"}) == {"ok": True}  # copy, not the cached object
    assert gemini["calls"] == 1
    llm_client.generate_json("sys", {"product": "b"})
    llm_client.generate_json("sys", {"product": "a"}, temperature=0.9)
    assert gemini["calls"] == 3
    assert llm_client.status()["cache"]["hits"] == 1


def test_invalid_json_is_not_cached(gemini):
    gemini["answers"] = ['{"truncated": ', '{"ok": true}']
    with pytest.raises(json.JSONDecodeError):
        llm_client.generate_json("sys", {"x": 1})
    assert llm_client.generate_json("sys", {"x": 1}) == {"ok": True}
    assert gemini["calls"] == 2


def test_cache_can_be_turned_off(gemini, monkeypatch):
    monkeypatch.setenv("AI_CACHE_TTL_SECONDS", "0")
    llm_client.generate_text("sys", {"x": 1})
    llm_client.generate_text("sys", {"x": 1})
    assert gemini["calls"] == 2


def test_daily_quota_is_per_ip_and_cache_hits_are_free(gemini, monkeypatch, as_client):
    monkeypatch.setenv("AI_DAILY_CALLS_PER_IP", "1")
    as_client("203.0.113.1")
    llm_client.generate_text("sys", {"x": 1})
    llm_client.generate_text("sys", {"x": 1})  # cache hit: no quota used
    with pytest.raises(llm_client.AIQuotaExceeded):
        llm_client.generate_text("sys", {"x": 2})
    with pytest.raises(llm_client.LLMUnavailable):  # subclass, so every existing fallback catches it
        list(llm_client.stream_chat("sys", [{"role": "user", "text": "hi"}]))
    as_client("198.51.100.7")
    assert llm_client.generate_text("sys", {"x": 2})
    assert gemini["calls"] == 2


def test_quota_off_or_outside_requests(gemini, monkeypatch, as_client):
    monkeypatch.setenv("AI_DAILY_CALLS_PER_IP", "1")
    for i in range(3):  # no client IP: scripts and internal calls are not limited
        llm_client.generate_text("sys", {"i": i})
    monkeypatch.setenv("AI_DAILY_CALLS_PER_IP", "0")
    as_client("203.0.113.1")
    for i in range(3, 6):
        llm_client.generate_text("sys", {"i": i})
    assert gemini["calls"] == 6


def test_simulation_reports_quota_as_fallback_reason(client, payload, gemini, monkeypatch):
    monkeypatch.setenv("AI_DAILY_CALLS_PER_IP", "1")  # input analysis uses it; insights then hit the quota
    res = client.post("/api/simulate", json=payload)
    assert res.status_code == 200
    insights = res.json()["aiInsights"]
    assert insights["aiGenerated"] is False and insights["aiFallbackReason"] == "quota"


def test_unavailable_ai_reports_unavailable(client, payload):
    insights = client.post("/api/simulate", json=payload).json()["aiInsights"]
    assert insights["aiGenerated"] is False and insights["aiFallbackReason"] == "unavailable"


def test_health_shows_cache_and_quota(client, monkeypatch):
    monkeypatch.setenv("AI_DAILY_CALLS_PER_IP", "25")
    ai = client.get("/api/health").json()["ai"]
    assert ai["dailyCallsPerIp"] == 25 and set(ai["cache"]) == {"entries", "hits", "misses"}
