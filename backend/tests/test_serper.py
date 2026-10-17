"""Competitor search (B13): a short timeout with one retry, and the Benchmark tab says why it is empty."""

import urllib.error

import pytest

from app.services import serper
from app.services.graph import NO_COMPETITORS, benchmark_node


class _Answer:
    def __init__(self, body: bytes):
        self.body = body

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def read(self):
        return self.body


def _service(monkeypatch, outcomes):
    """Each urlopen call takes the next outcome: an exception to raise or a body to return."""
    monkeypatch.setenv("SERPER_API_KEY", "test-key")
    calls = []

    def urlopen(req, timeout):
        calls.append(timeout)
        outcome = outcomes[len(calls) - 1]
        if isinstance(outcome, Exception):
            raise outcome
        return _Answer(outcome)

    monkeypatch.setattr(serper.urllib.request, "urlopen", urlopen)
    return serper.SerperShoppingService(), calls


def test_timeout_is_retried_once_then_reported(monkeypatch):
    service, calls = _service(monkeypatch, [TimeoutError(), urllib.error.URLError(TimeoutError())])
    assert service.search("tişört") == []
    assert service.problem == "timeout" and calls == [serper.TIMEOUT_SECONDS] * 2


def test_second_attempt_can_succeed(monkeypatch):
    service, calls = _service(monkeypatch, [TimeoutError(), b'{"shopping": [{"title": "Rakip", "price": "299 TL"}]}'])
    assert service.search("tişört") == [{"title": "Rakip", "price": "299 TL"}]
    assert service.problem is None and len(calls) == 2


def test_client_errors_are_not_retried(monkeypatch):
    service, calls = _service(monkeypatch, [urllib.error.HTTPError("u", 403, "Forbidden", {}, None)])
    assert service.search("tişört") == [] and service.problem == "error" and len(calls) == 1


def test_missing_key(monkeypatch):
    monkeypatch.delenv("SERPER_API_KEY", raising=False)
    service = serper.SerperShoppingService()
    assert service.search("tişört") == [] and service.problem == "no_key"


@pytest.mark.parametrize("problem", ["no_key", "timeout", "error", None])
def test_benchmark_explains_an_empty_search(problem):
    state = {"competitors": [], "research_problem": problem, "product_name": "x", "request": None, "category": "x"}
    assert benchmark_node(state) == {"benchmark_analysis": NO_COMPETITORS[problem]}
