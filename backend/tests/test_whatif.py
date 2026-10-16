import pytest

from app.services import llm_client


@pytest.fixture(autouse=True)
def _no_llm(monkeypatch):
    # What-if endpoints must never call Gemini (they run 9+ simulations per request).
    def fail(*args, **kwargs):
        raise AssertionError("LLM called from a what-if endpoint")

    monkeypatch.setattr(llm_client, "generate_json", fail)
    monkeypatch.setattr(llm_client, "generate_text", fail)


def test_price_sweep_shape(client, payload):
    body = client.post("/api/price-sweep", json=payload).json()
    points = body["points"]
    assert [p["factor"] for p in points] == [0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4]
    assert points[4]["price"] == pytest.approx(payload["price"])
    assert all(0 <= p["estimatedBuyers"] <= 500 for p in points)
    assert body["bestRevenue"]["revenue"] == max(p["revenue"] for p in points)
    assert body["bestBuyers"]["estimatedBuyers"] == max(p["estimatedBuyers"] for p in points)


def test_sweep_uses_the_same_crowd_at_every_price(client, payload):
    # Price is excluded from the seed, so repeating the sweep is exact and points
    # differ only by price (the model's price fit peaks near the category average,
    # so demand is not monotonic; see IMPROVEMENTS B15).
    first = client.post("/api/price-sweep", json=payload).json()
    shifted = client.post("/api/price-sweep", json={**payload, "price": payload["price"] * 0.9}).json()
    assert first == client.post("/api/price-sweep", json=payload).json()
    assert shifted["points"][4]["estimatedBuyers"] == first["points"][3]["estimatedBuyers"]


def test_sweep_midpoint_matches_simulation(client, payload, monkeypatch):
    from app.api import simulate
    from app.services.simulation_service import run_simulation

    monkeypatch.setattr(simulate, "run_agentic_simulation", run_simulation)
    sim = client.post("/api/simulate", json=payload).json()
    sweep = client.post("/api/price-sweep", json={**payload, "inputAnalysis": sim["inputAnalysis"]}).json()
    assert sweep["points"][4]["estimatedBuyers"] == sim["estimatedBuyers"]


def test_compare_identical_and_changed_variant(client, payload):
    same = client.post("/api/compare", json={"base": payload, "variant": payload}).json()
    assert same["base"] == same["variant"]

    variant = {**payload, "price": payload["price"] * 0.5, "commerce": {**payload["commerce"], "warranty": True, "warrantyMonths": 24}}
    diff = client.post("/api/compare", json={"base": payload, "variant": variant}).json()
    assert diff["variant"]["price"] == pytest.approx(payload["price"] * 0.5)
    assert diff["variant"] != diff["base"]


def test_whatif_validates_input(client, payload):
    assert client.post("/api/price-sweep", json={**payload, "price": -1}).status_code == 422
    assert client.post("/api/compare", json={"base": payload}).status_code == 422


def test_shared_result_includes_request_without_images(client, payload):
    payload["images"] = ["data:image/jpeg;base64,AAAA"]
    sim_id = client.post("/api/simulate", json=payload).json()["simulationId"]
    stored = client.get(f"/api/simulations/{sim_id}").json()
    assert stored["request"]["productName"] == payload["productName"]
    assert stored["request"]["images"] == []
