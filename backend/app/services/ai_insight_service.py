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
- Niyetli alıcı dönüşümü: {intentConversionScore}/100
- Problem çözüm uyumu: {problemSolutionFit}/100

Kurallar:
- Satıcı küçük/orta ölçekli bir işletme olabilir; teknik jargon kullanma.
- Her öneri somut ve uygulanabilir olsun.
- Ürünü şu şekilde sınıflandır: "trend/stil ürünü", "ihtiyaç ürünü", "problem çözüm/yedek parça ürünü", "hediye ürünü"
- Buna göre kanal önerisi ver: sosyal medya mı, SEO/arama mı, pazar yeri içi optimizasyon mu?
- Niş ürünlerde (pazar genişliği < 40): "Geniş kitle reklamı yerine arama niyeti yüksek kullanıcılara ulaşmak daha doğru" vurgusu yap.
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

        sales_recipe = [
            f"Ürün başlığına {request.product_name} için ana faydayı ve ayırt edici özelliği ekle.",
            "İade/garanti/kargo bilgisini görünür hale getir.",
            "Açıklamaya ölçü/uyumluluk/kullanım senaryosu gibi karar verdiren detayları ekle.",
            "En güçlü kanalda 1 hafta A/B test ile görsel + fiyat mesajını dene."
        ]
        if product_type == "trend/stil ürünü":
            sales_recipe.insert(0, "Görselleri 1:1 + kısa video formatına optimize et.")

        top_persona_names = ", ".join(p.name for p in top_personas[:3])
        marketing_advice = (
            f"Kanal odağı: {', '.join(channels)}. Mesaj dili {top_persona_names} personalarının beklentilerine göre kurulmalı."
        )

        description_advice = "Açıklamada ölçü/uyumluluk, malzeme, kullanım ve paket içeriği gibi karar kriterlerini netleştir."
        pricing_advice = "Fiyat hassasiyetini ölçmek için sınırlı süreli kupon veya ücretsiz kargo eşiği test edebilirsin."
        season_advice = "Sezon uyumunu güçlendirmek için başlık ve görsellerde mevsimsel kullanım senaryosu vurgula."

        improved_description = (
            f"{request.product_name} ({category_str} ürünü). "
            "Öne çıkan özellik: Hedef kitlenin kullanım beklentisine tam uyum. "
            "Malzeme/Ölçü/Uyumluluk kontrolleri yapılarak listelenmiştir. "
            "Kargo & iade kolaylığı ve müşteri memnuniyeti odaklı hizmet sunulmaktadır."
        )

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
