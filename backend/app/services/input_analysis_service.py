import re
from typing import Any, Dict, Iterable, Mapping, Optional

from app.models.input_analysis import InputAnalysisResponse, InputQualitySignals
from app.models.product import SimulationRequest
from app.services.ai_insight_service import _call_gemini_generate_content
from app.utils.math_utils import clamp


INPUT_ANALYSIS_PROMPT = """
Sen PazarLab AI icin urun input kalite analisti olarak calisiyorsun.
Gorevin saticinin girdigi kategori, urun adi, aciklama ve ozelliklerden urunun
gercekci olup olmadigini ve 10 ortak parametreye gidecek sinyalleri cikarmak.

Kurallar:
- Marka guvenini kullanicinin "marka bilinirligi" secmesine gore degil; marka/model netligi,
  garanti/fatura, teknik detay tutarliligi ve aciklamadaki guven sinyallerine gore tahmin et.
- Internette arama yapma. Bilmedigin marka icin kesin hukum verme; sadece input kalitesine gore puanla.
- Sacma, tekrar eden, kategoriyle alakasiz veya tek kelimelik bilgi varsa shouldWarn true yap.
- Kategori/urun uyumsuzsa suspectedCategory veya correctedProductName ile kisa oneride bulun.
- Cevabi sadece JSON dondur.

JSON semasi:
{
  "shouldWarn": true,
  "confidence": 0.0,
  "warnings": ["kisa uyari"],
  "suggestions": ["kisa oneri"],
  "suspectedCategory": "telefon veya null",
  "correctedProductName": "olasi net urun adi veya null",
  "signals": {
    "plausibility": 0.0,
    "categoryFit": 0.0,
    "brandTrust": 0.0,
    "descriptionCompleteness": 0.0,
    "specCompleteness": 0.0,
    "qualitySignal": 0.0,
    "visualAppealSignal": 0.0,
    "targetFitSignal": 0.0
  }
}
""".strip()


CATEGORY_TERMS = {
    "tisort": {"tisort", "tshirt", "kumas", "pamuk", "yaka", "kol", "baski", "beden", "oversize"},
    "pantolon": {"pantolon", "denim", "keten", "bel", "paca", "fit", "beden", "esnek"},
    "mont": {"mont", "kaban", "ceket", "kumas", "dolgu", "su", "ruzgar", "kapuson", "kis"},
    "telefon": {"telefon", "gb", "kamera", "batarya", "ekran", "ram", "islemci", "hz", "5g"},
    "laptop": {"laptop", "notebook", "ram", "ssd", "islemci", "ekran", "gpu", "batarya", "kg"},
    "kulaklik": {"kulaklik", "bluetooth", "anc", "mikrofon", "pil", "saat", "gecikme", "kablolu"},
}


IMPORTANT_FIELDS = {
    "tisort": ["fabric", "fit", "size_range", "collar_type", "sleeve_length", "print_type", "season"],
    "pantolon": ["fabric", "fit", "waist_type", "leg_type", "size_range", "use_case", "season"],
    "mont": ["fabric", "inner_filling", "season", "fit", "size_range", "waterproof", "windproof"],
    "telefon": ["brand", "ram", "storage", "processor", "camera", "battery", "screen_size", "refresh_rate"],
    "laptop": ["brand", "processor", "ram", "storage", "gpu", "screen_size", "battery", "weight", "use_case"],
    "kulaklik": ["brand", "connection_type", "battery", "noise_cancellation", "microphone", "water_resistance", "latency", "use_case"],
}


def analyze_input(request: SimulationRequest) -> InputAnalysisResponse:
    try:
        model_json = _call_gemini_generate_content(INPUT_ANALYSIS_PROMPT, _payload(request))
        return _parse_ai_response(model_json)
    except Exception:
        return _fallback_analysis(request)


def _payload(request: SimulationRequest) -> Dict[str, Any]:
    return {
        "category": request.category,
        "purchaseMotivation": request.purchase_motivation.value,
        "productName": request.product_name,
        "price": request.price,
        "description": request.description,
        "targetAudience": request.target_audience.model_dump(by_alias=True),
        "features": request.features.model_dump(by_alias=True, exclude_none=True),
        "commerce": request.commerce.model_dump(by_alias=True),
    }


def _parse_ai_response(model_json: Mapping[str, Any]) -> InputAnalysisResponse:
    signals_raw = dict(model_json.get("signals", {}) or {})
    signals = InputQualitySignals(
        plausibility=_safe_score(signals_raw.get("plausibility"), 0.65),
        categoryFit=_safe_score(signals_raw.get("categoryFit"), 0.65),
        brandTrust=_safe_score(signals_raw.get("brandTrust"), 0.45),
        descriptionCompleteness=_safe_score(signals_raw.get("descriptionCompleteness"), 0.45),
        specCompleteness=_safe_score(signals_raw.get("specCompleteness"), 0.45),
        qualitySignal=_safe_score(signals_raw.get("qualitySignal"), 0.45),
        visualAppealSignal=_safe_score(signals_raw.get("visualAppealSignal"), 0.45),
        targetFitSignal=_safe_score(signals_raw.get("targetFitSignal"), 0.45),
    )
    warnings = _clean_text_list(model_json.get("warnings", []))
    suggestions = _clean_text_list(model_json.get("suggestions", []))
    should_warn = bool(model_json.get("shouldWarn", False)) or signals.plausibility < 0.45 or signals.category_fit < 0.45

    return InputAnalysisResponse(
        aiUsed=True,
        shouldWarn=should_warn,
        confidence=_safe_score(model_json.get("confidence"), 0.70),
        warnings=warnings[:4],
        suggestions=suggestions[:4],
        suspectedCategory=_clean_optional(model_json.get("suspectedCategory")),
        correctedProductName=_clean_optional(model_json.get("correctedProductName")),
        signals=signals,
    )


def _fallback_analysis(request: SimulationRequest) -> InputAnalysisResponse:
    features = request.features
    raw_features = features.model_dump(exclude_none=True)
    text = " ".join(
        [
            request.category,
            request.product_name,
            request.description,
            " ".join(str(value) for value in raw_features.values()),
        ]
    ).lower()

    filled_important = _filled_ratio(features, IMPORTANT_FIELDS.get(request.category, []))
    description_quality = _description_quality(request.description)
    category_fit = _category_fit(request.category, text, filled_important)
    plausibility = min(description_quality, 0.55 + filled_important * 0.45)
    brand_trust = _brand_trust_from_input(features, request.commerce, request.description)
    quality_signal = clamp(0.35 + filled_important * 0.45 + (0.10 if request.commerce.warranty else 0.0))
    visual_signal = _visual_signal(request.category, features, request.description)
    target_signal = clamp(0.45 + filled_important * 0.35 + (0.10 if request.target_audience.income_level else 0.0))

    warnings = []
    suggestions = []
    if _looks_like_noise(request.product_name) or _looks_like_noise(request.description):
        warnings.append("Girdiler rastgele veya anlamsiz gorunuyor.")
        suggestions.append("Urun adini ve aciklamayi gercek urun bilgileriyle tekrar yaz.")
        plausibility = min(plausibility, 0.25)
    if category_fit < 0.40:
        warnings.append("Urun bilgileri secilen kategoriyle tam uyusmuyor olabilir.")
        suggestions.append("Kategori ve alt urunu tekrar kontrol et.")
    if request.category in {"telefon", "laptop"} and not features.brand:
        warnings.append("Marka/model bilgisi net degil.")
        suggestions.append("Marka ve modeli yazarsan guven ve teknik uyum daha dogru hesaplanir.")
    if description_quality < 0.45:
        warnings.append("Aciklama karar vermek icin zayif.")
        suggestions.append("Kullanim amaci, teknik detay ve ayirt edici faydayi ekle.")

    should_warn = bool(warnings) or plausibility < 0.45 or category_fit < 0.45

    return InputAnalysisResponse(
        aiUsed=False,
        shouldWarn=should_warn,
        confidence=0.58,
        warnings=warnings[:4],
        suggestions=suggestions[:4],
        suspectedCategory=_guess_category(text, request.category),
        correctedProductName=None,
        signals=InputQualitySignals(
            plausibility=round(plausibility, 2),
            categoryFit=round(category_fit, 2),
            brandTrust=round(brand_trust, 2),
            descriptionCompleteness=round(description_quality, 2),
            specCompleteness=round(filled_important, 2),
            qualitySignal=round(quality_signal, 2),
            visualAppealSignal=round(visual_signal, 2),
            targetFitSignal=round(target_signal, 2),
        ),
    )


def _safe_score(value: Any, fallback: float) -> float:
    try:
        return round(clamp(float(value)), 2)
    except (TypeError, ValueError):
        return fallback


def _clean_text_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()]


def _clean_optional(value: Any) -> Optional[str]:
    if value is None:
        return None
    text = str(value).strip()
    if not text or text.lower() == "null":
        return None
    return text


def _filled_ratio(features: Any, field_names: Iterable[str]) -> float:
    names = list(field_names)
    if not names:
        return 0.45
    filled = 0
    for name in names:
        value = getattr(features, name, None)
        if isinstance(value, bool):
            filled += 1 if value else 0
        elif value:
            filled += 1
    return clamp(filled / len(names))


def _description_quality(description: str) -> float:
    words = [word for word in re.split(r"\s+", description.strip()) if word]
    unique_ratio = len(set(words)) / max(len(words), 1)
    length_score = min(len(words) / 35, 1.0)
    return clamp(0.20 + length_score * 0.55 + unique_ratio * 0.25)


def _category_fit(category: str, text: str, filled_ratio: float) -> float:
    terms = CATEGORY_TERMS.get(category, set())
    if not terms:
        return 0.65
    hits = sum(1 for term in terms if term in text)
    return clamp(0.25 + min(hits / 4, 0.45) + filled_ratio * 0.30)


def _brand_trust_from_input(features: Any, commerce: Any, description: str) -> float:
    score = 0.28
    brand = getattr(features, "brand", None)
    if brand and len(str(brand).strip()) >= 3:
        score += 0.18
    if commerce.warranty:
        score += 0.20
    if commerce.return_available:
        score += 0.12
    if any(word in description.lower() for word in ["garanti", "fatura", "orijinal", "yetkili", "sertifika"]):
        score += 0.16
    return clamp(score)


def _visual_signal(category: str, features: Any, description: str) -> float:
    text = description.lower()
    score = 0.42
    if category in {"tisort", "pantolon", "mont"}:
        if getattr(features, "colors", None):
            score += 0.15
        if getattr(features, "fit", None):
            score += 0.12
        if any(word in text for word in ["modern", "oversize", "minimal", "renk", "kombin", "tasarim"]):
            score += 0.16
    else:
        if any(word in text for word in ["ince", "hafif", "premium", "modern", "kompakt"]):
            score += 0.12
    return clamp(score)


def _looks_like_noise(text: str) -> bool:
    cleaned = re.sub(r"\s+", "", text.lower())
    if len(cleaned) < 8:
        return True
    if len(set(cleaned)) <= 3:
        return True
    alpha_count = sum(1 for char in cleaned if char.isalpha())
    return alpha_count < max(len(cleaned) * 0.45, 4)


def _guess_category(text: str, current_category: str) -> Optional[str]:
    best_category = current_category
    best_hits = 0
    for category, terms in CATEGORY_TERMS.items():
        hits = sum(1 for term in terms if term in text)
        if hits > best_hits:
            best_category = category
            best_hits = hits
    if best_category != current_category and best_hits >= 2:
        return best_category
    return None
