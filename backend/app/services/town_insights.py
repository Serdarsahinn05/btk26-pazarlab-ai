"""Readable views of a town run (Faz 12c): segments, representative residents and why they decided.

No AI: explanations are built from the utility parts the engine recorded for each resident.
"""

from __future__ import annotations

from typing import Any

from app.services.engine import WATCH_THRESHOLD
from app.services.labels import persona_label

FEATURE_LABELS = {
    "qualityScore": "kalite",
    "trendFit": "trend uyumu",
    "brandTrust": "marka güveni",
    "descriptionCompleteness": "açıklamanın doyuruculuğu",
    "visualAppeal": "görsel çekicilik",
    "seasonFit": "sezon uyumu",
    "shippingReturnScore": "kargo ve iade koşulları",
    "targetAudienceFit": "hedef kitle uyumu",
    "differentiationScore": "farklılık",
}
AGE_BANDS = [(18, 24, "18–24"), (25, 34, "25–34"), (35, 44, "35–44"), (45, 54, "45–54"), (55, 120, "55+")]
LABELS = {
    "gender": {"kadin": "Kadın", "erkek": "Erkek"},
    "incomeLevel": {"low": "Ekonomik", "middle": "Orta", "high": "Premium"},
    "cityType": {"buyuksehir": "Büyükşehir", "sehir": "Şehir", "ilce": "İlçe"},
}


def _age_band(age: int) -> str:
    return next(label for low, high, label in AGE_BANDS if low <= age <= high)


def segments(town: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    """Buy rate per age band, gender, income level and kind of place."""
    groups: dict[str, dict[str, list[float]]] = {"age": {}, "gender": {}, "incomeLevel": {}, "cityType": {}}
    for resident, share in zip(town["residents"], town["buyShare"]):
        groups["age"].setdefault(_age_band(resident["age"]), []).append(share)
        for key in ("gender", "incomeLevel", "cityType"):
            groups[key].setdefault(resident[key], []).append(share)
    order = {"age": [b[2] for b in AGE_BANDS], **{k: list(v) for k, v in LABELS.items()}}
    return {
        dimension: [
            {"label": LABELS.get(dimension, {}).get(value, value), "residents": len(groups[dimension][value]),
             "buyRate": round(sum(groups[dimension][value]) / len(groups[dimension][value]), 3)}
            for value in order[dimension] if value in groups[dimension]
        ]
        for dimension in groups
    }


def _decision(share: float, probability: float) -> str:
    return "buy" if share >= 0.5 else "watch" if probability >= WATCH_THRESHOLD else "skip"


def explain(parts: dict[str, Any], decision: str) -> str:
    """One Turkish sentence with the strongest reasons in the direction of the decision.

    buy → strongest pros, skip → strongest cons, watch → one of each."""
    reasons: list[tuple[float, int, str]] = []  # (strength, sign, text)
    if parts["price"] >= 0.3:
        reasons.append((parts["price"], 1, "fiyat bütçesine uygun"))
    elif parts["price"] <= -0.3:
        reasons.append((-parts["price"], -1, f"fiyatı pahalı buluyor (en fazla {parts['wtp']:,.0f} TL verirdi)".replace(",", ".")))
    if parts["fit"] >= 0.3:
        reasons.append((parts["fit"], 1, f"en çok {FEATURE_LABELS[parts['bestFeature']]} hoşuna gidiyor"))
    elif parts["fit"] <= -0.3:
        reasons.append((-parts["fit"], -1, f"{FEATURE_LABELS[parts['worstFeature']]} onu tatmin etmiyor"))
    if parts["cheap"] <= -0.2:
        reasons.append((-parts["cheap"], -1, "bu kadar ucuz olmasından şüpheleniyor"))
    if parts["audience"] >= 0.15:
        reasons.append((parts["audience"], 1, "ürün tam onun gibi biri için"))
    elif parts["audience"] <= -0.15:
        reasons.append((-parts["audience"], -1, "ürünün kendisine hitap etmediğini düşünüyor"))
    if parts["social"] >= 0.15:
        reasons.append((parts["social"], 1, "arkadaşlarının aldığını gördü"))
    if parts["motivation"] > 0:
        reasons.append((parts["motivation"] * 0.5, 1, "aradığı türden bir ürün"))

    ranked = sorted(reasons, reverse=True)
    pros = [text for _, sign, text in ranked if sign > 0]
    cons = [text for _, sign, text in ranked if sign < 0]
    chosen = {"buy": pros[:2], "skip": cons[:2], "watch": pros[:1] + cons[:1]}[decision] or [text for *_, text in ranked[:1]]
    verb = {"buy": "Aldı", "watch": "Sepete ekledi ama bekliyor", "skip": "Almadı"}[decision]
    return f"{verb}: {', '.join(chosen)}." if chosen else f"{verb}."


# explain() in the resident's own voice (resident chat without AI). Keep in step with explain().
_FIRST_PERSON_VERBS = {"Aldı": "Aldım", "Sepete ekledi ama bekliyor": "Sepete ekledim ama bekliyorum", "Almadı": "Almadım"}
_FIRST_PERSON_PHRASES = [
    ("fiyat bütçesine uygun", "fiyat bütçeme uygun"),
    ("pahalı buluyor (", "pahalı buluyorum ("),
    ("TL verirdi)", "TL verirdim)"),
    ("hoşuna gidiyor", "hoşuma gidiyor"),
    ("onu tatmin etmiyor", "beni tatmin etmiyor"),
    ("olmasından şüpheleniyor", "olmasından şüpheleniyorum"),
    ("tam onun gibi biri için", "tam benim gibi biri için"),
    ("kendisine hitap etmediğini düşünüyor", "bana hitap etmediğini düşünüyorum"),
    ("arkadaşlarının aldığını gördü", "arkadaşlarımın aldığını gördüm"),
    ("aradığı türden bir ürün", "aradığım türden bir ürün"),
]


def first_person(reason: str) -> str:
    """explain()'s sentence as the resident would say it: "Almadı: fiyatı pahalı buluyor." → "Almadım: fiyatı pahalı buluyorum."."""
    verb, colon, rest = reason.partition(":")
    end = "." if not colon and verb.endswith(".") else ""
    verb = _FIRST_PERSON_VERBS.get(verb.rstrip("."), verb.rstrip(".")) + end
    for third, first in _FIRST_PERSON_PHRASES:
        rest = rest.replace(third, first)
    return verb + colon + rest


def representatives(town: dict[str, Any], count: int = 5) -> list[dict[str, Any]]:
    """A small cast for the result screen: the clearest buyers, one undecided, the clearest refusals.

    Different personas where possible, so the cast shows the town's variety."""
    rows = list(zip(town["residents"], town["probability"], town["buyShare"], town["parts"]))
    by_share = sorted(rows, key=lambda row: (row[2], row[1]), reverse=True)
    # The undecided one should really be "watching": not bought, but close to it. Fall back to the closest call.
    watching = [row for row in rows if _decision(row[2], row[1]) == "watch"]
    middle = sorted(watching, key=lambda row: row[1], reverse=True) or sorted(rows, key=lambda row: abs(row[2] - 0.5))

    picked: list[tuple] = []
    personas: set[str] = set()

    def take(candidates, how_many):
        taken = 0
        for row in candidates:
            if taken == how_many:
                break
            if row[0]["id"] in {p[0]["id"] for p in picked} or row[0]["persona"] in personas:
                continue
            picked.append(row)
            personas.add(row[0]["persona"])
            taken += 1

    take(by_share, 2)
    take(middle, max(count - 4, 1))
    take(reversed(by_share), 2)
    out = []
    for resident, probability, share, parts in picked[:count]:
        decision = _decision(share, probability)
        out.append({
            "id": resident["id"],
            "name": resident["name"],
            "age": resident["age"],
            "city": resident["city"],
            "occupation": resident["occupationText"],
            "persona": persona_label(resident["persona"]),
            "story": resident["story"],
            "buyProbability": round(probability, 2),
            "decision": decision,
            "reason": explain(parts, decision),
        })
    return out
