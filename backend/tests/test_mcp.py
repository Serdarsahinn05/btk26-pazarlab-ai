"""Faz 11: PazarLab as an MCP server (claude.ai custom connector)."""

import asyncio
import copy
import json

import pytest
from fastapi.testclient import TestClient
from mcp import Client

from app import mcp_server
from app.services import llm_client
from tests.conftest import VALID_REQUEST

PRODUCT = {k: v for k, v in VALID_REQUEST.items() if k != "images"}
TOOLS = {"list_categories", "list_personas", "read_product_link", "simulate_product", "price_sweep", "compare_variants", "get_simulation"}


def call(name, args=None):
    async def run():
        async with Client(mcp_server.mcp) as client:
            return await client.call_tool(name, args or {})

    return asyncio.run(run())


@pytest.fixture(autouse=True)
def _mcp_env(monkeypatch):
    mcp_server.rate_limit.clear()
    monkeypatch.delenv("MCP_ACCESS_KEY", raising=False)


@pytest.fixture
def no_network_ai(monkeypatch):
    """A configured Gemini key, but any model call fails the test: MCP tools must not spend server-side AI."""
    monkeypatch.setenv("GEMINI_API_KEY", "real-looking-key")

    def forbidden(*args, **kwargs):
        raise AssertionError("MCP tool called the server's AI")

    monkeypatch.setattr(llm_client.urllib.request, "urlopen", forbidden)


def test_tools_are_listed_with_turkish_metadata():
    async def run():
        async with Client(mcp_server.mcp) as client:
            return await client.list_tools()

    tools = {t.name: t for t in asyncio.run(run()).tools}
    assert set(tools) == TOOLS
    assert tools["simulate_product"].title == "Simülasyonu çalıştır"
    schema = tools["simulate_product"].input_schema
    assert "product" in schema["properties"]


def test_list_categories_and_personas():
    categories = call("list_categories").structured_content["categories"]
    assert len(categories) == 13 and {"id", "label", "averagePrice", "fields"} <= set(categories[0])
    personas = call("list_personas").structured_content["personas"]
    assert len(personas) == 12 and personas[1]["name"] == "Trend Takipçisi" and personas[1]["rolePrompt"]


def test_simulate_runs_without_server_ai_and_is_saved(no_network_ai, monkeypatch):
    monkeypatch.setenv("PUBLIC_SITE_URL", "https://pazarlab.example.com/")
    result = call("simulate_product", {"product": PRODUCT})
    assert not result.is_error, result.content
    data = result.structured_content
    assert data["simulatedConsumers"] == 500 and 0 <= data["overallScore"] <= 100
    assert data["personas"][0]["name"] in {p["name"] for p in call("list_personas").structured_content["personas"]}
    assert data["siteUrl"] == f"https://pazarlab.example.com/dashboard?r={data['simulationId']}"
    stored = call("get_simulation", {"simulation_id": data["simulationId"]}).structured_content
    assert stored["overallScore"] == data["overallScore"] and stored["productName"] == PRODUCT["productName"]


def test_price_sweep_and_compare(no_network_ai):
    sweep = call("price_sweep", {"product": PRODUCT}).structured_content
    assert len(sweep["points"]) == 9 and sweep["bestRevenue"]["price"] > 0
    variant = copy.deepcopy(PRODUCT)
    variant["commerce"]["warranty"] = True
    cmp = call("compare_variants", {"base": PRODUCT, "variant": variant}).structured_content
    assert cmp["variant"]["overallScore"] >= cmp["base"]["overallScore"]
    assert cmp["base"]["topPersona"] and "Takipcisi" not in cmp["base"]["topPersona"]  # display name, not the id


def test_bad_input_and_unknown_ids_are_tool_errors():
    assert call("simulate_product", {"product": {**PRODUCT, "category": "mobilya"}}).is_error
    assert call("get_simulation", {"simulation_id": "../etc/passwd"}).is_error
    link = call("read_product_link", {"url": "http://127.0.0.1/admin"})  # SSRF protection applies here too
    assert link.is_error and "okunamadı" in json.dumps([c.model_dump() for c in link.content], ensure_ascii=False)


def test_shared_rate_limit(monkeypatch):
    monkeypatch.setenv("MCP_RATE_LIMIT_PER_MIN", "2")
    assert not call("list_categories").is_error
    assert not call("list_personas").is_error
    assert call("list_categories").is_error


# --- HTTP: mounted into the FastAPI app ---------------------------------------

RPC_LIST = {"jsonrpc": "2.0", "id": 1, "method": "tools/list", "params": {}}
HEADERS = {"Accept": "application/json, text/event-stream", "Content-Type": "application/json"}


@pytest.fixture
def http(monkeypatch):
    monkeypatch.setenv("MCP_ALLOWED_HOSTS", "testserver")
    from app.main import create_app

    with TestClient(create_app()) as client:  # `with` runs the lifespan that starts the MCP session manager
        yield client


def test_http_endpoint_serves_mcp_next_to_the_api(http):
    res = http.post("/mcp", json=RPC_LIST, headers=HEADERS)
    assert res.status_code == 200 and {t["name"] for t in res.json()["result"]["tools"]} == TOOLS
    assert http.get("/api/health").status_code == 200
    assert http.get("/does-not-exist").status_code == 404


def test_http_access_key(http, monkeypatch):
    monkeypatch.setenv("MCP_ACCESS_KEY", "s3cret")
    assert http.post("/mcp", json=RPC_LIST, headers=HEADERS).status_code == 401
    assert http.post("/mcp?key=wrong", json=RPC_LIST, headers=HEADERS).status_code == 401
    assert http.post("/mcp?key=s3cret", json=RPC_LIST, headers=HEADERS).status_code == 200


def test_http_rejects_unknown_host(http):
    res = http.post("/mcp", json=RPC_LIST, headers={**HEADERS, "Host": "evil.example"})
    assert res.status_code == 421
