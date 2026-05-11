import json
import random
from collections import defaultdict
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.models.product import PurchaseMotivation, SimulationRequest
from app.models.simulation import NormalizedProduct, PersonaResult, SimulationResponse
from app.services.ai_insight_service import generate_insights
from app.services.normalization_service import (
    get_category_rule,
    get_motivation_modifier,
    normalize_product,
)
from app.utils.math_utils import clamp, clamp_score, stable_seed


DATA_DIR = Path(__file__).resolve().parents[1] / "data"


@lru_cache(maxsize=1)
def load_persona_data() -> dict[str, Any]:
    with (DATA_DIR / "personas.json").open(encoding="utf-8") as file:
        return json.load(file)


def run_simulation(request: SimulationRequest) -> SimulationResponse:
    normalized = normalize_product(request)
    persona_data = load_persona_data()
    config = persona_data["simulationConfig"]
    seed = stable_seed(request.model_dump(mode="json", by_alias=True), config["seedSalt"])
    rng = random.Random(seed)
    market_breadth = _market_breadth_score(request)
    market_relevance_factor = _market_relevance_factor(market_breadth)

    persona_stats: dict[str, dict[str, Any]] = defaultdict(
        lambda: {"count": 0, "buyers": 0, "prob_sum": 0.0, "reason": "", "advice": ""}
    )
    total_probability = 0.0
    estimated_buyers = 0

    for persona_type in persona_data["personaTypes"]:
        persona_name = persona_type["name"]
        persona_stats[persona_name]["reason"] = persona_type["reason"]
        persona_stats[persona_name]["advice"] = persona_type["advice"]
        for _ in range(persona_type["count"]):
            bot = _generate_bot(persona_type, rng)
            probability = _purchase_probability(normalized, bot)
            if request.purchase_motivation.value in persona_type.get("preferredMotivations", []):
                probability = clamp(probability + 0.06)
            probability = clamp(probability * market_relevance_factor)
            if rng.random() < probability:
                estimated_buyers += 1
                persona_stats[persona_name]["buyers"] += 1
            persona_stats[persona_name]["count"] += 1
            persona_stats[persona_name]["prob_sum"] += probability
            total_probability += probability

    simulated_consumers = sum(persona["count"] for persona in persona_data["personaTypes"])
    overall_score = int(round((total_probability / simulated_consumers) * 100))
    top_personas = _top_personas(persona_stats)
    intent_conversion = _intent_conversion_score(request.purchase_motivation, market_breadth, normalized)
    problem_solution = _problem_solution_fit(request.purchase_motivation, normalized)
    weakness_signals = _weakness_signals(request, normalized)
    weaknesses = [_weakness_message(signal) for signal in weakness_signals]

    return SimulationResponse(
        overallScore=overall_score,
        marketBreadthScore=market_breadth,
        intentConversionScore=intent_conversion,
        problemSolutionFit=problem_solution,
        simulatedConsumers=simulated_consumers,
        estimatedBuyers=estimated_buyers,
        topPersonas=top_personas,
        weaknesses=weaknesses,
        weaknessSignals=weakness_signals,
        normalizedProduct=normalized,
        aiInsights=generate_insights(
            request=request,
            normalized_product=normalized,
            overall_score=overall_score,
            market_breadth_score=market_breadth,
            intent_conversion_score=intent_conversion,
            problem_solution_fit=problem_solution,
            top_personas=top_personas,
            weakness_signals=weakness_signals,
        ),
    )


def _generate_bot(persona_type: dict[str, Any], rng: random.Random) -> dict[str, float]:
    return {
        key: rng.uniform(value_range[0], value_range[1])
        for key, value_range in persona_type["ranges"].items()
    }


def _purchase_probability(product: NormalizedProduct, bot: dict[str, float]) -> float:
    score = 0.35
    score += product.quality_score * bot["qualityExpectation"] * 0.15
    score += product.trend_fit * bot["trendSensitivity"] * 0.12
    score += product.season_fit * bot["seasonSensitivity"] * 0.12
    score += product.brand_trust * bot["brandTrustNeed"] * 0.10
    score += product.description_completeness * bot["detailNeed"] * 0.10
    score += product.visual_appeal * bot["impulsiveness"] * 0.10
    score += product.shipping_return_score * bot["shippingSensitivity"] * 0.08
    score += product.target_audience_fit * bot["targetFitSensitivity"] * 0.10
    score += product.differentiation_score * bot["noveltySeeking"] * 0.08
    score -= product.price_risk * bot["priceSensitivity"] * 0.20
    return clamp(score)


def _market_relevance_factor(market_breadth_score: int) -> float:
    return clamp(0.55 + (market_breadth_score / 100) * 0.45, 0.45, 0.95)


def _top_personas(persona_stats: dict[str, dict[str, Any]]) -> list[PersonaResult]:
    ranked = sorted(
        persona_stats.items(),
        key=lambda item: item[1]["prob_sum"] / max(item[1]["count"], 1),
        reverse=True,
    )
    return [
        PersonaResult(
            name=name,
            purchaseProbability=round(stats["prob_sum"] / max(stats["count"], 1), 2),
            reason=stats["reason"],
            advice=stats["advice"],
        )
        for name, stats in ranked[:3]
    ]


def _market_breadth_score(request: SimulationRequest) -> int:
    base = int(get_category_rule(request.category)["marketBreadthBase"])
    modifier = get_motivation_modifier(request.purchase_motivation)
    audience_bonus = 4 if request.target_audience.gender == "unisex" else 0
    return clamp_score(base + modifier + audience_bonus)


def _intent_conversion_score(
    motivation: PurchaseMotivation,
    market_breadth_score: int,
    product: NormalizedProduct,
) -> int:
    if motivation in {PurchaseMotivation.PROBLEM_SOLVING, PurchaseMotivation.SPARE_PART_REPAIR}:
        score = 45 - (market_breadth_score * 0.20)
        score += product.description_completeness * 22
        score += product.shipping_return_score * 12
        score += 12
        return clamp_score(score)

    score = 30 + (market_breadth_score * 0.30)
    score += product.description_completeness * 16
    score += product.shipping_return_score * 8
    if motivation in {PurchaseMotivation.STYLE, PurchaseMotivation.TREND}:
        score -= 4
    return clamp_score(score)


def _problem_solution_fit(motivation: PurchaseMotivation, product: NormalizedProduct) -> int:
    if motivation not in {PurchaseMotivation.PROBLEM_SOLVING, PurchaseMotivation.SPARE_PART_REPAIR}:
        return clamp_score(35 + product.description_completeness * 15)
    score = (
        product.description_completeness * 35
        + product.shipping_return_score * 25
        + product.target_audience_fit * 20
        + product.price_fit * 10
        + product.brand_trust * 10
    )
    return clamp_score(score)


def _weakness_signals(request: SimulationRequest, product: NormalizedProduct) -> list[str]:
    signals: list[str] = []
    if product.brand_trust < 0.45:
        signals.append("brand_trust_low")
    if not request.commerce.warranty:
        signals.append("warranty_missing")
    if product.price_risk > 0.45:
        signals.append("price_sensitive_users_rejected")
    if product.description_completeness < 0.55:
        signals.append("description_incomplete")
    if product.shipping_return_score < 0.55:
        signals.append("shipping_return_weak")
    if (
        request.purchase_motivation in {PurchaseMotivation.PROBLEM_SOLVING, PurchaseMotivation.SPARE_PART_REPAIR}
        and not (request.features.compatible_model or request.features.dimensions)
    ):
        signals.append("compatibility_unclear")
    return signals[:5]


def _weakness_message(signal: str) -> str:
    messages = {
        "brand_trust_low": "Marka guveni dusuk.",
        "warranty_missing": "Garanti bilgisi eksik.",
        "price_sensitive_users_rejected": "Fiyat hassas kullanicilar icin fiyat riskli algilaniyor.",
        "description_incomplete": "Urun aciklamasi karar icin yeterince detayli degil.",
        "shipping_return_weak": "Kargo, iade veya teslimat guvencesi zayif.",
        "compatibility_unclear": "Uyumlu model ve olcu bilgisi yeterince net degil.",
    }
    return messages.get(signal, "Urun kararini etkileyen bir zayif sinyal var.")

