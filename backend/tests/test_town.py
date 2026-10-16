"""Faz 12a: the synthetic town — consistency, diversity and derived traits."""

import json
import statistics
from collections import Counter, defaultdict
from pathlib import Path

import pytest

from app.services.normalization_service import load_persona_data
from app.services.town import RANGE_MARGIN, TRAITS, derive_traits, load_town, residents_with_traits
from tests.test_language import ASCII_TURKISH

ROOT = Path(__file__).resolve().parents[1]
RESIDENTS = load_town()["residents"]


def test_committed_town_matches_the_generator():
    """town.json is generated; editing it by hand (or changing the generator without regenerating) fails here."""
    import sys

    sys.path.insert(0, str(ROOT / "scripts"))
    from generate_town import generate

    committed = json.loads((ROOT / "app/data/town.json").read_text(encoding="utf-8"))
    assert generate() == committed, "run: python scripts/generate_town.py"


def test_one_resident_per_bot_and_persona_counts():
    personas = {p["name"]: p["count"] for p in load_persona_data()["personaTypes"]}
    assert len(RESIDENTS) == sum(personas.values()) == 500
    assert Counter(r["persona"] for r in RESIDENTS) == Counter(personas)
    assert len({r["id"] for r in RESIDENTS}) == 500


def test_life_facts_are_consistent():
    for r in RESIDENTS:
        assert 18 <= r["age"] <= 65, r["id"]
        if r["occupation"] == "ogrenci":
            assert r["age"] <= 24, r["id"]
        if r["occupation"] == "emekli":
            assert r["age"] >= 60, r["id"]
        if r["household"] == "yurt":
            assert r["occupation"] == "ogrenci", r["id"]
        assert (r["children"] > 0) == (r["household"] in {"esi_ve_cocuklari", "tek_ebeveyn"}), r["id"]
        assert len(set(r["hobbies"])) == 2


def test_gender_is_independent_of_persona():
    """No persona is (mostly) one gender: the town must not encode shopping stereotypes."""
    by_persona = defaultdict(list)
    for r in RESIDENTS:
        by_persona[r["persona"]].append(r["gender"] == "kadin")
    for persona, flags in by_persona.items():
        share = sum(flags) / len(flags)
        assert 0.3 <= share <= 0.7, (persona, share)


def test_demographic_tendencies_follow_the_persona():
    premium = [r["incomeLevel"] for r in RESIDENTS if r["persona"] == "Premium Alici"]
    price = [r["incomeLevel"] for r in RESIDENTS if r["persona"] == "Fiyat Hassas Alici"]
    assert premium.count("high") / len(premium) > 0.6
    assert price.count("low") / len(price) > 0.45


def test_diversity():
    assert len({r["story"] for r in RESIDENTS}) == 500
    assert len({r["name"] for r in RESIDENTS}) >= 480
    assert len({r["city"] for r in RESIDENTS}) >= 25
    assert len({h for r in RESIDENTS for h in r["hobbies"]}) >= 35
    assert len({r["occupationText"] for r in RESIDENTS}) >= 40


def test_stories_are_proper_turkish():
    for r in RESIDENTS:
        story = r["story"]
        assert not ASCII_TURKISH.search(story), (r["id"], story)
        assert story.startswith(f"{r['age']} yaşında, ") and story.endswith(".")
        assert "  " not in story and " ." not in story
    stories = " ".join(r["story"] for r in RESIDENTS)
    for good in ("İstanbul'da", "İzmir'de", "Gaziantep'te", "Akçaabat'ta", "Ödemiş'te"):
        if good.split("'")[0] in stories:
            assert good in stories, good


def test_derived_traits_stay_in_range_and_keep_the_persona():
    ranges = {p["name"]: p["ranges"] for p in load_persona_data()["personaTypes"]}
    for r in residents_with_traits():
        for key in TRAITS:
            low, high = ranges[r["persona"]][key]
            value = r["traits"][key]
            assert 0.0 <= value <= 1.0
            assert low - RANGE_MARGIN - 1e-9 <= value <= high + RANGE_MARGIN + 1e-9, (r["id"], key, value)


def _corr(xs, ys):
    return statistics.correlation(xs, ys)


@pytest.mark.parametrize(("big_five", "trait", "sign"), [
    ("conscientiousness", "detailNeed", 1),
    ("conscientiousness", "impulsiveness", -1),
    ("openness", "noveltySeeking", 1),
    ("neuroticism", "shippingSensitivity", 1),
])
def test_personality_moves_traits_within_a_persona(big_five, trait, sign):
    """Within each persona the Big Five value must shift the trait the documented way."""
    for persona in {r["persona"] for r in RESIDENTS}:
        group = [r for r in residents_with_traits() if r["persona"] == persona]
        corr = _corr([r["bigFive"][big_five] for r in group], [r["traits"][trait] for r in group])
        assert corr * sign > 0, (persona, big_five, trait, corr)


def test_income_moves_price_sensitivity():
    base = next(r for r in RESIDENTS if r["incomeLevel"] == "middle")
    low = derive_traits({**base, "incomeLevel": "low"})["priceSensitivity"]
    high = derive_traits({**base, "incomeLevel": "high"})["priceSensitivity"]
    assert low > derive_traits(base)["priceSensitivity"] >= high
