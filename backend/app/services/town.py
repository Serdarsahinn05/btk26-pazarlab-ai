"""The synthetic town (Faz 12a): 500 residents with a life story, demographics and Big Five personality.

`data/town.json` holds only who a resident is; shopping traits are derived here at run time from three
layers: the shopping persona (range centre), the personality (Big Five) and demographics, plus the
resident's own small offsets stored in the file. Changing a coefficient below therefore never needs a
regenerated town. Regenerate the file with `python scripts/generate_town.py` (deterministic).

Every coefficient is an ASSUMPTION inspired by consumer-psychology findings (e.g. conscientiousness →
more research before buying, openness → novelty seeking, neuroticism → risk aversion). They are
documented here so they can be calibrated against real data later (Faz 19), not because they are measured.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.services.normalization_service import load_persona_data
from app.utils.math_utils import clamp

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
TRAITS = (
    "priceSensitivity", "qualityExpectation", "trendSensitivity", "brandTrustNeed", "detailNeed",
    "impulsiveness", "seasonSensitivity", "shippingSensitivity", "targetFitSensitivity", "noveltySeeking",
)
# How far a derived trait may leave its persona's range: the persona stays recognisable.
RANGE_MARGIN = 0.12


@lru_cache(maxsize=1)
def load_town() -> dict[str, Any]:
    with (DATA_DIR / "town.json").open(encoding="utf-8") as file:
        return json.load(file)


@lru_cache(maxsize=1)
def _persona_ranges() -> dict[str, dict[str, list[float]]]:
    return {p["name"]: p["ranges"] for p in load_persona_data()["personaTypes"]}


def derive_traits(resident: dict[str, Any]) -> dict[str, float]:
    """Shopping traits in [0, 1] for one resident (see the module docstring for what the numbers mean)."""
    ranges = _persona_ranges()[resident["persona"]]
    b5 = {k: v - 0.5 for k, v in resident["bigFive"].items()}  # centred: −0.5 … +0.5
    o, c, e, a, n = (b5[k] for k in ("openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"))
    income = resident["incomeLevel"]
    age = resident["age"]
    kids = resident["household"] in {"esi_ve_cocuklari", "tek_ebeveyn"}

    adjust = {
        "priceSensitivity": (0.12 if income == "low" else -0.10 if income == "high" else 0.0) + (0.04 if age < 25 else 0.0),
        "qualityExpectation": 0.15 * c + (0.06 if income == "high" else 0.0),
        "trendSensitivity": 0.25 * o + 0.10 * e + (0.06 if age < 30 else -0.06 if age > 50 else 0.0),
        "brandTrustNeed": 0.15 * a + 0.15 * n - 0.08 * o,
        "detailNeed": 0.30 * c - 0.08 * e,
        "impulsiveness": 0.20 * e - 0.30 * c + 0.12 * n,
        "seasonSensitivity": 0.0,
        "shippingSensitivity": 0.15 * n + (0.05 if kids else 0.0),
        "targetFitSensitivity": 0.10 * c,
        "noveltySeeking": 0.35 * o + 0.05 * e,
    }
    traits = {}
    for key in TRAITS:
        low, high = ranges[key]
        value = (low + high) / 2 + adjust[key] + resident["offsets"].get(key, 0.0)
        traits[key] = round(clamp(value, max(0.0, low - RANGE_MARGIN), min(1.0, high + RANGE_MARGIN)), 4)
    return traits


@lru_cache(maxsize=1)
def residents_with_traits() -> tuple[dict[str, Any], ...]:
    """All residents, each with its derived `traits`; cached because the town is fixed for a process."""
    return tuple({**r, "traits": derive_traits(r)} for r in load_town()["residents"])
