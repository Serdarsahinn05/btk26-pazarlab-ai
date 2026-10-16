"""Faz 12b: engine v2 — town residents, willingness to pay, logistic decisions, Monte Carlo."""

import time

import pytest

from app.models.product import SimulationRequest
from app.services.engine import MONTE_CARLO_RUNS
from app.services.simulation_service import run_simulation, simulate_core
from tests.conftest import VALID_REQUEST


def _core(**overrides):
    return simulate_core(SimulationRequest.model_validate({**VALID_REQUEST, **overrides}))


def _persona(core, name):
    return next(p for p in core["all_personas"] if p.name == name).purchase_probability


def test_b15_lower_price_brings_more_buyers():
    """v1 lost buyers when the price was halved; v2 must not (except the 'too cheap' zone below 60 %)."""
    base = VALID_REQUEST["price"]
    buyers = [_core(price=round(base * f, 2))["estimated_buyers"] for f in (0.6, 0.8, 1.0, 1.2, 1.5, 2.0)]
    assert buyers == sorted(buyers, reverse=True), buyers
    assert buyers[0] - buyers[-1] > 50


def test_price_sensitive_residents_react_most_to_price():
    cheap, dear = _core(price=VALID_REQUEST["price"] * 0.7), _core(price=VALID_REQUEST["price"] * 1.4)
    drop = {n: _persona(cheap, n) - _persona(dear, n) for n in ("Fiyat Hassas Alici", "Premium Alici")}
    assert drop["Fiyat Hassas Alici"] > drop["Premium Alici"] > 0


def test_only_quality_minded_residents_distrust_a_very_low_price():
    very_cheap, fair = _core(price=VALID_REQUEST["price"] * 0.2), _core(price=VALID_REQUEST["price"] * 0.7)
    assert _persona(very_cheap, "Kalite Odakli Alici") < _persona(fair, "Kalite Odakli Alici")
    assert _persona(very_cheap, "Fiyat Hassas Alici") >= _persona(fair, "Fiyat Hassas Alici") - 0.01


def test_price_risk_is_the_share_of_the_town_priced_out():
    risks = [_core(price=VALID_REQUEST["price"] * f)["normalized"].price_risk for f in (0.5, 1.0, 2.0)]
    assert risks == sorted(risks) and risks[0] < 0.2 < risks[-1]
    norm = _core()["normalized"]
    assert norm.price_fit == pytest.approx(1 - norm.price_risk)


def test_target_audience_shifts_who_buys():
    from app.services.engine import run_town
    from app.services.normalization_service import get_normalized_weights, normalize_product

    def by_gender(gender, category="tisort"):
        req = SimulationRequest.model_validate({**VALID_REQUEST, "category": category,
                                                "targetAudience": {**VALID_REQUEST["targetAudience"], "gender": gender}})
        town = run_town(req, normalize_product(req), get_normalized_weights(req.category, req.purchase_motivation), {}, 1.0, 7)
        women = [p for r, p in zip(town["residents"], town["probability"]) if r["gender"] == "kadin"]
        men = [p for r, p in zip(town["residents"], town["probability"]) if r["gender"] == "erkek"]
        return sum(women) / len(women) - sum(men) / len(men)

    assert by_gender("kadin") > 0.05 and by_gender("erkek") < -0.05
    assert abs(by_gender("unisex")) < 0.03
    assert abs(by_gender("kadin", category="telefon")) < 0.03  # tech categories ignore gender (applicableAudienceFields)


def test_same_crowd_at_every_price_and_deterministic():
    a, b = _core(), _core()
    assert a["decision_counts"] == b["decision_counts"] and a["buyers_range"] == b["buyers_range"]
    assert sum(_core(price=500)["decision_counts"].values()) == 500


def test_response_carries_engine_version_and_range():
    res = run_simulation(SimulationRequest.model_validate(VALID_REQUEST))
    assert res.engine_version == 2
    assert res.buyers_range.runs == MONTE_CARLO_RUNS
    assert res.buyers_range.low <= res.estimated_buyers <= res.buyers_range.high
    assert sum(p.buyer_count for p in res.all_personas) == pytest.approx(res.estimated_buyers, abs=6)


def test_fast_enough_for_price_sweeps():
    start = time.perf_counter()
    for f in (0.6, 0.8, 1.0, 1.2, 1.4):
        _core(price=VALID_REQUEST["price"] * f)
    assert time.perf_counter() - start < 1.0
