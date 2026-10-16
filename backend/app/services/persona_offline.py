"""Rule-based persona answers for when the AI is unavailable or the visitor's AI quota is used up (Faz 10b).

The persona answers from what the simulation already knows about it: its decision and reason, its traits,
the product's weaknesses and the product data itself. No model call, so it always works.
"""

import re
from typing import Any

from app.services.normalization_service import get_category_rule
from app.utils.text_utils import fold_text

# Checked in order; the first topic with a keyword hit wins. Keywords are folded ASCII (see fold_text).
TOPICS: list[tuple[str, tuple[str, ...]]] = [
    ("price", ("fiyat", "pahali", "ucuz", "indirim", "kupon", "kampanya", "lira", "tl", "butce", "para")),
    ("shipping", ("kargo", "teslim", "iade", "gonderi", "gec gel", "hizli gel")),
    ("trust", ("garanti", "guven", "marka", "orijinal", "fatura", "yorum", "puan", "sahte")),
    ("listing", ("aciklama", "bilgi", "detay", "gorsel", "foto", "resim", "video", "eksik", "baslik")),
    ("advice", ("ne yap", "nasil", "oner", "ikna", "degistir", "gelistir", "iyilestir", "tavsiye")),
    ("why", ("neden", "niye", "karar", "aldin", "almadin", "alir misin", "alirmisin", "dusun")),
]

DECISION = {
    "ALDI": "Şu hâliyle alırdım",
    "KARARSIZ": "Şu an kararsızım",
    "ALMADI": "Şu hâliyle almazdım",
}


def topic_of(question: str) -> str:
    text = fold_text(question)
    words = set(re.findall(r"[a-z0-9]+", text))
    for topic, keywords in TOPICS:
        # Short keywords ("tl") must be whole words; longer ones may be prefixes ("pahali" in "pahaliya").
        if any((k in words) if len(k) <= 3 else (k in text) for k in keywords):
            return topic
    return "general"


def rule_based_reply(persona: dict[str, Any], request: dict[str, Any], response: dict[str, Any], question: str) -> str:
    result = next((p for p in response.get("allPersonas", []) if p.get("name") == persona["name"]), {})
    probability = round(float(result.get("purchaseProbability", 0)) * 100)
    decision = f"{DECISION.get(result.get('decisionLabel'), 'Şu an kararsızım')} (alma ihtimalim %{probability})"
    traits = persona.get("personalityTraits", {})
    # `values` is a first-person-friendly noun phrase ("Popülerlik, estetik ve sosyal görünürlük");
    # `reason` texts are third person ("bu persona için…") and read oddly in a first-person answer.
    values = (traits.get("values") or "").strip()
    fear = (traits.get("biggestFear") or "").strip()
    advice = (result.get("advice") or persona.get("advice") or "").strip()
    weaknesses = [w for w in response.get("weaknesses", []) if w][:2]
    commerce = request.get("commerce", {}) or {}
    trust_low, trust_high = persona.get("ranges", {}).get("brandTrustNeed", [0, 0])
    trust_minded = (trust_low + trust_high) / 2 >= 0.7

    topic = topic_of(question)
    if topic == "price":
        lines = [_price_line(request), f"{decision}."]
        if "fiyat" in fold_text(advice):
            lines.append(advice)
    elif topic == "shipping":
        lines = [_shipping_line(commerce.get("shippingDays")), _returns_line(commerce.get("returnAvailable")), f"{decision}."]
    elif topic == "trust":
        lines = ["Garanti var, bu bana güven veriyor." if commerce.get("warranty") else "Garanti bilgisi görmedim, bu güvenimi azaltıyor.", f"{decision}."]
        if trust_minded and fear:
            lines.append(f"Açıkçası en büyük korkum {_lower_first(fear)}")
    elif topic == "listing":
        lines = [f"Gözüme takılan şu: {_lower_first(weaknesses[0])}" if weaknesses else "Açıklama ve görseller bana yeterli göründü.", f"{decision}."]
        if advice:
            lines.append(f"Benim yerime olsan şunu yapardım: {_lower_first(advice)}")
    elif topic == "advice":
        lines = [f"Beni ikna etmek istersen: {_lower_first(advice)}" if advice else "Bana fiyatı, kargoyu ve iadeyi net göster."]
        if weaknesses:
            lines.append(f"Bir de şuna dikkat et: {_lower_first(weaknesses[0])}")
    else:  # why / general
        lines = [f"{decision}."]
        if values:
            lines.append(f"Alışverişte benim için önemli olan: {_lower_first(values)}")
        if weaknesses:
            lines.append(f"Beni en çok düşündüren: {_lower_first(weaknesses[0])}")
    return " ".join(_sentence(line) for line in lines if line)


def _shipping_line(days: Any) -> str:
    if days is None:
        return "Kargo süresini göremedim, bu belirsizlik beni bekletir."
    if days <= 2:
        return f"Kargo {days} günde geliyor, bu çok iyi."
    if days <= 4:
        return f"Kargo {days} gün sürüyor, idare eder."
    return f"Kargo {days} gün sürüyor, bu bana uzun geliyor."


def _returns_line(available: Any) -> str:
    return "İade de var, bu beni rahatlatıyor." if available else "İade seçeneği görmüyorum, bu beni durdurur."


def _price_line(request: dict[str, Any]) -> str:
    price = float(request.get("price") or 0)
    average = float(get_category_rule(str(request.get("category"))).get("averagePrice") or 0)
    if not price or not average:
        return "Fiyatı tam değerlendiremiyorum."
    ratio = price / average
    feeling = "bana pahalı geliyor" if ratio > 1.25 else "uygun görünüyor" if ratio >= 0.75 else "ucuz, hatta biraz şüphe uyandırıyor"
    return f"{_tl(price)} TL; bu tür ürünlerde gördüğüm fiyatlar {_tl(average)} TL civarında, yani {feeling}"


def _tl(value: float) -> str:
    return f"{value:,.0f}".replace(",", ".")


def _lower_first(text: str) -> str:
    text = text.strip().rstrip(".")
    if not text:
        return text
    first = {"I": "ı", "İ": "i"}.get(text[0], text[0].lower())  # Turkish-aware first letter
    return first + text[1:]


def _sentence(text: str) -> str:
    text = text.strip()
    return text if text.endswith((".", "!", "?")) else text + "."
