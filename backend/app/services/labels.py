"""Human-readable Turkish labels for ids that end up in user-facing text (same wording as the form)."""

from app.services import categories
from app.services.normalization_service import load_persona_data

MOTIVATION_LABELS = {
    "stil_begeni": "stil / beğeni",
    "ihtiyac": "günlük ihtiyaç",
    "problem_cozme": "problem çözme",
    "yedek_parca_tamir": "yedek parça / tamir",
    "hediye": "hediye",
    "trend": "trend / sosyal medya",
    "profesyonel_kullanim": "profesyonel kullanım",
}

INCOME_LABELS = {"low": "ekonomik", "middle": "orta", "high": "premium"}


def category_label(category: str) -> str:
    return categories.label(category)


def motivation_label(motivation: str) -> str:
    return MOTIVATION_LABELS.get(motivation, motivation)


def income_label(level: str) -> str:
    return INCOME_LABELS.get(level, level)


def persona_label(name: str) -> str:
    """`name` is the stable id ("Trend Takipcisi"); `displayName` is what people read."""
    persona = next((p for p in load_persona_data()["personaTypes"] if p["name"] == name), None)
    return persona.get("displayName", name) if persona else name
