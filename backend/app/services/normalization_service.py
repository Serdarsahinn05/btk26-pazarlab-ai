import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.models.product import PurchaseMotivation, SimulationRequest
from app.models.simulation import NormalizedProduct
from app.utils.math_utils import clamp, normalize_weights


DATA_DIR = Path(__file__).resolve().parents[1] / "data"


@lru_cache(maxsize=1)
def load_category_rules() -> dict[str, Any]:
    with (DATA_DIR / "category_rules.json").open(encoding="utf-8") as file:
        return json.load(file)


def get_category_rule(category: str) -> dict[str, Any]:
    rules = load_category_rules()["categories"]
    return rules.get(category, rules["ev_yasam"])


def get_motivation_modifier(motivation: PurchaseMotivation) -> int:
    rules = load_category_rules()
    return int(rules.get("motivationModifiers", {}).get(motivation.value, 0))


def get_normalized_weights(category: str) -> dict[str, float]:
    return normalize_weights(get_category_rule(category)["defaultWeights"])


def normalize_product(request: SimulationRequest) -> NormalizedProduct:
    category_rule = get_category_rule(request.category)
    features = request.features
    commerce = request.commerce
    description = request.description.lower()

    average_price = float(category_rule["averagePrice"])
    price_ratio = request.price / average_price if average_price else 1.0
    price_fit = clamp(1.0 - abs(price_ratio - 1.0) * 0.55)
    if price_ratio < 0.55:
        price_fit = clamp(price_fit - 0.12)
    price_risk = clamp(1.0 - price_fit)

    quality_score = _score_quality(request.category, features, commerce)
    trend_fit = _score_trend(request.purchase_motivation, request.category, features, description)
    brand_trust = _score_brand_trust(features, commerce, description)
    description_completeness = _score_description(description, features)
    visual_appeal = _score_visual_appeal(request.purchase_motivation, features, description)
    season_fit = _score_season(request.category, features)
    shipping_return_score = _score_shipping_return(commerce)
    target_audience_fit = _score_target_audience(request)
    differentiation_score = _score_differentiation(features, description)

    return NormalizedProduct(
        priceFit=round(price_fit, 2),
        priceRisk=round(price_risk, 2),
        qualityScore=round(quality_score, 2),
        trendFit=round(trend_fit, 2),
        brandTrust=round(brand_trust, 2),
        descriptionCompleteness=round(description_completeness, 2),
        visualAppeal=round(visual_appeal, 2),
        seasonFit=round(season_fit, 2),
        shippingReturnScore=round(shipping_return_score, 2),
        targetAudienceFit=round(target_audience_fit, 2),
        differentiationScore=round(differentiation_score, 2),
    )


def _score_quality(category: str, features: Any, commerce: Any) -> float:
    score = 0.45
    if category == "mont":
        score += 0.12 if features.fabric else 0
        score += 0.10 if features.inner_filling else 0
        score += 0.14 if features.waterproof else 0
        score += 0.10 if features.windproof else 0
    elif category == "telefon":
        score += 0.08 if features.brand else 0
        score += 0.10 if features.ram else 0
        score += 0.10 if features.storage else 0
        score += 0.10 if features.processor else 0
        score += 0.07 if features.battery else 0
    elif category in {"yedek_parca", "ev_yasam"}:
        score += 0.12 if features.material else 0
        score += 0.14 if features.dimensions else 0
        score += 0.12 if features.compatible_model else 0
        score += 0.07 if features.installation_ease in {"cok_kolay", "kolay"} else 0
    else:
        score += 0.10 if features.material else 0
        score += 0.08 if features.style else 0
    score += 0.08 if commerce.warranty else 0
    return clamp(score)


def _score_trend(motivation: PurchaseMotivation, category: str, features: Any, description: str) -> float:
    score = 0.35
    if motivation in {PurchaseMotivation.STYLE, PurchaseMotivation.TREND}:
        score += 0.30
    if category in {"mont", "sapka"}:
        score += 0.12
    if features.style or features.colors:
        score += 0.10
    if any(word in description for word in ["oversize", "trend", "modern", "viral", "kombin"]):
        score += 0.13
    if motivation in {PurchaseMotivation.PROBLEM_SOLVING, PurchaseMotivation.SPARE_PART_REPAIR}:
        score -= 0.25
    return clamp(score)


def _score_brand_trust(features: Any, commerce: Any, description: str) -> float:
    score = 0.34
    score += 0.16 if features.brand else 0
    score += 0.18 if commerce.warranty else 0
    score += 0.12 if commerce.return_available else 0
    if any(word in description for word in ["garanti", "orijinal", "sertifika", "iade"]):
        score += 0.14
    return clamp(score)


def _score_description(description: str, features: Any) -> float:
    words = [word for word in description.split() if word]
    score = 0.28 + min(len(words) / 80, 0.34)
    detail_fields = [
        features.fabric,
        features.inner_filling,
        features.material,
        features.compatible_model,
        features.dimensions,
        features.installation_ease,
    ]
    score += min(sum(1 for field in detail_fields if field) * 0.06, 0.24)
    if any(word in description for word in ["olcu", "uyumlu", "model", "kullanim", "montaj"]):
        score += 0.14
    return clamp(score)


def _score_visual_appeal(motivation: PurchaseMotivation, features: Any, description: str) -> float:
    score = 0.45
    score += 0.12 if features.colors else 0
    score += 0.10 if features.style else 0
    if any(word in description for word in ["siyah", "bej", "modern", "minimal", "oversize"]):
        score += 0.12
    if motivation in {PurchaseMotivation.STYLE, PurchaseMotivation.TREND, PurchaseMotivation.GIFT}:
        score += 0.12
    if motivation in {PurchaseMotivation.SPARE_PART_REPAIR, PurchaseMotivation.PROBLEM_SOLVING}:
        score -= 0.12
    return clamp(score)


def _score_season(category: str, features: Any) -> float:
    if category not in {"mont", "sapka"}:
        return 0.58
    if features.season == "winter":
        return 0.90
    if features.season == "all":
        return 0.76
    if features.season:
        return 0.62
    return 0.50


def _score_shipping_return(commerce: Any) -> float:
    score = 0.35
    if commerce.shipping_days <= 2:
        score += 0.30
    elif commerce.shipping_days <= 4:
        score += 0.20
    elif commerce.shipping_days <= 7:
        score += 0.08
    score += 0.25 if commerce.return_available else 0
    score += 0.10 if commerce.warranty else 0
    return clamp(score)


def _score_target_audience(request: SimulationRequest) -> float:
    audience = request.target_audience
    score = 0.52
    score += 0.10 if audience.age_range else 0
    score += 0.08 if audience.gender in {"unisex", "kadin", "erkek"} else 0
    score += 0.08 if audience.income_level in {"low", "middle", "high"} else 0
    if request.purchase_motivation in {PurchaseMotivation.PROBLEM_SOLVING, PurchaseMotivation.SPARE_PART_REPAIR}:
        score += 0.08 if request.features.compatible_model or request.features.dimensions else 0
    return clamp(score)


def _score_differentiation(features: Any, description: str) -> float:
    score = 0.35
    feature_count = len(features.model_dump(exclude_none=True))
    score += min(feature_count * 0.04, 0.28)
    if any(word in description for word in ["ozel", "farkli", "premium", "su gecirmez", "tak-cikar"]):
        score += 0.14
    return clamp(score)
