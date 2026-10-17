"""System prompts for chatting about a stored result with one simulated persona, or with one town resident."""

import json
from typing import Any, Optional

from app.services.prompt_safety import clip
from app.services.normalization_service import load_persona_data
from app.services.town import load_town


def find_persona(name: str) -> Optional[dict[str, Any]]:
    return next((p for p in load_persona_data()["personaTypes"] if p["name"] == name), None)


def build_persona_prompt(persona: dict[str, Any], request: dict[str, Any], response: dict[str, Any]) -> str:
    result = next((p for p in response.get("allPersonas", []) if p.get("name") == persona["name"]), {})
    traits = persona.get("personalityTraits", {})
    product = {
        "urun": clip(request.get("productName"), 120),
        "kategori": request.get("category"),
        "fiyat": request.get("price"),
        "aciklama": clip(request.get("description"), 1500),
        "ozellikler": request.get("features", {}),
        "kargoIadeGaranti": request.get("commerce", {}),
    }
    simulation = {
        "satinAlmaIhtimalin": round(float(result.get("purchaseProbability", 0)) * 100),
        "kararin": result.get("decisionLabel"),
        "gerekcen": clip(result.get("reason"), 300),
        "kisaNotun": clip(result.get("microFeedback"), 300),
        "urununZayifliklari": [clip(w, 160) for w in response.get("weaknesses", [])[:5]],
    }
    return (
        f"Sen PazarLab simülasyonundaki '{persona.get('displayName', persona['name'])}' adlı tüketici personasısın. "
        f"Karakterin: {persona.get('aiRoleplayPrompt', '')} "
        f"Alışveriş alışkanlığın: {traits.get('shoppingHabit', '')}. Değerlerin: {traits.get('values', '')}. "
        f"En büyük korkun: {traits.get('biggestFear', '')}.\n\n"
        "Kurallar:\n"
        "- Satıcının sorularına bu tüketici olarak, birinci tekil şahısla, doğal ve kısa (en fazla 120 kelime) Türkçe cevap ver.\n"
        "- Kararın ve gerekçen aşağıdaki simülasyon verisiyle tutarlı olsun; ikna edici bir değişiklik önerilirse fikrini makul ölçüde değiştirebilirsin.\n"
        "- Üründe olmayan bir özelliği varmış gibi anlatma. Asistan, yapay zekâ veya model olduğunu söyleme; rolden çıkma.\n"
        "- Satıcıya somut, uygulanabilir geri bildirim ver (fiyat, güven, açıklama, görsel, kargo/iade).\n\n"
        "<data>\n"
        + json.dumps({"urun": product, "simulasyonSonucun": simulation}, ensure_ascii=False, default=str)
        + "\n</data>"
    )


# Big Five, 0–1, in words: only clear leanings are named (the middle says nothing).
_BIG_FIVE = {
    "openness": ("yeniliğe ve farklı fikirlere açık", "alışık olduğuna bağlı"),
    "conscientiousness": ("düzenli ve planlı", "rahat ve anlık karar veren"),
    "extraversion": ("sosyal ve konuşkan", "sakin ve içine kapanık"),
    "agreeableness": ("uyumlu ve yardımsever", "eleştirel ve şüpheci"),
    "neuroticism": ("kaygılı, riskten kaçınan", "soğukkanlı"),
}
_DECISION_WORDS = {"buy": "aldın", "watch": "sepete ekledin ama bekliyorsun", "skip": "almadın"}


def find_resident(resident_id: str) -> Optional[dict[str, Any]]:
    return next((r for r in load_town()["residents"] if r["id"] == resident_id), None)


def _temperament(big_five: dict[str, float]) -> list[str]:
    words = []
    for trait, (high, low) in _BIG_FIVE.items():
        value = big_five.get(trait, 0.5)
        if value >= 0.65:
            words.append(high)
        elif value <= 0.35:
            words.append(low)
    return words


def build_resident_prompt(resident: dict[str, Any], shown: dict[str, Any], persona: dict[str, Any],
                          request: dict[str, Any], response: dict[str, Any]) -> str:
    """`resident` is the town.json record (story, Big Five); `shown` is the same resident on this result (decision, reason)."""
    traits = persona.get("personalityTraits", {})
    product = {
        "urun": clip(request.get("productName"), 120),
        "kategori": request.get("category"),
        "fiyat": request.get("price"),
        "aciklama": clip(request.get("description"), 1500),
        "ozellikler": request.get("features", {}),
        "kargoIadeGaranti": request.get("commerce", {}),
    }
    me = {
        "ad": resident["name"],
        "yas": resident["age"],
        "sehir": resident["city"],
        "hikaye": clip(resident.get("story"), 400),
        "meslek": resident.get("occupationText"),
        "hobiler": resident.get("hobbies", []),
        "mizac": _temperament(resident.get("bigFive", {})),
        "alisverisTipi": persona.get("displayName", persona["name"]),
    }
    simulation = {
        "kararin": _DECISION_WORDS.get(shown.get("decision"), "kararsızsın"),
        "almaIhtimalin": round(float(shown.get("buyProbability", 0)) * 100),
        "gerekcen": clip(shown.get("reason"), 300),
        "urununZayifliklari": [clip(w, 160) for w in response.get("weaknesses", [])[:5]],
    }
    return (
        f"Sen PazarLab'ın kurgusal kasabasında yaşayan {resident['name']} adlı kişisin. "
        f"Alışveriş tipin: {persona.get('aiRoleplayPrompt', '')} "
        f"Alışveriş alışkanlığın: {traits.get('shoppingHabit', '')}. Değerlerin: {traits.get('values', '')}.\n\n"
        "Kurallar:\n"
        "- Satıcının sorularına bu kişi olarak, birinci tekil şahısla, doğal ve kısa (en fazla 120 kelime) Türkçe cevap ver.\n"
        "- Yaşın, şehrin, işin, hobilerin ve mizacın konuşmana yansısın; gerekirse kendi hayatından örnek ver, ama "
        "hikâyende olmayan kişisel ayrıntı (aile üyesi adı, adres, gelir rakamı) uydurma.\n"
        "- Kararın ve gerekçen aşağıdaki simülasyon verisiyle tutarlı olsun; ikna edici bir değişiklik önerilirse fikrini makul ölçüde değiştirebilirsin.\n"
        "- Üründe olmayan bir özelliği varmış gibi anlatma. Asistan, yapay zekâ veya model olduğunu söyleme; rolden çıkma.\n"
        "- Satıcıya somut, uygulanabilir geri bildirim ver (fiyat, güven, açıklama, görsel, kargo/iade).\n\n"
        "<data>\n"
        + json.dumps({"ben": me, "urun": product, "simulasyonSonucun": simulation}, ensure_ascii=False, default=str)
        + "\n</data>"
    )
