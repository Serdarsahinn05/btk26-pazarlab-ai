"""Faz 12c: friendship network, word of mouth, segments, representatives and what-if improvements."""

import time
from collections import Counter

import pytest

from app.models.product import SimulationRequest
from app.services import engine
from app.services.simulation_service import run_simulation, simulate_core
from app.services.town import load_town
from app.services.town_insights import explain
from tests.conftest import VALID_REQUEST

RESIDENTS = load_town()["residents"]


def _run(**overrides):
    return run_simulation(SimulationRequest.model_validate({**VALID_REQUEST, **overrides}))


def test_friendship_graph_is_symmetric_and_homophilous():
    by_id = {r["id"]: r for r in RESIDENTS}
    degrees = [len(r["friends"]) for r in RESIDENTS]
    assert min(degrees) >= 3 and max(degrees) <= 9
    assert all(r["id"] in by_id[f]["friends"] and f != r["id"] for r in RESIDENTS for f in r["friends"])
    same = sum(by_id[f]["cityType"] == r["cityType"] for r in RESIDENTS for f in r["friends"]) / sum(degrees)
    shares = Counter(r["cityType"] for r in RESIDENTS)
    random_baseline = sum((c / len(RESIDENTS)) ** 2 for c in shares.values())
    assert same > random_baseline + 0.1


def test_word_of_mouth_adds_buyers_week_by_week(monkeypatch):
    with_social = simulate_core(SimulationRequest.model_validate(VALID_REQUEST))
    curve = with_social["adoption_curve"]
    assert len(curve) == 1 + engine.SOCIAL_WEEKS and curve == sorted(curve) and curve[-1] > curve[0]
    assert abs(curve[-1] - with_social["estimated_buyers"]) <= 2
    monkeypatch.setattr(engine, "SOCIAL_WEIGHT", 0.0)
    without = simulate_core(SimulationRequest.model_validate(VALID_REQUEST))
    assert without["estimated_buyers"] < with_social["estimated_buyers"]
    assert len(set(without["adoption_curve"])) == 1  # nobody converts through friends


def test_segments_cover_the_town_and_ignore_gender_for_unisex_products():
    segments = _run().segments
    assert set(segments) == {"age", "gender", "incomeLevel", "cityType"}
    for rows in segments.values():
        assert sum(r.residents for r in rows) == 500
    women, men = (next(r.buy_rate for r in segments["gender"] if r.label == g) for g in ("Kadın", "Erkek"))
    assert abs(women - men) < 0.05
    women_target = _run(targetAudience={**VALID_REQUEST["targetAudience"], "gender": "kadin"}).segments["gender"]
    assert women_target[0].label == "Kadın" and women_target[0].buy_rate > women_target[1].buy_rate + 0.05


def test_representatives_show_variety_and_reasons():
    cast = _run().representatives
    assert len(cast) == 5 and len({r.persona for r in cast}) == 5
    assert {"buy", "skip"} <= {r.decision for r in cast}
    for r in cast:
        assert r.reason.startswith({"buy": "Aldı", "watch": "Sepete ekledi", "skip": "Almadı"}[r.decision])
        assert r.story.startswith(f"{r.age} yaşında")


@pytest.mark.parametrize(("decision", "expected"), [
    ("buy", "Aldı: fiyat bütçesine uygun, en çok kalite hoşuna gidiyor."),
    ("skip", "Almadı: bu kadar ucuz olmasından şüpheleniyor."),
    ("watch", "Sepete ekledi ama bekliyor: fiyat bütçesine uygun, bu kadar ucuz olmasından şüpheleniyor."),
])
def test_explanations_follow_the_decision(decision, expected):
    parts = {"price": 0.9, "fit": 0.5, "cheap": -0.4, "audience": 0.0, "social": 0.0, "motivation": 0.0,
             "bestFeature": "qualityScore", "worstFeature": "brandTrust", "wtp": 500.0}
    assert explain(parts, decision) == expected


def test_improvements_try_only_changes_that_make_sense():
    weak = _run(commerce={"shippingDays": 6, "returnAvailable": False, "warranty": False}).improvements
    keys = [i.key for i in weak]
    assert weak and all(i.delta_buyers > 0 or i.key == "price_up_10" for i in weak)
    assert {"shipping_2_days", "add_returns", "add_warranty"} & set(keys)
    assert [i.delta_buyers for i in weak] == sorted((i.delta_buyers for i in weak), reverse=True)
    strong = _run(commerce={"shippingDays": 1, "returnAvailable": True, "warranty": True}).improvements
    assert not {"shipping_2_days", "add_returns", "add_warranty"} & {i.key for i in strong}
    for i in strong:
        if i.key == "price_up_10":
            assert i.delta_revenue > 0


def test_api_returns_the_new_fields(client, payload):
    data = client.post("/api/simulate", json=payload).json()
    assert len(data["adoptionCurve"]) == 4 and data["segments"]["age"] and len(data["representatives"]) == 5
    assert "improvements" in data and "buyRate" in data["segments"]["age"][0]


def test_full_simulation_with_what_ifs_stays_fast():
    start = time.perf_counter()
    _run()
    assert time.perf_counter() - start < 1.5
