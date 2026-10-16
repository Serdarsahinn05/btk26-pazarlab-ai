from __future__ import annotations

import logging
from typing import Any, Dict, List

from app.models.category import BEAUTY, CLOTHING, FASHION_ACCESSORIES, TECH
from app.models.product import SimulationRequest
from app.models.simulation import AiInsights, NormalizedProduct, PersonaFeedback, PersonaResult
from app.services import llm_client
from app.services.labels import category_label, income_label, motivation_label, persona_label
from app.utils.scoring_utils import infer_product_type, recommend_channels
from app.utils.text_utils import fold_text

logger = logging.getLogger("ai_insights")


SYSTEM_PROMPT = """
Sen PazarLab AI için ajan tabanlı bir e-ticaret analiz kurulusun. Tek cevap üretmeden önce 5 uzmanı sırayla çalıştır:
1) Skor hakemi: verilen skorların ne anlama geldiğini gerçek dönüşüm oranı gibi abartmadan yorumlar.
2) Persona stratejisti: topPersonas ve allPersonas listesinden hangi kitlelerin neden ikna olduğunu/olmadığını ayırır.
3) Listeleme doktoru: başlık, açıklama, görsel, güven, kargo/iade ve teknik detay eksiklerini bulur.
4) Kanal planlayıcı: pazarlama kanalını, mesaj dilini ve 7 günlük test planını seçilen motivasyona göre kurar.
5) Risk denetçisi: girdi uyarı sinyallerini ve zayıflıkları dikkate alır; emin olmadığı yerde satıcıya doğrulama önerir.

Ürün bilgisi:
- Kategori: {category}
- Satın alma motivasyonu: {purchaseMotivation}
- Pazar genişliği skoru: {marketBreadthScore}/100
- Satın alma niyeti skoru: {intentConversionScore}/100
- İhtiyaç/problem uyumu skoru: {problemSolutionFit}/100

Kurallar:
- Bütün metinleri doğal Türkçeyle ve Türkçe karakterlerle (ç, ğ, ı, İ, ö, ş, ü) yaz; harfleri ASCII'ye çevirme.
- Küçük/orta ölçekli satıcının uygulayabileceği net aksiyonlar yaz.
- Genel, tekrar eden, şablon gibi cümleler kullanma: "açıklamayı güçlendir", "sosyal medya kullan" tek başına yasak.
- Her öneride en az bir somut nesne olsun: hangi alan, hangi mesaj, hangi kanal, hangi test, hangi kanıt?
- Satın alma niyeti skorunu gerçek site dönüşüm oranı gibi yorumlama; bu skor fiyat, güven, açıklama ve teknik detaylardan türetilmiş eğilim skorudur.
- Zayıf girdi varsa sonucu fazla kesin anlatma; önce hangi verinin doğrulanması gerektiğini söyle.
- Niş ürünlerde (pazar genişliği < 40) geniş kitle reklamı yerine arama niyeti yüksek kullanıcıları vurgula.
- Persona yorumları: allPersonas listesindeki her persona için karakterine uygun, birinci şahıs ağzından, birbirinden farklı 1-2 cümle yaz. Her yorumda o personanın karar sebebi geçsin.
- personaFeedback.name alanına allPersonas içindeki name değerini aynen yaz.
- personaFeedback.action alanına satıcının o personayı ikna etmek için yapacağı tek kritik dokunuşu yaz.
- Cevabı SADECE JSON formatında döndür. Başka metin ekleme.

{{
  "summary": "2 cümle: skorların anlamı + en kritik risk/fırsat",
  "productTypeInsight": "Ürün tipi, kitle genişliği ve satın alma motivasyonu yorumu",
  "salesRecipe": ["4-5 maddelik sıralı aksiyon listesi; her madde uygulanabilir ve ölçülebilir"],
  "marketingAdvice": "Kanal + kreatif açısı + hedef persona + 7 günlük test mantığı",
  "descriptionAdvice": "Açıklamada hangi bilgi eksik ve hangi sırayla eklenmeli",
  "pricingAdvice": "Fiyat algısı, kampanya/kupon/kargo testi ve ne zaman indirim yapılmamalı",
  "seasonAdvice": "Sezon, kampanya dönemi veya teknoloji ürünlerinde dönemsel talep yorumu",
  "channelRecommendation": ["Instagram", "TikTok", "Google Search", "SEO"],
  "improvedDescription": "Satıcının doğrudan kullanabileceği, ürün özelliklerine dayalı, abartısız açıklama",
  "personaFeedback": [
    {{"name": "Persona adı", "feedback": "Ben diliyle karar yorumu", "action": "Bu personayı ikna edecek tek kritik dokunuş"}}
  ]
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


def _persona_brief(persona: PersonaResult) -> Dict[str, Any]:
    return {
        "name": persona.name,
        "purchaseProbability": round(persona.purchase_probability, 2),
        "decisionLabel": persona.decision_label,
        "reason": persona.reason,
        "microFeedback": persona.micro_feedback,
    }


def generate_insights(
    request: SimulationRequest,
    normalized_product: NormalizedProduct,
    overall_score: int,
    market_breadth_score: int,
    intent_conversion_score: int,
    problem_solution_fit: int,
    top_personas: list[PersonaResult],
    all_personas: list[PersonaResult],
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
        # Only what the model needs: full persona dumps (traits etc.) made the prompt slow.
        "topPersonas": [_persona_brief(p) for p in top_personas],
        "allPersonas": [_persona_brief(p) for p in all_personas],
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
        model_json = llm_client.generate_json(prompt, payload, temperature=0.4, timeout=60)
        summary_str = str(model_json.get("summary", "")).strip() or "Genel değerlendirme hazır."
        pt_insight = str(model_json.get("productTypeInsight", "") or model_json.get("product_type_insight", "")).strip() or "Ürün tipi yorumu hazır."
        recipe = list(model_json.get("salesRecipe", []) or model_json.get("sales_recipe", []))[:5] or ["Listeleme ve açıklamayı güçlendir."]
        m_advice = str(model_json.get("marketingAdvice", "") or model_json.get("marketing_advice", "")).strip() or "Kanal stratejisini belirle."
        d_advice = str(model_json.get("descriptionAdvice", "") or model_json.get("description_advice", "")).strip() or "Açıklamayı netleştir."
        p_advice = str(model_json.get("pricingAdvice", "") or model_json.get("pricing_advice", "")).strip() or "Fiyat duyarlılığını test et."
        s_advice = str(model_json.get("seasonAdvice", "") or model_json.get("season_advice", "")).strip() or "Sezon uyumunu vurgula."
        ch_rec = list(model_json.get("channelRecommendation", []) or model_json.get("channel_recommendation", [])) or recommend_channels(motivation_str, float(market_breadth_score))
        imp_desc = str(model_json.get("improvedDescription", "") or model_json.get("improved_description", "")).strip() or "İyileştirilmiş açıklama hazır."
        persona_feedback = _parse_persona_feedback(model_json.get("personaFeedback") or model_json.get("persona_feedback"), all_personas)

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
            persona_feedback=persona_feedback,
            ai_generated=True,
        )
    except Exception as exc:
        logger.warning("AI insights unavailable, using rule-based fallback: %r", exc)
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
            f"Bu ürün \"{motivation_label(motivation_str)}\" motivasyonuyla alınan bir {product_type}. {motivation_line}{niche_note}"
        )

        sales_recipe = _build_sales_recipe(
            request=request,
            product_type=product_type,
            channels=channels,
            weakness_signals=weakness_signals,
            market_breadth_score=market_breadth_score,
        )

        top_persona_names = ", ".join(persona_label(p.name) for p in top_personas[:3])
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
        persona_feedback = _build_persona_feedback(all_personas)

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
            persona_feedback=persona_feedback,
        )


def _parse_persona_feedback(raw_value: Any, all_personas: list[PersonaResult]) -> list[PersonaFeedback]:
    valid_names = {persona.name for persona in all_personas}
    # The model may echo a persona name with Turkish letters ("Trend Takipçisi"); match it to the id either way.
    by_folded = {fold_text(name): name for name in valid_names}
    if not isinstance(raw_value, list):
        return _build_persona_feedback(all_personas)

    feedback_items: list[PersonaFeedback] = []
    for item in raw_value:
        if not isinstance(item, dict):
            continue
        name = by_folded.get(fold_text(str(item.get("name", "")).strip()))
        if name is None:
            continue
        feedback = str(item.get("feedback", "")).strip()
        action = str(item.get("action", "")).strip()
        if feedback:
            feedback_items.append(PersonaFeedback(name=name, feedback=feedback[:160], action=action[:120]))

    missing_names = valid_names.difference({item.name for item in feedback_items})
    fallback_by_name = {item.name: item for item in _build_persona_feedback(all_personas)}
    feedback_items.extend(fallback_by_name[name] for name in missing_names if name in fallback_by_name)
    return sorted(feedback_items, key=lambda item: next((p.rank for p in all_personas if p.name == item.name), 999))


def _build_persona_feedback(all_personas: list[PersonaResult]) -> list[PersonaFeedback]:
    return [
        PersonaFeedback(
            name=persona.name,
            feedback=_fallback_persona_voice(persona),
            action=_fallback_persona_action(persona),
        )
        for persona in all_personas
    ]


def _fallback_persona_voice(persona: PersonaResult) -> str:
    probability = persona.purchase_probability
    decision = persona.decision
    # Folded, because profiles are Turkish ("Müfettiş") and the keywords below are ASCII.
    profile = fold_text(persona.personality_type or persona.name)
    name = fold_text(persona.name)
    base_reason = persona.micro_feedback or persona.reason

    if "fiyat" in name or "hesap" in profile:
        if decision == "buy":
            return "Benim için fiyat-fayda dengesi net görünüyor; ekstra kargo sürprizi yoksa sepete atarım."
        return "Ben önce toplam maliyete bakarım; kupon veya ücretsiz kargo görmeden beklerim."
    if "trend" in name or "heves" in profile:
        if probability >= 0.55:
            return "Görsel ve trend hissi beni yakalar; kombin/video örneği görürsem daha hızlı karar veririm."
        return "Ürün ilgimi çekebilir ama sosyal kanıt ve daha canlı görsel olmadan heyecanlanmam."
    if "kalite" in name or "mufettis" in profile:
        if probability >= 0.55:
            return "Malzeme ve garanti bilgisi yeterince netse daha pahalı olsa bile düşünürüm."
        return "Kalite kanıtı eksikse sadece güzel görünmesi beni ikna etmez."
    if "detay" in name or "analist" in profile or "teknik" in profile:
        if probability >= 0.55:
            return "Ölçü, teknik detay ve kullanım senaryosu açık olduğu için karar vermem kolaylaşır."
        return "Ben tablo, ölçü ve uyumluluk görmeden satın almam; eksik bilgi risk demek."
    if "marka" in name or "guven" in profile:
        if probability >= 0.55:
            return "Garanti, iade ve fatura bilgisi güven verirse markayı daha rahat denerim."
        return "Marka veya satıcı güveni net değilse fiyatı iyi olsa bile geri dururum."
    if "premium" in name or "statu" in profile:
        if probability >= 0.55:
            return "Sunum kaliteli ve ürün kendini özel hissettiriyorsa premium fiyatı kabul edebilirim."
        return "Premium algı için paketleme, malzeme ve marka hikâyesi daha güçlü olmalı."
    if decision == "buy":
        return f"Benim ihtiyacıma uyuyor; {base_reason}"
    if decision == "skip":
        return f"Şu hâliyle beni tam ikna etmiyor; {base_reason}"
    return f"Kararsız kalırım; {base_reason}"


def _fallback_persona_action(persona: PersonaResult) -> str:
    name = fold_text(persona.name)
    if "fiyat" in name or "sepet" in name:
        return "Toplam fiyat, kargo ve kupon bilgisini ilk ekranda göster."
    if "trend" in name or "durtu" in name:
        return "İlk görseli kısa video/kombin veya kullanım sahnesiyle test et."
    if "kalite" in name or "premium" in name:
        return "Malzeme, garanti ve kalite kanıtını açıklamanın ilk paragrafına al."
    if "detay" in name or "problem" in name or "teknik" in name:
        return "Ölçü, uyumluluk ve teknik özellikleri tablo gibi okunur hâle getir."
    if "marka" in name or "sosyal" in name:
        return "Yorum, iade, fatura ve satıcı güveni sinyallerini görünür yap."
    return persona.advice


def _build_sales_recipe(
    request: SimulationRequest,
    product_type: str,
    channels: List[str],
    weakness_signals: List[str],
    market_breadth_score: int,
) -> List[str]:
    features = request.features
    category = str(request.category)
    first_channel = channels[0] if channels else "en güçlü kanal"
    recipe = [
        f"Başlığı '{request.product_name}' + ana fayda + hedef kullanım senaryosu şeklinde netleştir.",
        "İlk görselde ürünün karar verdiren özelliğini göster: kıyafette kalıp/renk, teknolojide ekran-batarya-performans.",
        f"{first_channel} için 7 günlük A/B test kur: bir varyant fayda odaklı, diğeri fiyat/güven odaklı olsun.",
        "İade, kargo ve garanti/fatura bilgisini fiyat alanına yakın gösterecek şekilde listelemeyi düzenle.",
    ]
    if category in TECH:
        recipe.insert(1, "Teknik özellikleri karşılaştırılabilir yaz: model, kapasite, pil, ekran ve garanti aynı blokta dursun.")
    if category in CLOTHING:
        recipe.insert(1, "Beden/kalıp bilgisini ve gerçek kullanım/kombin senaryosunu açıklamanın ilk 2 satırına al.")
    if category == "ayakkabi":
        recipe.insert(1, "Numara tablosunu, kalıbın dar/geniş olduğunu ve taban malzemesini açıklamanın ilk satırlarına al; yandan ve tabandan görsel ekle.")
    if category == "canta":
        recipe.insert(1, "Ölçüleri ve neyin sığdığını (laptop, A4, su şişesi) gösteren bir görsel ekle; bölmeleri ve askıyı tek blokta yaz.")
    if category in BEAUTY:
        recipe.insert(1, "İçerik listesini, cilt tipi uyumunu ve hacmi ilk satırlara al; dermatolojik test veya sertifika varsa ilk görselde göster.")
    if "price_sensitive_users_rejected" in weakness_signals or market_breadth_score < 50:
        recipe.append("Fiyat bariyerini ölçmek için ücretsiz kargo veya kupon varyantını ana fiyatı düşürmeden test et.")
    if product_type == "trend/stil ürünü" and getattr(features, "colors", None):
        recipe.append("Renk varyantlarını ayrı görsel setleriyle test et; tek ilanda tüm renkleri gizleme.")
    return recipe[:5]


def _build_marketing_advice(
    category: str,
    product_type: str,
    channels: List[str],
    top_persona_names: str,
    market_breadth_score: int,
    intent_conversion_score: int,
) -> str:
    channel_text = ", ".join(channels) if channels else "pazar yeri içi arama ve sosyal medya"
    if category in TECH:
        angle = "teknik kanıt + güven + karşılaştırma"
    elif category in CLOTHING:
        angle = "stil, beden uyumu ve gerçek kullanım görselleri"
    elif category in FASHION_ACCESSORIES:
        angle = "stil, malzeme kalitesi ve gerçek kullanımda çekilmiş görseller"
    elif category in BEAUTY:
        angle = "içerik şeffaflığı, cilt tipi uyumu ve gerçek kullanıcı yorumları"
    else:
        angle = "net fayda ve güven"
    scope = "geniş kitle kreatifleri" if market_breadth_score >= 55 else "arama niyeti yüksek, daha dar bir kitle"
    return (
        f"Kanal odağı: {channel_text}. Mesaj dili {angle} üzerine kurulsun. "
        f"{scope} ile başla; satın alma niyeti skoru {intent_conversion_score}/100 olduğu için personalar ({top_persona_names}) bazında iki farklı metin test et."
    )


def _build_description_advice(request: SimulationRequest, normalized_product: NormalizedProduct) -> str:
    if normalized_product.description_completeness >= 0.75:
        return "Açıklama temelde güçlü; ilk paragrafı daha net fayda, ikinci paragrafı teknik/beden detayları olacak şekilde düzenle."
    if request.category in TECH:
        return "Açıklamaya model, kapasite, pil/ekran, garanti-fatura ve kimler için uygun olduğunu tablo gibi okunacak netlikte ekle."
    if request.category == "ayakkabi":
        return "Açıklamaya saya ve taban malzemesini, numara aralığını, kalıbın dar/geniş olduğunu, kullanım alanını ve iade bilgisini ayrı cümlelerle ekle."
    if request.category == "canta":
        return "Açıklamaya ölçüleri, malzemeyi, bölme sayısını, askı tipini ve neyin sığdığını ayrı cümlelerle ekle."
    if request.category in BEAUTY:
        return "Açıklamaya öne çıkan içerikleri, cilt/saç tipini, hacmi, kullanım şeklini ve test/sertifika bilgisini ayrı cümlelerle ekle."
    return "Açıklamaya kumaş, kalıp, beden aralığı, sezon, kombin/kullanım senaryosu ve iade bilgisini ayrı cümlelerle ekle."


def _build_pricing_advice(request: SimulationRequest, normalized_product: NormalizedProduct) -> str:
    if normalized_product.price_risk >= 0.45:
        return "Fiyat algısı riskli. Ana fiyatı hemen düşürmek yerine kupon, set indirimi veya ücretsiz kargo varyantı test et."
    if normalized_product.price_fit >= 0.75:
        return "Fiyat kategori ortalamasına yakın görünüyor. Premium algı için garanti, kalite kanıtı ve hızlı kargo mesajını fiyatla birlikte göster."
    return "Fiyat testi için iki varyant yeterli: mevcut fiyat + güven vurgusu ve küçük indirim + aciliyet mesajı."


def _build_season_advice(request: SimulationRequest, normalized_product: NormalizedProduct) -> str:
    category = request.category
    season = getattr(request.features, "season", None)
    if category in TECH:
        return "Teknoloji ürünlerinde sezon etkisi düşük; okul dönemi, yılbaşı, maaş haftası ve kampanya dönemleri ayrı test edilmeli."
    if normalized_product.season_fit >= 0.80:
        return f"Sezon uyumu güçlü ({season or 'belirtilen sezon'}). Başlık, ilk görsel ve kampanya metninde bu kullanım dönemini öne çıkar."
    return "Sezon uyumu zayıfsa ürünü indirim/alternatif kullanım senaryosuyla konumlandır; ana reklam bütçesini sezon zirvesine sakla."


def _build_improved_description(request: SimulationRequest, category_str: str) -> str:
    features = request.features
    feature_parts = []
    for label, value in [
        ("Marka/model", getattr(features, "brand", None)),
        ("Kumaş", getattr(features, "fabric", None)),
        ("Malzeme", getattr(features, "material", None)),
        ("Taban", getattr(features, "sole_material", None)),
        ("İçerik", getattr(features, "ingredients", None)),
        ("Cilt tipi", getattr(features, "skin_type", None)),
        ("Hacim", getattr(features, "volume", None)),
        ("Ölçü", getattr(features, "dimensions", None)),
        ("Kalıp", getattr(features, "fit", None)),
        ("Beden", getattr(features, "size_range", None)),
        ("Ekran", getattr(features, "screen_size", None)),
        ("RAM", getattr(features, "ram", None)),
        ("Depolama", getattr(features, "storage", None)),
        ("Batarya", getattr(features, "battery", None)),
        ("Kullanım", getattr(features, "use_case", None)),
    ]:
        if value:
            feature_parts.append(f"{label}: {value}")
    details = "; ".join(feature_parts[:6]) or "ürün detayları açık ve karar vermeyi kolaylaştıracak şekilde sunulur"
    trust = "Garanti/fatura bilgisi ve kolay iade seçeneğiyle güvenli alışveriş desteklenir." if request.commerce.warranty else "Kolay iade ve net kargo bilgisiyle satın alma riski azaltılır."
    return (
        f"{request.product_name}, {category_label(category_str)} kategorisinde {income_label(request.target_audience.income_level)} fiyat segmenti için konumlanan bir üründür. "
        f"{details}. {request.description.strip()} {trust}"
    )
