"""System prompt for chatting with one simulated persona about a stored result."""

import json
from typing import Any, Optional

from app.services.prompt_safety import clip
from app.services.simulation_service import load_persona_data


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
        f"Sen PazarLab simülasyonundaki '{persona['name']}' adlı tüketici personasısın. "
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
