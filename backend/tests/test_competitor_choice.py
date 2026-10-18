"""Faz 21: the seller's product against rivals on the same town (multinomial logit, no AI)."""

import time

import pytest

from app.models.competitor import CompetitorInput
from app.models.product import SimulationRequest
from app.services import categories, llm_client
from app.services.competitor_choice import competitor_choice
from app.services.engine import run_choice, utilities
from app.services.input_analysis_service import deterministic_analysis
from app.services.normalization_service import normalize_product
from app.services.simulation_service import simulate_core, town_context


@pytest.fixture(autouse=True)
def _no_llm(monkeypatch):
    def fail(*args, **kwargs):
        raise AssertionError("competitor choice must not call the LLM")

    monkeypatch.setattr(llm_client, "generate_json", fail)
    monkeypatch.setattr(llm_client, "generate_text", fail)


def _own(payload) -> SimulationRequest:
    return SimulationRequest.model_validate(payload)


def _shares(result):
    return {o["key"]: o["share"] for o in result["options"]}


def test_an_identical_rival_gets_the_same_share(payload):
    rival = CompetitorInput(name="Aynı ürün başka satıcı", price=payload["price"])
    result = competitor_choice(_own(payload), [rival])
    own, other = result["options"]
    # Same utilities, independent noise: equal within the Monte Carlo band.
    assert abs(own["share"] - other["share"]) <= max(own["high"] - own["low"], 0.03)
    assert other["equalQuality"] is True
    assert other["reasons"] == []
    total = sum(o["share"] for o in result["options"]) + result["none"]["share"]
    assert total == pytest.approx(1.0, abs=0.002)


def test_one_option_is_exactly_the_first_week_of_the_town(payload):
    """'None' agrees with the single-product run: alone, the product gets its direct (week 1) buyers."""
    own = categories.anchored(_own(payload))
    context = town_context(own)
    product = normalize_product(own, deterministic_analysis(own).signals)
    bases, _, _ = utilities(own, product, context["weights"], context["preferred"])
    runs = run_choice([bases], context["market_relevance"], context["seed"])["runs"]
    week_one = simulate_core(own, deterministic_analysis(own))["adoption_curve"][0]
    assert round(sum(r[0] for r in runs) / len(runs)) == week_one


def test_a_cheaper_rival_takes_more_until_it_looks_too_cheap(payload):
    """Monotone above the 'too cheap' line (60 % of the going price), where quality-minded residents grow suspicious."""
    own = _own(payload)
    reference = categories.reference_price(own.category, own.market_price, own.price)
    prices = [round(reference * f, 2) for f in (1.6, 1.3, 1.0, 0.8, 0.65)]
    own_shares = [_shares(competitor_choice(own, [CompetitorInput(name="Rakip ürün", price=p)]))["own"] for p in prices]
    assert own_shares == sorted(own_shares, reverse=True)
    assert own_shares[0] > own_shares[-1]


def test_reasons_assumptions_and_breakdown(payload):
    own = _own(payload)
    rivals = [
        CompetitorInput(name="Ucuz rakip ürün", price=round(own.price * 0.75, 2)),
        CompetitorInput(name="Güvenli rakip ürün", price=own.price, rating=4.9, reviewCount=12000, warranty=True,
                        description="Organik pamuk, kalın dokulu kumaş, iki yıl garanti, ölçü tablosu ve yıkama talimatı açıkça belirtilmiş."),
    ]
    result = competitor_choice(own, rivals)
    cheap, trusted = result["options"][1:]
    assert cheap["reasons"][0]["key"] == "price"
    assert trusted["reasons"][0]["key"] == "fit"
    assert "garanti" not in trusted["assumed"] and "mağaza puanı" not in trusted["assumed"]
    assert "kargo süresi" in trusted["assumed"] and trusted["equalQuality"] is False
    assert len(result["personas"]) == 12
    for row in result["personas"]:
        assert len(row["shares"]) == 4 and sum(row["shares"]) == pytest.approx(1.0, abs=0.01)
    for change in result["bestChanges"]:
        assert change["deltaBuyers"] > 0 or change["key"] == "price_up_10"


def test_deterministic_and_fast(payload):
    own = _own(payload)
    rivals = [CompetitorInput(name=f"Rakip ürün {i}", price=own.price * f) for i, f in enumerate((0.8, 1.0, 1.2), start=1)]
    started = time.perf_counter()
    first = competitor_choice(own, rivals)
    elapsed = time.perf_counter() - started
    assert first == competitor_choice(own, rivals)
    assert elapsed < 1.5


def test_api_saves_rivals_with_the_result(client, payload):
    sim_id = client.post("/api/simulate", json=payload).json()["simulationId"]
    assert client.get(f"/api/competitor-choice/{sim_id}").json() == {"competitors": [], "result": None}

    body = {"simulationId": sim_id, "competitors": [{"name": "Rakip tişört", "price": 299.9, "url": "https://example.com/p/1"}]}
    posted = client.post("/api/competitor-choice", json=body)
    assert posted.status_code == 200
    data = posted.json()
    assert [o["key"] for o in data["result"]["options"]] == ["own", "c1"]

    # A shared link shows the same rivals and the same share.
    assert client.get(f"/api/competitor-choice/{sim_id}").json() == data
    assert client.get(f"/api/simulations/{sim_id}").json()["competitors"] == data["competitors"]


def test_api_validation_and_unknown_result(client, payload):
    sim_id = client.post("/api/simulate", json=payload).json()["simulationId"]
    too_many = {"simulationId": sim_id, "competitors": [{"name": f"Rakip {i}", "price": 100} for i in range(4)]}
    assert client.post("/api/competitor-choice", json=too_many).status_code == 422
    assert client.post("/api/competitor-choice", json={"simulationId": sim_id, "competitors": [{"name": "Rakip", "price": 0}]}).status_code == 422
    unknown = {"simulationId": "aaaaaaaaaaaa", "competitors": [{"name": "Rakip ürün", "price": 100}]}
    assert client.post("/api/competitor-choice", json=unknown).status_code == 404
    assert client.get("/api/competitor-choice/../../etc").status_code == 404
