import random
import logging
from collections import defaultdict
from pathlib import Path
from typing import Any, Optional

from app.models.input_analysis import InputAnalysisResponse
from app.models.product import PurchaseMotivation, SimulationRequest
from app.models.simulation import DecisionDistribution, NormalizedProduct, PersonaResult, SimulationResponse
from app.services.ai_insight_service import generate_insights
from app.services.input_analysis_service import analyze_input, deterministic_analysis
from app.services.normalization_service import (
    get_category_rule,
    get_motivation_modifier,
    get_normalized_weights,
    load_persona_data,
    normalize_product,
)
from app.utils.math_utils import clamp, clamp_score, stable_seed


DATA_DIR = Path(__file__).resolve().parents[1] / "data"
logger = logging.getLogger("simulation")


def _seed_payload(request: SimulationRequest) -> dict[str, Any]:
    # Price is left out on purpose: the same synthetic crowd sees every price, so
    # price sweeps and A/B variants differ only by the change being tested.
    payload = request.model_dump(mode="json", by_alias=True, exclude={"price", "input_analysis", "images"})
    return payload


def simulate_core(request: SimulationRequest, input_analysis: Optional[InputAnalysisResponse] = None) -> dict[str, Any]:
    """Run the 500-bot simulation without any LLM call (deterministic, ~ms).

    Used by run_simulation and by the what-if endpoints (price sweep, A/B compare).
    Without an explicit analysis it falls back to the deterministic input checks.
    """
    input_analysis = input_analysis or request.input_analysis or deterministic_analysis(request)
    return _simulate(request, input_analysis)


def run_simulation(request: SimulationRequest) -> SimulationResponse:
    logger.info("Simülasyon başlatıldı: %r", request.product_name[:80])
    input_analysis = request.input_analysis or analyze_input(request)
    core = _simulate(request, input_analysis)
    normalized = core["normalized"]
    overall_score = core["overall_score"]
    market_breadth = core["market_breadth"]
    intent_conversion = core["intent_conversion"]
    problem_solution = core["problem_solution"]
    weakness_signals = core["weakness_signals"]
    all_personas = core["all_personas"]
    top_personas = all_personas[:3]

    ai_insights = generate_insights(
        request=request,
        normalized_product=normalized,
        overall_score=overall_score,
        market_breadth_score=market_breadth,
        intent_conversion_score=intent_conversion,
        problem_solution_fit=problem_solution,
        top_personas=top_personas,
        all_personas=all_personas,
        weakness_signals=weakness_signals,
    )

    feedback_map = {f.name: f.feedback for f in ai_insights.persona_feedback}
    for p in all_personas:
        if p.name in feedback_map:
            p.ai_comment = feedback_map[p.name]

    return SimulationResponse(
        overallScore=overall_score,
        marketBreadthScore=market_breadth,
        intentConversionScore=intent_conversion,
        problemSolutionFit=problem_solution,
        simulatedConsumers=core["simulated_consumers"],
        estimatedBuyers=core["estimated_buyers"],
        decisionDistribution=DecisionDistribution(**core["decision_counts"]),
        topPersonas=top_personas,
        allPersonas=all_personas,
        weaknesses=core["weaknesses"],
        weaknessSignals=weakness_signals,
        normalizedProduct=normalized,
        images=request.images,
        inputAnalysis=input_analysis,
        aiInsights=ai_insights,
    )


def _simulate(request: SimulationRequest, input_analysis: InputAnalysisResponse) -> dict[str, Any]:
    normalized = normalize_product(request, input_analysis.signals)
    persona_data = load_persona_data()
    config = persona_data["simulationConfig"]
    seed = stable_seed(_seed_payload(request), config["seedSalt"])
    rng = random.Random(seed)
    market_breadth = _market_breadth_score(request)
    market_relevance_factor = _market_relevance_factor(market_breadth)
    weights = get_normalized_weights(request.category, request.purchase_motivation)

    persona_stats: dict[str, dict[str, Any]] = defaultdict(
        lambda: {"count": 0, "buyers": 0, "prob_sum": 0.0, "reason": "", "advice": ""}
    )
    total_probability = 0.0
    estimated_buyers = 0
    decision_counts = {"buy": 0, "watch": 0, "skip": 0}

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
            purchase_roll = rng.random()
            if purchase_roll < probability:
                estimated_buyers += 1
                persona_stats[persona_name]["buyers"] += 1
                decision_counts["buy"] += 1
            else:
                decision_counts[_non_buyer_decision(probability, purchase_roll)] += 1
            persona_stats[persona_name]["count"] += 1
            persona_stats[persona_name]["prob_sum"] += probability
            total_probability += probability

    simulated_consumers = sum(persona["count"] for persona in persona_data["personaTypes"])
    overall_score = int(round((total_probability / simulated_consumers) * 100))
    intent_conversion = _intent_conversion_score(request.purchase_motivation, market_breadth, normalized, input_analysis)
    problem_solution = _problem_solution_fit(request.purchase_motivation, normalized)
    overall_score, intent_conversion, problem_solution = _apply_input_quality_caps(
        overall_score,
        intent_conversion,
        problem_solution,
        input_analysis,
    )
    weakness_signals = _weakness_signals(request, normalized, input_analysis)
    weaknesses = [_weakness_message(signal) for signal in weakness_signals]
    all_personas = _ranked_personas(persona_stats, normalized, weakness_signals, persona_data)

    return {
        "normalized": normalized,
        "overall_score": overall_score,
        "market_breadth": market_breadth,
        "intent_conversion": intent_conversion,
        "problem_solution": problem_solution,
        "weakness_signals": weakness_signals,
        "weaknesses": weaknesses,
        "all_personas": all_personas,
        "simulated_consumers": simulated_consumers,
        "estimated_buyers": estimated_buyers,
        "decision_counts": decision_counts,
    }


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


def _non_buyer_decision(probability: float, purchase_roll: float) -> str:
    if probability >= 1:
        return "watch"

    rejection_gap = (purchase_roll - probability) / max(1.0 - probability, 0.01)
    watch_threshold = clamp(0.25 + probability * 0.55, 0.28, 0.72)
    return "watch" if rejection_gap <= watch_threshold else "skip"


def _market_relevance_factor(market_breadth_score: int) -> float:
    return clamp(0.38 + (market_breadth_score / 100) * 0.58, 0.35, 0.95)


def _ranked_personas(
    persona_stats: dict[str, dict[str, Any]],
    product: NormalizedProduct,
    weakness_signals: list[str],
    persona_data: dict[str, Any],
) -> list[PersonaResult]:
    ranked = sorted(
        persona_stats.items(),
        key=lambda item: item[1]["prob_sum"] / max(item[1]["count"], 1),
        reverse=True,
    )
    results = [
        PersonaResult(
            name=name,
            purchaseProbability=round(stats["prob_sum"] / max(stats["count"], 1), 2),
            reason=stats["reason"],
            advice=stats["advice"],
            rank=index + 1,
            buyerCount=int(stats["buyers"]),
            sampleSize=int(stats["count"]),
            decision=_persona_decision(stats["prob_sum"] / max(stats["count"], 1))[0],
            decisionLabel=_persona_decision(stats["prob_sum"] / max(stats["count"], 1))[1],
            microFeedback=_persona_micro_feedback(
                name=name,
                probability=stats["prob_sum"] / max(stats["count"], 1),
                product=product,
                weakness_signals=weakness_signals,
            ),
        )
        for index, (name, stats) in enumerate(ranked)
    ]
    
    # Enrich with personality data
    persona_map = {p["name"]: p for p in persona_data["personaTypes"]}
    for p_result in results:
        if p_result.name in persona_map:
            p_data = persona_map[p_result.name]
            p_result.personality_type = p_data.get("personalityType")
            p_result.ai_roleplay_prompt = p_data.get("aiRoleplayPrompt")
            p_result.personality_traits = p_data.get("personalityTraits", {})
            
    return results


def _persona_decision(probability: float) -> tuple[str, str]:
    if probability >= 0.55:
        return "buy", "ALDI"
    if probability >= 0.42:
        return "watch", "KARARSIZ"
    return "skip", "ALMADI"


def _persona_micro_feedback(
    name: str,
    probability: float,
    product: NormalizedProduct,
    weakness_signals: list[str],
) -> str:
    if probability >= 0.62:
        if product.trend_fit >= 0.72 and name in {"Trend Takipcisi", "Durtusel Alici", "Sosyal Onay Arayan"}:
            return "Trend ve görsel çekicilik bu grubu hızlı ikna ediyor."
        if product.quality_score >= 0.72 and name in {"Premium Alici", "Kalite Odakli Alici"}:
            return "Kalite algısı fiyat bariyerini dengeliyor."
        if product.description_completeness >= 0.72 and "Detayci" in name:
            return "Detay seviyesi karar vermesini kolaylaştırıyor."
        return "Genel profil uyumu yüksek; bu grup birincil hedeflenebilir."

    if "brand_trust_low" in weakness_signals and name in {"Marka Sadigi", "Premium Alici", "Kalite Odakli Alici"}:
        return "Marka güveni ve garanti kanıtı olmadan temkinli kalır."
    if "price_sensitive_users_rejected" in weakness_signals and name in {"Fiyat Hassas Alici", "Kararsiz Sepet Bekletici"}:
        return "Kupon, kargo avantajı veya net fiyat faydası bekler."
    if "description_incomplete" in weakness_signals and ("Detayci" in name or "Problem" in name):
        return "Ölçü, uyumluluk ve kullanım detayı eksikse satın alma ertelenir."
    if "shipping_return_weak" in weakness_signals and name in {"Pratik Cozum Arayan", "Kararsiz Sepet Bekletici"}:
        return "İade ve teslimat güvencesi netleşirse niyet artar."
    if probability >= 0.42:
        return "Küçük güven sinyalleriyle tekrar hedeflenebilir."
    return "Bu ürünle profil uyumu düşük; reklam bütçesinde ikincil kalmalı."


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
    input_analysis: Any,
) -> int:
    input_factor = 0.65 + input_analysis.signals.plausibility * 0.20 + input_analysis.signals.category_fit * 0.15
    if motivation in {PurchaseMotivation.PROBLEM_SOLVING, PurchaseMotivation.SPARE_PART_REPAIR}:
        score = 34 - (market_breadth_score * 0.12)
        score += product.description_completeness * 18
        score += product.shipping_return_score * 10
        score += product.target_audience_fit * 10
        score += 12
        return clamp_score(score * input_factor)

    score = 18 + (market_breadth_score * 0.18)
    score += product.description_completeness * 12
    score += product.quality_score * 14
    score += product.brand_trust * 8
    score += product.target_audience_fit * 8
    score += product.shipping_return_score * 6
    score -= product.price_risk * 12
    if motivation in {PurchaseMotivation.STYLE, PurchaseMotivation.TREND}:
        score -= 3
    if motivation == PurchaseMotivation.PROFESSIONAL_USE:
        score += product.differentiation_score * 4
    return clamp_score(score * input_factor)


def _problem_solution_fit(motivation: PurchaseMotivation, product: NormalizedProduct) -> int:
    if motivation not in {PurchaseMotivation.PROBLEM_SOLVING, PurchaseMotivation.SPARE_PART_REPAIR}:
        score = (
            product.description_completeness * 24
            + product.quality_score * 24
            + product.target_audience_fit * 18
            + product.shipping_return_score * 12
            + product.price_fit * 10
        )
        return clamp_score(score)
    score = (
        product.description_completeness * 35
        + product.shipping_return_score * 25
        + product.target_audience_fit * 20
        + product.price_fit * 10
        + product.brand_trust * 10
    )
    return clamp_score(score)


def _apply_input_quality_caps(
    overall_score: int,
    intent_conversion: int,
    problem_solution: int,
    input_analysis: Any,
) -> tuple[int, int, int]:
    plausibility = input_analysis.signals.plausibility
    category_fit = input_analysis.signals.category_fit
    description = input_analysis.signals.description_completeness
    spec = input_analysis.signals.spec_completeness

    if plausibility < 0.30:
        return min(overall_score, 35), min(intent_conversion, 38), min(problem_solution, 42)
    if input_analysis.should_warn and (plausibility < 0.45 or category_fit < 0.45):
        return min(overall_score, 48), min(intent_conversion, 50), min(problem_solution, 55)
    if description < 0.40 and spec < 0.35:
        return min(overall_score, 55), min(intent_conversion, 55), problem_solution
    return overall_score, intent_conversion, problem_solution


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
        "brand_trust_low": "Marka güveni düşük.",
        "warranty_missing": "Garanti bilgisi eksik.",
        "price_sensitive_users_rejected": "Fiyat hassas kullanıcılar için fiyat riskli algılanıyor.",
        "description_incomplete": "Ürün açıklaması karar için yeterince detaylı değil.",
        "shipping_return_weak": "Kargo, iade veya teslimat güvencesi zayıf.",
        "compatibility_unclear": "Uyumlu model ve ölçü bilgisi yeterince net değil.",
        "input_needs_review": "Ürün bilgileri analizden önce gözden geçirilmeli.",
        "category_mismatch": "Seçilen kategori ile girilen ürün bilgileri uyumsuz olabilir.",
        "input_plausibility_low": "Ürün adı veya açıklama anlamsız görünüyor.",
    }
    return messages.get(signal, "Ürün kararını etkileyen zayıf bir sinyal var.")
