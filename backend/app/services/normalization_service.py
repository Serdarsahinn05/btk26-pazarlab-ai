import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Optional, Union

from app.models.category import FASHION, SEASONAL, TECH
from app.models.input_analysis import InputQualitySignals
from app.models.product import PurchaseMotivation, SimulationRequest
from app.models.simulation import NormalizedProduct
from app.utils.math_utils import clamp, normalize_weights
from app.utils.text_utils import fold_text


DATA_DIR = Path(__file__).resolve().parents[1] / "data"


@lru_cache(maxsize=1)
def load_category_rules() -> dict[str, Any]:
    with (DATA_DIR / "category_rules.json").open(encoding="utf-8") as file:
        return json.load(file)


@lru_cache(maxsize=1)
def load_persona_data() -> dict[str, Any]:
    with (DATA_DIR / "personas.json").open(encoding="utf-8") as file:
        return json.load(file)


def get_category_rule(category: str) -> dict[str, Any]:
    rules = load_category_rules()["categories"]
    return rules.get(category, rules["tisort"])


def get_motivation_modifier(motivation: PurchaseMotivation) -> int:
    rules = load_category_rules()
    return int(rules.get("motivationModifiers", {}).get(motivation.value, 0))


def get_normalized_weights(category: str, motivation: Optional[Union[PurchaseMotivation, str]] = None) -> dict[str, float]:
    category_rule = get_category_rule(category)
    motivation_value = motivation.value if isinstance(motivation, PurchaseMotivation) else motivation
    weights = category_rule.get("motivationWeights", {}).get(
        motivation_value,
        category_rule["defaultWeights"],
    )
    return normalize_weights(weights)


def normalize_product(request: SimulationRequest, ai_signals: Optional[InputQualitySignals] = None) -> NormalizedProduct:
    category_rule = get_category_rule(request.category)
    features = request.features
    commerce = request.commerce
    description = fold_text(request.description)

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
    target_audience_fit = _score_target_audience(request, description)
    differentiation_score = _score_differentiation(features, description)

    if ai_signals:
        quality_score = _blend(quality_score, ai_signals.quality_signal, 0.35)
        brand_trust = _blend(brand_trust, ai_signals.brand_trust, 0.50)
        description_completeness = _blend(description_completeness, ai_signals.description_completeness, 0.45)
        visual_appeal = _blend(visual_appeal, ai_signals.visual_appeal_signal, 0.30)
        target_audience_fit = _blend(target_audience_fit, ai_signals.target_fit_signal, 0.35)
        differentiation_score = _blend(differentiation_score, ai_signals.spec_completeness, 0.25)

        plausibility_factor = 0.55 + ai_signals.plausibility * 0.45
        category_factor = 0.55 + ai_signals.category_fit * 0.45
        quality_score = clamp(quality_score * plausibility_factor)
        trend_fit = clamp(trend_fit * category_factor)
        target_audience_fit = clamp(target_audience_fit * category_factor)

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


def _feature(features: Any, key: str, default: Any = None) -> Any:
    return getattr(features, key, default)


def _any_feature(features: Any, *keys: str) -> bool:
    return any(bool(_feature(features, key)) for key in keys)


def _blend(base_score: float, ai_score: float, ai_weight: float) -> float:
    return clamp(base_score * (1.0 - ai_weight) + ai_score * ai_weight)


def _score_quality(category: str, features: Any, commerce: Any) -> float:
    score = 0.45
    if category == "mont":
        score += 0.12 if features.fabric else 0
        score += 0.10 if features.inner_filling else 0
        score += 0.14 if features.waterproof else 0
        score += 0.10 if features.windproof else 0
        score += 0.05 if _feature(features, "hood") else 0
    elif category in {"tisort", "pantolon", "elbise", "etek"}:
        score += 0.14 if features.fabric else 0
        score += 0.08 if features.fit else 0
        score += 0.08 if _feature(features, "size_range") else 0
        score += 0.06 if features.season else 0
        score += 0.06 if _any_feature(features, "print_type", "collar_type", "waist_type", "leg_type", "use_case") else 0
        score += 0.05 if _feature(features, "stretch") else 0
    elif category in {"telefon", "laptop", "tablet", "akilli_saat"}:
        score += 0.08 if features.brand else 0
        score += 0.10 if features.ram else 0
        score += 0.10 if features.storage else 0
        score += 0.10 if features.processor else 0
        score += 0.07 if features.battery else 0
        score += 0.08 if _feature(features, "screen_size") else 0
        score += 0.08 if category == "laptop" and _feature(features, "gpu") else 0
        score += 0.08 if category == "tablet" and _feature(features, "connectivity") else 0
        score += 0.08 if category == "akilli_saat" and _any_feature(features, "sensors", "water_resistance") else 0
    elif category == "kulaklik":
        score += 0.07 if features.brand else 0
        score += 0.12 if _feature(features, "connection_type") else 0
        score += 0.12 if features.battery else 0
        score += 0.10 if _feature(features, "noise_cancellation") else 0
        score += 0.08 if _feature(features, "microphone") else 0
        score += 0.06 if _feature(features, "water_resistance") else 0
        score += 0.06 if _feature(features, "latency") else 0
    elif category == "ayakkabi":
        score += 0.12 if features.material else 0
        score += 0.12 if _feature(features, "sole_material") else 0
        score += 0.08 if _feature(features, "size_range") else 0
        score += 0.06 if features.fit else 0
        score += 0.06 if features.waterproof else 0
        score += 0.06 if _any_feature(features, "heel_height", "use_case") else 0
    elif category == "canta":
        score += 0.14 if features.material else 0
        score += 0.12 if _feature(features, "dimensions") else 0
        score += 0.10 if _feature(features, "compartments") else 0
        score += 0.08 if _feature(features, "strap_type") else 0
        score += 0.06 if features.waterproof else 0
        score += 0.04 if features.use_case else 0
    elif category == "kozmetik":
        score += 0.10 if features.brand else 0
        score += 0.14 if _feature(features, "ingredients") else 0
        score += 0.10 if _feature(features, "skin_type") else 0
        score += 0.08 if _feature(features, "volume") else 0
        score += 0.12 if _feature(features, "certifications") else 0
    else:
        score += 0.10 if features.material else 0
        score += 0.08 if features.style else 0
    score += 0.08 if commerce.warranty else 0
    return clamp(score)


def _score_trend(motivation: PurchaseMotivation, category: str, features: Any, description: str) -> float:
    score = 0.35
    if motivation in {PurchaseMotivation.STYLE, PurchaseMotivation.TREND}:
        score += 0.30
    if category in FASHION:
        score += 0.12
    if category in {"kulaklik", "akilli_saat"}:
        score += 0.06
    if features.style or features.colors or features.fit or _feature(features, "print_type"):
        score += 0.10
    if any(word in description for word in ["oversize", "trend", "modern", "viral", "kombin", "minimal", "gaming"]):
        score += 0.13
    if motivation in {PurchaseMotivation.PROBLEM_SOLVING, PurchaseMotivation.SPARE_PART_REPAIR}:
        score -= 0.25
    return clamp(score)


def _score_brand_trust(features: Any, commerce: Any, description: str) -> float:
    score = 0.38
    score += 0.10 if features.brand else 0
    score += 0.18 if commerce.warranty else 0
    score += 0.12 if commerce.return_available else 0
    if any(word in description for word in ["garanti", "orijinal", "sertifika", "iade", "fatura"]):
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
        features.fit,
        _feature(features, "size_range"),
        _feature(features, "processor"),
        _feature(features, "ram"),
        _feature(features, "storage"),
        _feature(features, "screen_size"),
        _feature(features, "connection_type"),
        _feature(features, "use_case"),
    ]
    score += min(sum(1 for field in detail_fields if field) * 0.06, 0.24)
    extra_details = [
        _feature(features, "upholstery"),
        _feature(features, "frame_material") or _feature(features, "frameMaterial"),
        _feature(features, "load_capacity") or _feature(features, "loadCapacity"),
        _feature(features, "doorType"),
        _feature(features, "gpu"),
        _feature(features, "microphone"),
        _feature(features, "latency"),
        _feature(features, "water_resistance"),
    ]
    score += min(sum(1 for field in extra_details if field) * 0.04, 0.12)
    if any(word in description for word in ["olcu", "olculer", "uyumlu", "model", "kullanim", "montaj", "kapasite"]):
        score += 0.14
    return clamp(score)


def _score_visual_appeal(motivation: PurchaseMotivation, features: Any, description: str) -> float:
    score = 0.45
    score += 0.12 if features.colors else 0
    score += 0.10 if features.style or features.fit else 0
    score += 0.07 if _any_feature(features, "print_type", "collar_type", "leg_type", "waist_type") else 0
    if any(word in description for word in ["siyah", "bej", "modern", "minimal", "oversize", "renk", "tasarim"]):
        score += 0.12
    if motivation in {PurchaseMotivation.STYLE, PurchaseMotivation.TREND, PurchaseMotivation.GIFT}:
        score += 0.12
    if motivation in {PurchaseMotivation.SPARE_PART_REPAIR, PurchaseMotivation.PROBLEM_SOLVING}:
        score -= 0.12
    return clamp(score)


def _score_season(category: str, features: Any) -> float:
    if category not in SEASONAL:
        return 0.70
    if category == "mont" and features.season in {"winter", "kis"}:
        return 0.90
    if category == "tisort" and features.season in {"summer", "yaz"}:
        return 0.88
    if category in {"elbise", "etek"} and features.season in {"spring", "summer", "bahar", "yaz"}:
        return 0.86
    if features.season in {"all", "dort_mevsim"}:
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


def _score_target_audience(request: SimulationRequest, description: str) -> float:
    audience = request.target_audience
    features = request.features

    if request.category in TECH:
        score = 0.45
        score += 0.14 if audience.income_level in {"low", "middle", "high"} else 0
        score += 0.12 if features.storage or features.ram else 0
        score += 0.10 if features.use_case else 0
        score += 0.08 if features.battery or features.camera or _feature(features, "processor") else 0
        score += 0.06 if request.category == "kulaklik" and _any_feature(features, "connection_type", "latency", "microphone") else 0
        score += 0.06 if request.category == "tablet" and _any_feature(features, "screen_size", "connectivity") else 0
        score += 0.06 if request.category == "akilli_saat" and _any_feature(features, "sensors", "water_resistance") else 0
        return clamp(score)

    score = 0.52
    score += 0.10 if audience.age_range else 0
    score += 0.08 if audience.gender in {"unisex", "kadin", "erkek"} else 0
    score += 0.08 if audience.income_level in {"low", "middle", "high"} else 0
    return clamp(score)


def _score_differentiation(features: Any, description: str) -> float:
    score = 0.35
    feature_count = len(features.model_dump(exclude_none=True))
    score += min(feature_count * 0.04, 0.28)
    if any(word in description for word in ["ozel", "farkli", "premium", "su gecirmez", "tak-cikar"]):
        score += 0.14
    return clamp(score)
