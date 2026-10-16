import socket

import pytest

from app.services import safe_http
from app.services.safe_http import UnsafeURLError, validate_url


# --- S1: SSRF -------------------------------------------------------------

@pytest.mark.parametrize(
    "url",
    [
        "http://127.0.0.1/",
        "http://localhost/",
        "http://[::1]/",
        "http://[::ffff:127.0.0.1]/",
        "http://169.254.169.254/latest/meta-data/",
        "http://10.0.0.5/",
        "http://192.168.1.1/",
        "http://0.0.0.0/",
        "http://2130706433/",
        "https://example.com:6379/",
        "ftp://example.com/file",
        "file:///etc/passwd",
        "http://user:pass@example.com/",
    ],
)
def test_validate_url_rejects_internal_and_odd_targets(url):
    with pytest.raises(UnsafeURLError):
        validate_url(url)


def test_guard_blocks_dns_rebinding(monkeypatch):
    # Validation saw a public IP, but at connect time the name resolves to loopback.
    monkeypatch.setattr(
        socket, "getaddrinfo",
        lambda *a, **k: [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("127.0.0.1", 80))],
    )
    with safe_http.guarded(), pytest.raises(UnsafeURLError):
        safe_http.urllib3_connection.create_connection(("rebind.example", 80))


def test_redirect_to_internal_host_is_blocked(monkeypatch):
    monkeypatch.setattr(safe_http, "resolve_public", lambda host, port: (_ for _ in ()).throw(UnsafeURLError("x")) if host == "127.0.0.1" else "93.184.216.34")

    class Response:
        status_code = 302
        headers = {"Location": "http://127.0.0.1:80/admin"}

        def close(self):
            pass

    class Session:
        def get(self, url, **kwargs):
            assert kwargs["allow_redirects"] is False
            return Response()

    with pytest.raises(UnsafeURLError):
        safe_http.get_following_redirects(Session(), "http://public.example/", timeout=1)


def test_link_endpoint_returns_uniform_error(client):
    messages = set()
    for url in ["http://127.0.0.1:8000/api/health", "http://169.254.169.254/", "https://example.com:22/x"]:
        res = client.post("/api/read-product-link", json={"url": url})
        assert res.status_code == 400
        messages.add(res.json()["detail"])
    assert len(messages) == 1


# --- S2: CORS -------------------------------------------------------------

def test_cors_rejects_unknown_origin(client):
    res = client.options(
        "/api/simulate",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"},
    )
    assert "access-control-allow-origin" not in res.headers


def test_cors_allows_configured_origin(client):
    res = client.options(
        "/api/simulate",
        headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "POST"},
    )
    assert res.headers.get("access-control-allow-origin") == "http://localhost:3000"
    assert "access-control-allow-credentials" not in res.headers


# --- S3: rate limit -------------------------------------------------------

def test_simulate_is_rate_limited(client, payload):
    codes = [client.post("/api/simulate", json=payload).status_code for _ in range(6)]
    assert codes[:5] == [200] * 5
    assert codes[5] == 429


# --- S4: input limits -----------------------------------------------------

@pytest.mark.parametrize(
    "mutate",
    [
        lambda p: p.update(description="x" * 4001),
        lambda p: p.update(productName="x" * 121),
        lambda p: p.update(price=20_000_000),
        lambda p: p.update(category="ayakkabi"),
        lambda p: p.update(images=["https://example.com/a.jpg"] * 7),
        lambda p: p["features"].update(colors=["c"] * 21),
        lambda p: p["targetAudience"].update(gender="g" * 41),
    ],
)
def test_oversized_or_invalid_input_is_rejected(client, payload, mutate):
    mutate(payload)
    assert client.post("/api/analyze-input", json=payload).status_code == 422


def test_infinite_price_is_rejected(client, payload):
    import json

    body = json.dumps(payload).replace('"price": 349.9', '"price": 1e400')
    res = client.post("/api/analyze-input", content=body, headers={"Content-Type": "application/json"})
    assert res.status_code == 422


def test_unknown_feature_keys_are_dropped():
    from app.models.product import SimulationRequest
    from tests.conftest import VALID_REQUEST

    data = {**VALID_REQUEST, "features": {"fabric": "pamuk", "ignore_previous_instructions": "x"}}
    assert "ignore_previous_instructions" not in SimulationRequest.model_validate(data).raw_features()


def test_body_size_limit(client):
    res = client.post(
        "/api/analyze-input",
        content=b"{}",
        headers={"Content-Type": "application/json", "Content-Length": str(50 * 1024 * 1024)},
    )
    assert res.status_code == 413


# --- S6 / S9: no internal details leak -----------------------------------

def test_response_has_request_id_and_no_internal_prompt(client, payload):
    res = client.post("/api/simulate", json=payload)
    assert res.status_code == 200
    assert res.headers.get("x-request-id")
    body = res.json()
    assert all("aiRoleplayPrompt" not in p for p in body["allPersonas"])


def test_unhandled_errors_are_generic(monkeypatch, payload):
    from fastapi.testclient import TestClient

    from app import main
    from app.api import simulate

    def boom(_):
        raise RuntimeError("secret internal detail")

    monkeypatch.setattr(simulate, "run_agentic_simulation", boom)
    res = TestClient(main.create_app(), raise_server_exceptions=False).post("/api/simulate", json=payload)
    assert res.status_code == 500
    assert "secret" not in res.text
    assert res.json()["requestId"]


# --- S10: docs hidden in production --------------------------------------

def test_docs_hidden_in_production(monkeypatch):
    from fastapi.testclient import TestClient

    from app import main

    monkeypatch.setenv("ENV", "production")
    assert TestClient(main.create_app()).get("/openapi.json").status_code == 404
