import json
import random
from collections import defaultdict
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.models.product import PurchaseMotivation, SimulationRequest
from app.models.simulation import NormalizedProduct, PersonaResult, SimulationResponse
from app.services.ai_insight_service import generate_insights
from app.services.input_analysis_service import analyze_input
from app.services.normalization_service import (
    get_category_rule,
    get_motivation_modifier,
    get_normalized_weights,
    normalize_product,
)
from app.utils.math_utils import clamp, clamp_score, stable_seed


DATA_DIR = Path(__file__).resolve().parents[1] / "data"


@lru_cache(maxsize=1)
def load_persona_data() -> dict[str, Any]:
    with (DATA_DIR / "personas.json").open(encoding="utf-8") as file:
        return json.load(file)


def run_simulation(request: SimulationRequest) -> SimulationResponse:
    input_analysis = request.input_analysis or analyze_input(request)
    normalized = normalize_product(request, input_analysis.signals)
    persona_data = load_persona_data()
    config = persona_data["simulationConfig"]
    seed = stable_seed(request.model_dump(mode="json", by_alias=True), config["seedSalt"])
    rng = random.Random(seed)
    market_breadth = _market_breadth_score(request)
    market_relevance_factor = _market_relevance_factor(market_breadth)
    weights = get_normalized_weights(request.category, request.purchase_motivation)

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
            probability = _purchase_probability(normalized, bot, weights)
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
    weakness_signals = _weakness_signals(request, normalized, input_analysis)
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
        inputAnalysis=input_analysis,
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


def _purchase_probability(
    product: NormalizedProduct,
    bot: dict[str, float],
    weights: dict[str, float],
) -> float:
    product_values = {
        "priceFit": product.price_fit,
        "qualityScore": product.quality_score,
        "trendFit": product.trend_fit,
        "brandTrust": product.brand_trust,
        "descriptionCompleteness": product.description_completeness,
        "visualAppeal": product.visual_appeal,
        "seasonFit": product.season_fit,
        "shippingReturnScore": product.shipping_return_score,
        "targetAudienceFit": product.target_audience_fit,
        "differentiationScore": product.differentiation_score,
    }
    bot_sensitivities = {
        "priceFit": 1.0 - bot["priceSensitivity"],
        "qualityScore": bot["qualityExpectation"],
        "trendFit": bot["trendSensitivity"],
        "brandTrust": bot["brandTrustNeed"],
        "descriptionCompleteness": bot["detailNeed"],
        "visualAppeal": bot["impulsiveness"],
        "seasonFit": bot["seasonSensitivity"],
        "shippingReturnScore": bot["shippingSensitivity"],
        "targetAudienceFit": bot["targetFitSensitivity"],
        "differentiationScore": bot["noveltySeeking"],
    }

    weighted_product_fit = sum(product_values[key] * weights.get(key, 0.0) for key in product_values)
    weighted_persona_fit = sum(
        product_values[key] * bot_sensitivities[key] * weights.get(key, 0.0)
        for key in product_values
    )
    price_weight = weights.get("priceFit", 0.12)
    price_penalty = product.price_risk * bot["priceSensitivity"] * (0.10 + price_weight * 0.35)

    score = 0.18
    score += weighted_product_fit * 0.52
    score += weighted_persona_fit * 0.38
    score -= price_penalty
    return clamp(score)


def _market_relevance_factor(market_breadth_score: int) -> float:
    return clamp(0.38 + (market_breadth_score / 100) * 0.58, 0.35, 0.95)


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
    category_rule = get_category_rule(request.category)
    base = int(category_rule["marketBreadthBase"])
    modifier = get_motivation_modifier(request.purchase_motivation)
    if base < 30 and modifier < 0:
        modifier = int(round(modifier * 0.35))
    audience_fields = set(category_rule.get("applicableAudienceFields", []))
    audience_bonus = 4 if "gender" in audience_fields and request.target_audience.gender == "unisex" else 0
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


def _weakness_signals(request: SimulationRequest, product: NormalizedProduct, input_analysis: Any) -> list[str]:
    signals: list[str] = []
    if input_analysis.should_warn:
        signals.append("input_needs_review")
    if input_analysis.signals.category_fit < 0.45:
        signals.append("category_mismatch")
    if input_analysis.signals.plausibility < 0.45:
        signals.append("input_plausibility_low")
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
        "input_needs_review": "Urun bilgileri analizden once gozden gecirilmeli.",
        "category_mismatch": "Secilen kategori ile girilen urun bilgileri uyumsuz olabilir.",
        "input_plausibility_low": "Urun adi veya aciklama anlamsiz gorunuyor.",
    }
    return messages.get(signal, "Urun kararini etkileyen bir zayif sinyal var.")
