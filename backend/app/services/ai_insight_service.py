from __future__ import annotations

import json
import os
import urllib.request
from typing import Any, Dict, List, Mapping, Optional

from app.models.product import PurchaseMotivation, SimulationRequest
from app.models.simulation import AiInsights, NormalizedProduct, PersonaResult
from app.utils.scoring_utils import infer_product_type, recommend_channels


SYSTEM_PROMPT = """
Sen deneyimli bir e-ticaret danışmanısın. Aşağıdaki simülasyon sonucunu satıcıya net, kısa ve aksiyona dönüştürülebilir önerilerle sun.

Ürün Bilgisi:
- Kategori: {category}
- Satın alma motivasyonu: {purchaseMotivation}
- Pazar genişliği skoru: {marketBreadthScore}/100
- Satın alma niyeti skoru: {intentConversionScore}/100
- Problem çözüm uyumu: {problemSolutionFit}/100

Kurallar:
- Satıcı küçük/orta ölçekli bir işletme olabilir; teknik jargon kullanma.
- Her öneri somut ve uygulanabilir olsun.
- Ürünü şu şekilde sınıflandır: "trend/stil ürünü", "ihtiyaç ürünü", "problem çözüm/yedek parça ürünü", "hediye ürünü"
- Buna göre kanal önerisi ver: sosyal medya mı, SEO/arama mı, pazar yeri içi optimizasyon mu?
- Niş ürünlerde (pazar genişliği < 40): "Geniş kitle reklamı yerine arama niyeti yüksek kullanıcılara ulaşmak daha doğru" vurgusu yap.
- Satın alma niyeti skorunu gerçek site dönüşüm oranı gibi yorumlama; bu skor fiyat, güven, açıklama ve teknik detaylardan türetilmiş bir eğilim skorudur.
- Cevabı SADECE JSON formatında döndür. Başka metin ekleme.

{{
  "summary": "2 cümlelik genel değerlendirme",
  "productTypeInsight": "Bu ürün [X] odaklı bir [Y] ürünüdür. Geniş kitleye [hitap eder/hitap etmez]...",
  "salesRecipe": ["3-5 maddelik aksiyon listesi"],
  "marketingAdvice": "Hangi kanal, hangi dil?",
  "descriptionAdvice": "Açıklamada ne eksik?",
  "pricingAdvice": "Fiyat algısı ve öneri",
  "seasonAdvice": "Mevsim değerlendirmesi",
  "channelRecommendation": ["Instagram", "TikTok", "Google Search", "SEO"],
  "improvedDescription": "Hazır, kullanıma hazır iyileştirilmiş ürün açıklaması"
}}
""".strip()


FALLBACK_MAP: Dict[str, str] = {
    "brand_trust_low": "Marka bilinirliği düşük. Ürün açıklamasına garanti ve iade politikası detayı eklenmeli.",
    "warranty_missing": "Garanti bilgisi eksik. Satın alma güvenini artırmak için garanti süresi belirtilmeli.",
    "price_sensitive_users_rejected": "Fiyat hassas kullanıcılar ürünü pahalı buluyor. Kampanya veya ücretsiz kargo test edilebilir.",
    "description_incomplete": "Ürün açıklaması yetersiz. Teknik detaylar, kullanım senaryosu ve ölçü bilgisi eklenmeli.",
    "season_mismatch": "Mevsim uyumu düşük. Ürün mevsim dışı bir dönemde pazarlanıyor olabilir.",
    "compatibility_unclear": "Uyumluluk bilgisi eksik. Niş ürünlerde ölçü ve model uyumu satın alma kararının %70'ini etkiler.",
    "shipping_return_weak": "Kargo ve iade güvencesi zayıf. Teslimat süresi ve iade kolaylığı daha görünür yapılmalı.",
}


MOTIVATION_INSIGHTS: Dict[str, str] = {
    "stil_begeni": "Bu ürün stil odaklı bir üründür. Görsel çekicilik, trend uyumu ve sosyal medya reklamları önemlidir.",
    "ihtiyac": "Bu ürün günlük ihtiyaç ürünüdür. Fiyat, pratiklik ve hızlı kargo satın alma kararını etkiler.",
    "problem_cozme": "Bu ürün problem çözüm odaklıdır. Açıklamada ölçü, uyumluluk ve teknik detay kritiktir. Arama motoru optimizasyonu daha değerlidir.",
    "yedek_parca_tamir": "Bu ürün yedek parça/tamir ürünüdür. Geniş kitleye hitap etmez ama arayan kişide yüksek dönüşüm sağlar. SEO ve pazar yeri araması önemlidir.",
    "hediye": "Bu ürün hediye potansiyeli taşır. Görsel sunum, marka güveni ve ambalaj/paketleme öne çıkarılmalıdır.",
    "trend": "Bu ürün trend odaklıdır. Sosyal medya reklamları, influencer işbirlikleri ve kısa videolar etkili olur.",
    "profesyonel_kullanim": "Bu ürün profesyonel kullanıma yöneliktir. Teknik detay, dayanıklılık ve garanti bilgisi önemlidir."
}


def _call_gemini_generate_content(system_prompt: str, user_payload: Mapping[str, Any]) -> Dict[str, Any]:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY missing")

    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    body = {
        "systemInstruction": {
            "parts": [{"text": system_prompt}]
        },
        "contents": [{
            "role": "user",
            "parts": [{"text": json.dumps(user_payload, ensure_ascii=False)}]
        }],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.4
        }
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        raw = resp.read().decode("utf-8")
    data = json.loads(raw)
    content = data["candidates"][0]["content"]["parts"][0]["text"]
    return json.loads(content)


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
    """
    Ana simülasyon servisi tarafından çağrılan, Pydantic model döndüren asıl fonksiyon.
    Eğer GEMINI_API_KEY tanımlıysa LLM çağrısı yapar, aksi halde zenginleştirilmiş fallback üretir.
    """
    motivation_str = request.purchase_motivation.value if hasattr(request.purchase_motivation, "value") else str(request.purchase_motivation)
    category_str = request.category.value if hasattr(request.category, "value") else str(request.category)

    payload = {
        "productName": request.product_name,
        "productUrl": request.product_url,
        "category": category_str,
        "purchaseMotivation": motivation_str,
        "overallScore": overall_score,
        "marketBreadthScore": market_breadth_score,
        "intentConversionScore": intent_conversion_score,
        "problemSolutionFit": problem_solution_fit,
        "weaknessSignals": weakness_signals,
        "topPersonas": [p.model_dump(by_alias=True) for p in top_personas],
        "normalizedProduct": normalized_product.model_dump(by_alias=True),
    }

    prompt = SYSTEM_PROMPT.format(
        category=category_str,
        purchaseMotivation=motivation_str,
        marketBreadthScore=market_breadth_score,
        intentConversionScore=intent_conversion_score,
        problemSolutionFit=problem_solution_fit,
    )

    try:
        model_json = _call_gemini_generate_content(prompt, payload)
        summary_str = str(model_json.get("summary", "")).strip() or "Genel değerlendirme hazır."
        pt_insight = str(model_json.get("productTypeInsight", "") or model_json.get("product_type_insight", "")).strip() or "Ürün tipi yorumu hazır."
        recipe = list(model_json.get("salesRecipe", []) or model_json.get("sales_recipe", []))[:5] or ["Listeleme ve açıklamayı güçlendir."]
        m_advice = str(model_json.get("marketingAdvice", "") or model_json.get("marketing_advice", "")).strip() or "Kanal stratejisini belirle."
        d_advice = str(model_json.get("descriptionAdvice", "") or model_json.get("description_advice", "")).strip() or "Açıklamayı netleştir."
        p_advice = str(model_json.get("pricingAdvice", "") or model_json.get("pricing_advice", "")).strip() or "Fiyat duyarlılığını test et."
        s_advice = str(model_json.get("seasonAdvice", "") or model_json.get("season_advice", "")).strip() or "Sezon uyumunu vurgula."
        ch_rec = list(model_json.get("channelRecommendation", []) or model_json.get("channel_recommendation", [])) or recommend_channels(motivation_str, float(market_breadth_score))
        imp_desc = str(model_json.get("improvedDescription", "") or model_json.get("improved_description", "")).strip() or "İyileştirilmiş açıklama hazır."

        return AiInsights(
            summary=summary_str,
            product_type_insight=pt_insight,
            sales_recipe=recipe,
            marketing_advice=m_advice,
            description_advice=d_advice,
            pricing_advice=p_advice,
            season_advice=s_advice,
            channel_recommendation=ch_rec,
            improved_description=imp_desc,
        )
    except Exception:
        # Fallback akışı
        motivation_line = MOTIVATION_INSIGHTS.get(
            motivation_str, "Bu ürün için motivasyon bazlı öneriler uygulanabilir."
        )
        product_type = infer_product_type(motivation_str)
        channels = recommend_channels(motivation_str, float(market_breadth_score))

        top_weakness = [FALLBACK_MAP.get(s, "") for s in weakness_signals]
        top_weakness = [t for t in top_weakness if t][:3]
        weakness_sentence = " ".join(top_weakness) if top_weakness else "Genel olarak ürün bilgisini daha net ve güven verici hale getirmek faydalı olur."

        niche_note = ""
        if market_breadth_score < 40:
            niche_note = " Pazar genişliği düşük; geniş kitle reklamı yerine arama niyeti yüksek kullanıcılara ulaşmak daha doğru."

        summary = (
            f"{request.product_name} için genel satış potansiyeli {overall_score}/100. "
            f"Pazar genişliği {market_breadth_score}/100, niyetli alıcı dönüşümü {intent_conversion_score}/100."
            f" Problem uyumu {problem_solution_fit}/100. {weakness_sentence}{niche_note}"
        )

        product_type_insight = (
            f"Bu ürün {motivation_str} motivasyonuyla alınan bir {product_type}. {motivation_line}{niche_note}"
        )

        sales_recipe = _build_sales_recipe(
            request=request,
            product_type=product_type,
            channels=channels,
            weakness_signals=weakness_signals,
            market_breadth_score=market_breadth_score,
        )

        top_persona_names = ", ".join(p.name for p in top_personas[:3])
        marketing_advice = _build_marketing_advice(
            category=category_str,
            product_type=product_type,
            channels=channels,
            top_persona_names=top_persona_names,
            market_breadth_score=market_breadth_score,
            intent_conversion_score=intent_conversion_score,
        )
        description_advice = _build_description_advice(request, normalized_product)
        pricing_advice = _build_pricing_advice(request, normalized_product)
        season_advice = _build_season_advice(request, normalized_product)
        improved_description = _build_improved_description(request, category_str)

        return AiInsights(
            summary=summary.strip(),
            product_type_insight=product_type_insight.strip(),
            sales_recipe=sales_recipe[:5],
            marketing_advice=marketing_advice.strip(),
            description_advice=description_advice.strip(),
            pricing_advice=pricing_advice.strip(),
            season_advice=season_advice.strip(),
            channel_recommendation=channels,
            improved_description=improved_description.strip(),
        )


def _build_sales_recipe(
    request: SimulationRequest,
    product_type: str,
    channels: List[str],
    weakness_signals: List[str],
    market_breadth_score: int,
) -> List[str]:
    features = request.features
    category = str(request.category)
    first_channel = channels[0] if channels else "en guclu kanal"
    recipe = [
        f"Basligi '{request.product_name}' + ana fayda + hedef kullanim senaryosu seklinde netlestir.",
        "Ilk gorselde urunun karar verdiren ozelligini goster: kiyafette kalip/renk, teknolojide ekran-batarya-performans.",
        f"{first_channel} icin 7 gunluk A/B test kur: bir varyant fayda odakli, digeri fiyat/guven odakli olsun.",
        "Iade, kargo ve garanti/fatura bilgisini fiyat alanina yakin gosterecek sekilde listelemeyi duzenle.",
    ]
    if category in {"telefon", "laptop", "tablet", "akilli_saat", "kulaklik"}:
        recipe.insert(1, "Teknik ozellikleri karsilastirilabilir yaz: model, kapasite, pil, ekran ve garanti ayni blokta dursun.")
    if category in {"tisort", "pantolon", "mont", "elbise", "etek"}:
        recipe.insert(1, "Beden/kalip bilgisini ve gercek kullanim/kombin senaryosunu aciklamanin ilk 2 satirina al.")
    if "price_sensitive_users_rejected" in weakness_signals or market_breadth_score < 50:
        recipe.append("Fiyat bariyerini olcmek icin ucretsiz kargo veya kupon varyantini ana fiyati dusurmeden test et.")
    if product_type == "trend/stil ürünü" and getattr(features, "colors", None):
        recipe.append("Renk varyantlarini ayri gorsel setleriyle test et; tek ilanda tum renkleri gizleme.")
    return recipe[:5]


def _build_marketing_advice(
    category: str,
    product_type: str,
    channels: List[str],
    top_persona_names: str,
    market_breadth_score: int,
    intent_conversion_score: int,
) -> str:
    channel_text = ", ".join(channels) if channels else "pazar yeri ici arama ve sosyal medya"
    if category in {"telefon", "laptop", "tablet", "akilli_saat", "kulaklik"}:
        angle = "teknik kanit + guven + karsilastirma"
    elif category in {"tisort", "pantolon", "mont", "elbise", "etek"}:
        angle = "stil, beden uyumu ve gercek kullanim gorselleri"
    else:
        angle = "net fayda ve guven"
    scope = "genis kitle kreatifleri" if market_breadth_score >= 55 else "arama niyeti yuksek daha dar kitle"
    return (
        f"Kanal odagi: {channel_text}. Mesaj dili {angle} uzerine kurulsun. "
        f"{scope} ile basla; donusum skoru {intent_conversion_score}/100 oldugu icin personalar ({top_persona_names}) bazinda iki farkli metin test et."
    )


def _build_description_advice(request: SimulationRequest, normalized_product: NormalizedProduct) -> str:
    if normalized_product.description_completeness >= 0.75:
        return "Aciklama temel olarak guclu; ilk paragrafi daha net fayda, ikinci paragrafi teknik/beden detaylari olacak sekilde duzenle."
    if request.category in {"telefon", "laptop", "tablet", "akilli_saat", "kulaklik"}:
        return "Aciklamaya model, kapasite, pil/ekran, garanti-fatura ve kimler icin uygun oldugunu tablo gibi okunacak netlikte ekle."
    return "Aciklamaya kumas, kalip, beden araligi, sezon, kombin/kullanim senaryosu ve iade bilgisini ayri cumlelerle ekle."


def _build_pricing_advice(request: SimulationRequest, normalized_product: NormalizedProduct) -> str:
    if normalized_product.price_risk >= 0.45:
        return "Fiyat algisi riskli. Ana fiyati hemen dusurmek yerine kupon, set indirimi veya ucretsiz kargo varyanti test et."
    if normalized_product.price_fit >= 0.75:
        return "Fiyat kategori ortalamasina yakin gorunuyor. Premium algi icin garanti, kalite kaniti ve hizli kargo mesajini fiyatla birlikte goster."
    return "Fiyat testi icin iki varyant yeterli: mevcut fiyat + guven vurgusu ve kucuk indirim + aciliyet mesaji."


def _build_season_advice(request: SimulationRequest, normalized_product: NormalizedProduct) -> str:
    category = request.category
    season = getattr(request.features, "season", None)
    if category in {"telefon", "laptop", "tablet", "akilli_saat", "kulaklik"}:
        return "Teknoloji urunlerinde sezon etkisi dusuk; okul donemi, yilbasi, maas haftasi ve kampanya donemleri ayri test edilmeli."
    if normalized_product.season_fit >= 0.80:
        return f"Sezon uyumu guclu ({season or 'belirtilen sezon'}). Baslik, ilk gorsel ve kampanya metninde bu kullanim donemini one cikar."
    return "Sezon uyumu zayifsa urunu indirim/alternatif kullanim senaryosuyla konumlandir; ana reklam butcesini sezon pikine sakla."


def _build_improved_description(request: SimulationRequest, category_str: str) -> str:
    features = request.features
    feature_parts = []
    for label, value in [
        ("Marka/model", getattr(features, "brand", None)),
        ("Kumas", getattr(features, "fabric", None)),
        ("Kalip", getattr(features, "fit", None)),
        ("Beden", getattr(features, "size_range", None)),
        ("Ekran", getattr(features, "screen_size", None)),
        ("RAM", getattr(features, "ram", None)),
        ("Depolama", getattr(features, "storage", None)),
        ("Batarya", getattr(features, "battery", None)),
        ("Kullanim", getattr(features, "use_case", None)),
    ]:
        if value:
            feature_parts.append(f"{label}: {value}")
    details = "; ".join(feature_parts[:6]) or "urun detaylari acik ve karar vermeyi kolaylastiracak sekilde sunulur"
    trust = "Garanti/fatura bilgisi ve kolay iade secenegiyle guvenli alisveris desteklenir." if request.commerce.warranty else "Kolay iade ve net kargo bilgisiyle satin alma riski azaltilir."
    return (
        f"{request.product_name}, {category_str} kategorisinde {request.target_audience.income_level} segment icin konumlanan bir urundur. "
        f"{details}. {request.description.strip()} {trust}"
    )


def build_ai_insights(simulation_summary: Mapping[str, Any], category: Optional[str] = None) -> Dict[str, Any]:
    """
    Alternatif çağrılar ve geriye dönük uyumluluk için sağlanan, sözlük döndüren fonksiyon.
    """
    purchase_motivation = str(simulation_summary.get("purchaseMotivation", "") or "")
    market_breadth_score = float(simulation_summary.get("marketBreadthScore", 0) or 0)
    intent_conversion_score = float(simulation_summary.get("intentConversionScore", 0) or 0)
    problem_solution_fit = float(simulation_summary.get("problemSolutionFit", 0) or 0)
    weakness_signals = list(simulation_summary.get("weaknessSignals", []) or [])

    category_final = category or str(simulation_summary.get("category", ""))
    if not category_final:
        category_final = "Genel"

    prompt = SYSTEM_PROMPT.format(
        category=category_final,
        purchaseMotivation=purchase_motivation,
        marketBreadthScore=int(market_breadth_score),
        intentConversionScore=int(intent_conversion_score),
        problemSolutionFit=int(problem_solution_fit),
    )

    payload = dict(simulation_summary)
    payload["category"] = category_final

    try:
        model_json = _call_gemini_generate_content(prompt, payload)
        return {
            "aiInsights": {
                "summary": str(model_json.get("summary", "")).strip() or "Genel değerlendirme hazır.",
                "productTypeInsight": str(model_json.get("productTypeInsight", "") or model_json.get("product_type_insight", "")).strip() or "Ürün tipi yorumu hazır.",
                "salesRecipe": list(model_json.get("salesRecipe", []) or model_json.get("sales_recipe", []))[:5] or ["Listeleme ve açıklamayı güçlendir."],
                "marketingAdvice": str(model_json.get("marketingAdvice", "") or model_json.get("marketing_advice", "")).strip() or "Kanal stratejisini belirle.",
                "descriptionAdvice": str(model_json.get("descriptionAdvice", "") or model_json.get("description_advice", "")).strip() or "Açıklamayı netleştir.",
                "pricingAdvice": str(model_json.get("pricingAdvice", "") or model_json.get("pricing_advice", "")).strip() or "Fiyat duyarlılığını test et.",
                "seasonAdvice": str(model_json.get("seasonAdvice", "") or model_json.get("season_advice", "")).strip() or "Sezon uyumunu vurgula.",
                "channelRecommendation": list(model_json.get("channelRecommendation", []) or model_json.get("channel_recommendation", [])) or recommend_channels(purchase_motivation, float(market_breadth_score)),
                "improvedDescription": str(model_json.get("improvedDescription", "") or model_json.get("improved_description", "")).strip() or "İyileştirilmiş açıklama hazır."
            }
        }
    except Exception:
        motivation_line = MOTIVATION_INSIGHTS.get(
            purchase_motivation, "Bu ürün için motivasyon bazlı öneriler uygulanabilir."
        )
        product_type = infer_product_type(purchase_motivation)
        channels = recommend_channels(purchase_motivation, float(market_breadth_score))

        top_weakness = [FALLBACK_MAP.get(s, "") for s in weakness_signals]
        top_weakness = [t for t in top_weakness if t][:3]
        weakness_sentence = " ".join(top_weakness) if top_weakness else "Genel olarak ürün bilgisini daha net ve güven verici hale getirmek faydalı olur."

        niche_note = ""
        if float(market_breadth_score) < 40:
            niche_note = " Pazar genişliği düşük; geniş kitle reklamı yerine arama niyeti yüksek kullanıcılara ulaşmak daha doğru."

        summary = (
            f"{category_final} kategorisinde skorlar: pazar genişliği {int(market_breadth_score)}/100, dönüşüm {int(intent_conversion_score)}/100."
            f" Problem uyumu {int(problem_solution_fit)}/100. {weakness_sentence}{niche_note}"
        )

        product_type_insight = (
            f"Bu ürün {purchase_motivation} motivasyonuyla alınan bir {product_type}. {motivation_line}{niche_note}"
        )

        sales_recipe = [
            "Ürün başlığına net faydayı ve ayırt edici özelliği ekle.",
            "İade/garanti/kargo bilgisini görünür hale getir.",
            "Açıklamaya ölçü/uyumluluk/kullanım senaryosu gibi karar verdiren detayları ekle.",
            "En güçlü kanalda 1 hafta A/B test ile görsel + fiyat mesajını dene."
        ]
        if product_type == "trend/stil ürünü":
            sales_recipe.insert(0, "Görselleri 1:1 + kısa video formatına optimize et.")

        return {
            "aiInsights": {
                "summary": summary.strip(),
                "productTypeInsight": product_type_insight.strip(),
                "salesRecipe": sales_recipe[:5],
                "marketingAdvice": f"Kanal odağı: {', '.join(channels)}. Kısa, net fayda + güven unsurlarıyla mesajlaş.",
                "descriptionAdvice": "Açıklamada ölçü/uyumluluk, malzeme, kullanım ve paket içeriği gibi karar kriterlerini netleştir.",
                "pricingAdvice": "Fiyat hassasiyetini ölçmek için sınırlı süreli kupon test edebilirsin.",
                "seasonAdvice": "Sezon uyumunu güçlendirmek için kullanım senaryolarını vurgula.",
                "channelRecommendation": channels,
                "improvedDescription": f"{category_final} ürünü. Öne çıkan fayda ve güven garantisiyle listelenmiştir."
            }
        }
