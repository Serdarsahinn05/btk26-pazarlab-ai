"""Link reader v2 (Faz 14): saved pages, page HTML / text input, ratings as social proof.

Every tests/fixtures/links/<name>.html or .txt with a <name>.expected.json beside it is read and
compared field by field (only the fields listed). To add a real page: save it from the browser
("Farklı kaydet → Yalnızca HTML"), put it here and write the expected fields. No test goes to a live site.
"""

import json
from pathlib import Path

import pytest

from app.models.product import SimulationRequest
from app.services.link_reader import read_product_html, read_text
from app.services.link_reader.fetch import HTTPFetcher
from app.services.normalization_service import normalize_product, social_proof

FIXTURES = Path(__file__).parent / "fixtures" / "links"
CASES = sorted(p for p in FIXTURES.iterdir() if p.suffix in {".html", ".txt"} and p.with_suffix(".expected.json").exists())


@pytest.fixture(autouse=True)
def _no_fetching(monkeypatch):
    def refuse(*_args, **_kwargs):
        raise AssertionError("a saved page must never trigger a network fetch")

    monkeypatch.setattr(HTTPFetcher, "fetch", refuse)


@pytest.mark.parametrize("page", CASES, ids=[p.name for p in CASES])
def test_saved_page(page):
    spec = json.loads(page.with_suffix(".expected.json").read_text(encoding="utf-8"))
    content = page.read_text(encoding="utf-8")
    result = (read_product_html(content, spec["url"]) if page.suffix == ".html" else read_text(content, spec["url"])).model_dump()
    for key, expected in spec["expect"].items():
        if key == "features":
            assert {k: result["features"].get(k) for k in expected} == expected
        else:
            assert result[key] == expected, key


def test_there_are_saved_pages():
    assert len(CASES) >= 4


def test_page_endpoint_reads_html_and_text(client):
    html = (FIXTURES / "jsonld_marketplace.html").read_text(encoding="utf-8")
    data = client.post("/api/read-product-page", json={"html": html, "url": "https://www.example.com/p"}).json()
    assert data["title"] == "Saten Midi Elbise Siyah" and data["rating"] == 4.6 and data["url"] == "https://www.example.com/p"
    text = (FIXTURES / "pasted_page.txt").read_text(encoding="utf-8")
    data = client.post("/api/read-product-page", json={"text": text}).json()
    assert data["price"] == 749.9 and data["source"] == "text"


@pytest.mark.parametrize("body", [{}, {"html": "<p>x</p>", "text": "x"}, {"html": "   "}])
def test_page_endpoint_wants_exactly_one_source(client, body):
    assert client.post("/api/read-product-page", json=body).status_code == 422


def test_page_endpoint_drops_odd_urls(client):
    data = client.post("/api/read-product-page", json={"text": "Bir ürün adı burada yazıyor\n499 TL", "url": "javascript:alert(1)"}).json()
    assert data["url"] == ""


def test_mcp_link_tool_returns_a_dict(monkeypatch):
    """The MCP tool calls model_dump(); the reader returned a dataclass before Faz 14 and the tool would crash."""
    from app.mcp_server import read_link

    html = (FIXTURES / "jsonld_marketplace.html").read_text(encoding="utf-8")
    monkeypatch.setattr(HTTPFetcher, "fetch", lambda self, url: (html, "test", []))
    monkeypatch.setattr("app.services.link_reader.reader.ProductLinkReader._validate_url", staticmethod(lambda url: url))
    data = read_link("https://www.example.com/p")
    assert data["title"] == "Saten Midi Elbise Siyah" and data["category"] == "elbise"


# ------------------------------------------------------------------ social proof

def test_social_proof_shape():
    assert social_proof(None, 5000) == 0
    assert social_proof(4.0, 5000) == 0  # neutral rating
    assert social_proof(5.0, 1000) == pytest.approx(1)
    assert social_proof(3.0, 1000) == pytest.approx(-1)
    assert 0 < social_proof(5.0, 10) < social_proof(5.0, 100) < social_proof(5.0, 1000)


def test_rating_moves_trust_only_when_given(payload):
    plain = SimulationRequest.model_validate(payload)
    loved = SimulationRequest.model_validate({**payload, "rating": 4.8, "reviewCount": 2000})
    disliked = SimulationRequest.model_validate({**payload, "rating": 3.1, "reviewCount": 2000})
    trust = lambda r: normalize_product(r).brand_trust  # noqa: E731
    assert trust(disliked) < trust(plain) < trust(loved)


def test_rating_raises_buyers_end_to_end(client, payload):
    plain = client.post("/api/simulate", json=payload).json()["estimatedBuyers"]
    loved = client.post("/api/simulate", json={**payload, "rating": 4.9, "reviewCount": 5000}).json()["estimatedBuyers"]
    assert loved > plain


def test_competitors_become_typed_rows():
    from app.services.graph import competitors_for_response

    rows = competitors_for_response([
        {"title": "Basic Tişört Siyah", "price": "₺299,90", "source": "Örnek Mağaza", "link": "https://example.com/a"},
        {"title": "Oversize Tişört", "price": "1.049,00 TL", "source": "", "link": "javascript:alert(1)"},
        {"title": "", "price": "10 TL"},
    ])
    assert [(r.title, r.price, r.source, r.link) for r in rows] == [
        ("Basic Tişört Siyah", 299.9, "Örnek Mağaza", "https://example.com/a"),
        ("Oversize Tişört", 1049.0, None, None),
    ]
