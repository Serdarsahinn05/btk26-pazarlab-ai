"""Live draft check (Faz 13b): estimated score and per-field gains for a half-filled form."""

DRAFT = {
    "category": "tisort",
    "price": 349.9,
    "description": "Yüzde yüz pamuk, nefes alan kumaş, regular kesim, günlük kullanım için basic tişört; yıkamada çekmez.",
    "features": {"fabric": "pamuk"},
}


def test_draft_without_price_has_no_score(client):
    data = client.post("/api/draft-check", json={"category": "airfryer"}).json()
    assert data["score"] is None and data["gains"] == []


def test_draft_lists_empty_fields_with_gains(client):
    data = client.post("/api/draft-check", json=DRAFT).json()
    assert 0 < data["score"] <= 100 and data["descriptionWords"] == 15 and data["cap"] is None
    fields = [g["field"] for g in data["gains"]]
    assert "fabric" not in fields, "a filled field brings nothing"
    assert {"sizeRange", "warranty", "returnAvailable"} <= set(fields)
    deltas = [g["delta"] for g in data["gains"]]
    assert deltas == sorted(deltas, reverse=True) and min(deltas) >= 0.3


def test_gain_matches_filling_the_field(client):
    """A gain is the effect of that field alone: filling it raises the score by about that much."""
    gains = {g["field"]: g["delta"] for g in client.post("/api/draft-check", json=DRAFT).json()["gains"]}
    filled = {**DRAFT, "features": {**DRAFT["features"], "sizeRange": "S-XL"}}
    after = client.post("/api/draft-check", json=filled).json()
    before = client.post("/api/draft-check", json=DRAFT).json()
    assert "sizeRange" not in {g["field"] for g in after["gains"]}
    assert abs((after["score"] - before["score"]) - gains["sizeRange"]) <= 1  # scores are rounded


def test_draft_is_deterministic_and_loose(client):
    first = client.post("/api/draft-check", json=DRAFT).json()
    assert client.post("/api/draft-check", json=DRAFT).json() == first
    # No name and a 3-word description would fail /api/simulate, the draft check still answers.
    assert client.post("/api/draft-check", json={**DRAFT, "productName": "", "description": "Pamuk tişört"}).status_code == 200
    assert client.post("/api/draft-check", json={**DRAFT, "category": "televizyon"}).status_code == 422


def test_capped_draft_only_suggests_what_lifts_the_cap(client):
    data = client.post("/api/draft-check", json={**DRAFT, "description": "Pamuklu basic tişört"}).json()
    assert data["cap"] and data["cap"]["limit"] <= 55 and data["cap"]["reason"]
    assert data["score"] <= data["cap"]["limit"]
    # Filling a field cannot get past the cap, so no field is offered; the reason and the warnings say what to fix.
    assert not {g["field"] for g in data["gains"]} & {"fit", "sizeRange", "warranty", "season"}
    assert data["warnings"]


def test_same_draft_is_answered_from_memory(client, monkeypatch):
    from app.api import draft

    draft._check.cache_clear()
    calls = []
    real = draft.simulate_core
    monkeypatch.setattr(draft, "simulate_core", lambda *a, **k: calls.append(1) or real(*a, **k))
    first = client.post("/api/draft-check", json=DRAFT).json()
    runs = len(calls)
    assert runs > 1
    assert client.post("/api/draft-check", json=DRAFT).json() == first
    assert len(calls) == runs, "an unchanged draft runs no simulation"
    client.post("/api/draft-check", json={**DRAFT, "price": 299.9})
    assert len(calls) > runs
