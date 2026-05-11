from app.models.product import PurchaseMotivation, SimulationRequest
from app.models.simulation import AiInsights, NormalizedProduct, PersonaResult


FALLBACK_MAP = {
    "brand_trust_low": "Marka guveni dusuk. Urun aciklamasina garanti, iade ve kullanici yorumu gibi guven sinyalleri eklenmeli.",
    "warranty_missing": "Garanti bilgisi eksik. Satin alma guvenini artirmak icin garanti veya iade kosulu net yazilmali.",
    "price_sensitive_users_rejected": "Fiyat hassas kullanicilar urunu riskli bulabilir. Kampanya, paket avantaji veya ucretsiz kargo test edilebilir.",
    "description_incomplete": "Urun aciklamasi yetersiz. Teknik detaylar, kullanim senaryosu ve olcu bilgisi eklenmeli.",
    "shipping_return_weak": "Kargo ve iade guvencesi zayif. Teslimat suresi ve iade kolayligi daha gorunur yapilmali.",
    "compatibility_unclear": "Uyumluluk bilgisi eksik. Nis urunlerde olcu, model uyumu ve montaj bilgisi satin alma kararini dogrudan etkiler.",
}


MOTIVATION_INSIGHTS = {
    PurchaseMotivation.STYLE: {
        "type": "Bu urun stil odakli bir urundur. Gorsel cekicilik, trend uyumu ve sosyal medya dili onemlidir.",
        "channels": ["Instagram", "TikTok", "YouTube Shorts"],
    },
    PurchaseMotivation.NEED: {
        "type": "Bu urun gunluk ihtiyac urunudur. Fiyat, pratiklik ve hizli kargo satin alma kararini etkiler.",
        "channels": ["Pazar yeri aramasi", "Google Search", "SEO"],
    },
    PurchaseMotivation.PROBLEM_SOLVING: {
        "type": "Bu urun problem cozum odaklidir. Aciklamada olcu, uyumluluk ve teknik detay kritik rol oynar.",
        "channels": ["Google Search", "SEO", "Pazar yeri aramasi"],
    },
    PurchaseMotivation.SPARE_PART_REPAIR: {
        "type": "Bu urun yedek parca/tamir urunudur. Genis kitleye degil, ihtiyaci net olan kullaniciya hitap eder.",
        "channels": ["Google Search", "SEO", "Pazar yeri aramasi"],
    },
    PurchaseMotivation.GIFT: {
        "type": "Bu urun hediye potansiyeli tasir. Gorsel sunum, marka guveni ve paketleme one cikarilmalidir.",
        "channels": ["Instagram", "TikTok", "Pazar yeri vitrinleri"],
    },
    PurchaseMotivation.TREND: {
        "type": "Bu urun trend odaklidir. Sosyal medya reklamlari, kisa videolar ve populer kullanim senaryolari etkilidir.",
        "channels": ["TikTok", "Instagram", "YouTube Shorts"],
    },
    PurchaseMotivation.PROFESSIONAL_USE: {
        "type": "Bu urun profesyonel kullanima yoneliktir. Teknik detay, dayaniklilik ve garanti bilgisi onemlidir.",
        "channels": ["Google Search", "SEO", "LinkedIn"],
    },
}


def generate_insights(
    request: SimulationRequest,
    normalized_product: NormalizedProduct,
    overall_score: int,
    market_breadth_score: int,
    intent_conversion_score: int,
    problem_solution_fit: int,
    top_personas: list[PersonaResult],
    weakness_signals: list[str],
) -> AiInsights:
    return _fallback_insights(
        request=request,
        normalized_product=normalized_product,
        overall_score=overall_score,
        market_breadth_score=market_breadth_score,
        intent_conversion_score=intent_conversion_score,
        problem_solution_fit=problem_solution_fit,
        top_personas=top_personas,
        weakness_signals=weakness_signals,
    )


def _fallback_insights(
    request: SimulationRequest,
    normalized_product: NormalizedProduct,
    overall_score: int,
    market_breadth_score: int,
    intent_conversion_score: int,
    problem_solution_fit: int,
    top_personas: list[PersonaResult],
    weakness_signals: list[str],
) -> AiInsights:
    motivation = MOTIVATION_INSIGHTS[request.purchase_motivation]
    channels = _channel_recommendations(request.purchase_motivation, market_breadth_score, motivation["channels"])
    top_persona_names = ", ".join(persona.name for persona in top_personas[:3])
    weakness_texts = [FALLBACK_MAP[signal] for signal in weakness_signals if signal in FALLBACK_MAP]

    summary = (
        f"{request.product_name} icin genel satis potansiyeli {overall_score}/100. "
        f"Pazar genisligi {market_breadth_score}/100, niyetli alici donusumu {intent_conversion_score}/100."
    )
    if market_breadth_score < 40:
        summary += " Urun nis kitleye hitap ediyor; bu dusuk pazar skoru tek basina kotu bir sinyal degil."

    product_type_insight = motivation["type"]
    if market_breadth_score < 40:
        product_type_insight += " Genis kitle reklami yerine arama niyeti yuksek kullanicilara ulasmak daha dogru olur."

    sales_recipe = _sales_recipe(
        request=request,
        normalized_product=normalized_product,
        top_persona_names=top_persona_names,
        weakness_texts=weakness_texts,
    )

    return AiInsights(
        summary=summary,
        productTypeInsight=product_type_insight,
        salesRecipe=sales_recipe,
        marketingAdvice=_marketing_advice(channels, top_persona_names),
        descriptionAdvice=_description_advice(request, weakness_signals),
        pricingAdvice=_pricing_advice(normalized_product),
        seasonAdvice=_season_advice(normalized_product),
        channelRecommendation=channels,
        improvedDescription=_improved_description(request, problem_solution_fit),
    )


def _channel_recommendations(
    motivation: PurchaseMotivation,
    market_breadth_score: int,
    default_channels: list[str],
) -> list[str]:
    if market_breadth_score < 40:
        return ["Google Search", "SEO", "Pazar yeri aramasi"]
    if motivation in {PurchaseMotivation.STYLE, PurchaseMotivation.TREND, PurchaseMotivation.GIFT}:
        return default_channels
    return ["Pazar yeri aramasi", "Google Search", "SEO"]


def _sales_recipe(
    request: SimulationRequest,
    normalized_product: NormalizedProduct,
    top_persona_names: str,
    weakness_texts: list[str],
) -> list[str]:
    recipe = [
        f"Baslikta {request.product_name} icin ana faydayi ve satin alma motivasyonunu netlestir.",
        f"Ilk kampanya hedefini su personalara gore kur: {top_persona_names}.",
    ]
    if normalized_product.description_completeness < 0.65:
        recipe.append("Aciklamaya olcu, kullanim senaryosu, malzeme ve iade bilgisini ekle.")
    if normalized_product.brand_trust < 0.50:
        recipe.append("Guven bariyerini azaltmak icin garanti, iade ve yorum sinyallerini one cikar.")
    if weakness_texts:
        recipe.append(weakness_texts[0])
    return recipe[:5]


def _marketing_advice(channels: list[str], top_persona_names: str) -> str:
    return (
        f"Oncelikli kanallar: {', '.join(channels)}. "
        f"Mesaj dili {top_persona_names} personalarinin karar bariyerlerine gore kurulmali."
    )


def _description_advice(request: SimulationRequest, weakness_signals: list[str]) -> str:
    if "compatibility_unclear" in weakness_signals:
        return "Uyumlu model, olcu, montaj ve hangi problemi cozdulugu urun basliginda ve aciklamada netlesmeli."
    if request.purchase_motivation in {PurchaseMotivation.PROBLEM_SOLVING, PurchaseMotivation.SPARE_PART_REPAIR}:
        return "Nis urunlerde teknik detay ve uyumluluk bilgisi gorselden bile once karar verdirir."
    if "description_incomplete" in weakness_signals:
        return "Aciklamada malzeme, kullanim senaryosu, hedef kitle ve iade bilgisi eksik kalmis."
    return "Aciklama temel bilgileri tasiyor; daha guclu fayda cumleleri ve guven sinyalleri eklenebilir."


def _pricing_advice(normalized_product: NormalizedProduct) -> str:
    if normalized_product.price_risk > 0.45:
        return "Fiyat riski yuksek. Indirim, ucretsiz kargo veya paket avantajiyla fiyat algisi test edilmeli."
    if normalized_product.price_fit > 0.75:
        return "Fiyat algisi kategori ortalamasiyla uyumlu gorunuyor. Kampanya yerine deger vurgusu oncelenebilir."
    return "Fiyat kabul edilebilir seviyede; guven ve aciklama guclenirse donusum artabilir."


def _season_advice(normalized_product: NormalizedProduct) -> str:
    if normalized_product.season_fit > 0.75:
        return "Sezon uyumu guclu. Kampanya zamanlamasi urunun dogal talep donemine denk geliyor."
    if normalized_product.season_fit < 0.45:
        return "Sezon uyumu dusuk. Urun sezon disi donemde daha cok indirim veya stok eritme diliyle sunulmali."
    return "Sezon etkisi orta seviyede. Urun dilinde mevsim yerine fayda ve kullanim senaryosu one alinmali."


def _improved_description(request: SimulationRequest, problem_solution_fit: int) -> str:
    if request.purchase_motivation in {PurchaseMotivation.PROBLEM_SOLVING, PurchaseMotivation.SPARE_PART_REPAIR}:
        return (
            f"{request.product_name}, belirli bir ihtiyaci hizli ve pratik sekilde tamamlamak icin tasarlanmistir. "
            "Uyumlu model, olcu, malzeme ve montaj bilgileri net bicimde kontrol edilerek satin alinmalidir. "
            f"Problem cozum uyumu {problem_solution_fit}/100 seviyesindedir."
        )
    return (
        f"{request.product_name}, hedef kitlenin kullanim beklentisine uygun sekilde konumlandirilmis bir urundur. "
        "Urun aciklamasinda ana fayda, malzeme, kullanim senaryosu, iade ve guven bilgileri birlikte sunulmalidir."
    )
