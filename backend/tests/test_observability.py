import json
import logging
import urllib.error

import pytest

from app.observability import JsonFormatter
from app.services import llm_client


def _access(caplog):
    return [r for r in caplog.records if r.name == "access"]


def test_access_line_per_request_with_request_id(client, caplog):
    caplog.set_level(logging.INFO, logger="access")
    res = client.get("/api/simulations/doesnotexist01?secret=1")
    [record] = _access(caplog)
    assert record.status == 404 and record.method == "GET"
    assert record.path == "/api/simulations/doesnotexist01"  # query string is not logged
    assert "secret" not in record.getMessage()
    assert record.request_id == res.headers["X-Request-ID"]
    assert isinstance(record.durationMs, int)


def test_rejected_body_is_logged_too(client, caplog):
    caplog.set_level(logging.INFO, logger="access")
    client.post("/api/simulate", content=b"{}", headers={"Content-Length": str(10**9), "Content-Type": "application/json"})
    assert [r.status for r in _access(caplog)] == [413]


def test_request_id_reaches_logs_from_sync_handlers(client, caplog, monkeypatch, payload):
    """Handlers run in the threadpool; the id must still be on their log lines (e.g. LLM warnings)."""
    caplog.set_level(logging.WARNING, logger="llm_client")

    def failing(*args, **kwargs):
        logging.getLogger("llm_client").warning("Gemini test failed with HTTP 429")
        raise llm_client.LLMUnavailable("quota")

    monkeypatch.setattr(llm_client, "generate_json", failing)
    monkeypatch.setattr(llm_client, "generate_text", failing)
    monkeypatch.setattr(llm_client, "is_configured", lambda: True)
    res = client.post("/api/simulate", json=payload)
    warnings = [r for r in caplog.records if r.name == "llm_client"]
    assert warnings and {r.request_id for r in warnings} == {res.headers["X-Request-ID"]}


def test_json_formatter_includes_extras_and_request_id():
    record = logging.makeLogRecord({"name": "access", "levelno": logging.INFO, "levelname": "INFO", "msg": "GET / 200",
                                    "status": 200, "request_id": "abc123"})
    line = json.loads(JsonFormatter().format(record))
    assert line["requestId"] == "abc123" and line["status"] == 200 and line["message"] == "GET / 200"
    assert "request_id" not in line and "args" not in line


@pytest.fixture
def gemini(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "k")
    monkeypatch.setenv("GEMINI_MODEL", "gemini-test")
    pool = llm_client._ModelPool()
    monkeypatch.setattr(pool, "_discover", lambda: [])
    monkeypatch.setattr(llm_client, "_pool", pool)
    monkeypatch.setattr(llm_client, "_last", {"okAt": None, "errorAt": None, "error": None})


def test_health_reports_last_ai_error(client, monkeypatch, gemini):
    def quota(req, timeout):
        raise urllib.error.HTTPError(req.full_url, 429, "Too Many Requests", {}, None)

    monkeypatch.setattr(llm_client.urllib.request, "urlopen", quota)
    with pytest.raises(llm_client.LLMUnavailable):
        llm_client.generate_text("sys", {"x": 1})
    ai = client.get("/api/health").json()["ai"]
    assert ai["lastError"] == "HTTP 429" and ai["lastErrorAt"] and ai["lastSuccessAt"] is None
