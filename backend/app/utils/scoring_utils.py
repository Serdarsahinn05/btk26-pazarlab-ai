from __future__ import annotations

import json
import math
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Literal, Mapping, Tuple


ScoreKey = Literal[
    "priceFit",
    "qualityScore",
    "trendFit",
    "brandTrust",
    "descriptionCompleteness",
    "visualAppeal",
    "seasonFit",
    "shippingReturnScore",
    "targetAudienceFit",
    "differentiationScore",
]


def clamp01(x: float) -> float:
    return 0.0 if x < 0.0 else 1.0 if x > 1.0 else x


def weighted_sum(values: Mapping[str, float], weights: Mapping[str, float]) -> float:
    total = 0.0
    wsum = 0.0
    for k, w in weights.items():
        if k not in values:
            continue
        total += float(values[k]) * float(w)
        wsum += float(w)
    if wsum <= 0:
        return 0.0
    return total / wsum


def normalize_weights(weights: Mapping[str, float]) -> Dict[str, float]:
    s = sum(float(w) for w in weights.values())
    if s <= 0:
        return {k: 0.0 for k in weights.keys()}
    return {k: float(w) / s for k, w in weights.items()}


@dataclass(frozen=True)
class PersonaTemplate:
    persona: str
    age_min: int
    age_max: int
    income_weights: Dict[str, float]
    ranges: Dict[str, Tuple[float, float]]


def _pick_weighted(rng: random.Random, weights: Mapping[str, float]) -> str:
    items = list(weights.items())
    total = sum(max(0.0, float(w)) for _, w in items)
    if total <= 0:
        return items[0][0] if items else "mid"
    r = rng.random() * total
    acc = 0.0
    for k, w in items:
        acc += max(0.0, float(w))
        if r <= acc:
            return k
    return items[-1][0]


def _sample_range(rng: random.Random, lo: float, hi: float, jitter: float = 0.0) -> float:
    if hi < lo:
        lo, hi = hi, lo
    val = lo + (hi - lo) * rng.random()
    if jitter:
        val += (rng.random() - 0.5) * 2.0 * jitter
    return clamp01(val)


def load_persona_templates(personas_json_path: str | Path) -> Tuple[int, int, int, List[PersonaTemplate]]:
    p = Path(personas_json_path)
    data = json.loads(p.read_text(encoding="utf-8"))
    meta = data["meta"]
    target_total = int(meta["targetTotalBots"])
    bots_per = int(meta["generation"]["botsPerPersona"])
    seed = int(meta["generation"]["seed"])
    templates: List[PersonaTemplate] = []
    for t in data["personaTemplates"]:
        age_min, age_max = int(t["ageRange"][0]), int(t["ageRange"][1])
        templates.append(
            PersonaTemplate(
                persona=str(t["persona"]),
                age_min=age_min,
                age_max=age_max,
                income_weights=dict(t["incomeWeights"]),
                ranges={k: (float(v[0]), float(v[1])) for k, v in t["ranges"].items()},
            )
        )
    return target_total, bots_per, seed, templates


def generate_bots_from_templates(personas_json_path: str | Path) -> List[Dict[str, Any]]:
    target_total, bots_per, seed, templates = load_persona_templates(personas_json_path)
    rng = random.Random(seed)

    bots: List[Dict[str, Any]] = []
    bot_idx = 1
    for template in templates:
        for i in range(bots_per):
            age = rng.randint(template.age_min, template.age_max)
            income = _pick_weighted(rng, template.income_weights)
            params = {
                k: _sample_range(rng, lo, hi, jitter=0.015)
                for k, (lo, hi) in template.ranges.items()
            }
            bots.append(
                {
                    "id": f"bot_{bot_idx:04d}",
                    "persona": template.persona,
                    "age": age,
                    "incomeLevel": income,
                    **params,
                }
            )
            bot_idx += 1

    if len(bots) != target_total:
        bots = bots[:target_total]
    return bots


def infer_product_type(purchase_motivation: str) -> str:
    m = (purchase_motivation or "").strip().lower()
    if m in {"stil_begeni", "trend"}:
        return "trend/stil ürünü"
    if m in {"problem_cozme", "yedek_parca_tamir"}:
        return "problem çözüm/yedek parça ürünü"
    if m in {"hediye"}:
        return "hediye ürünü"
    return "ihtiyaç ürünü"


def recommend_channels(purchase_motivation: str, market_breadth_score: float) -> List[str]:
    product_type = infer_product_type(purchase_motivation)
    breadth = float(market_breadth_score)

    if breadth < 40:
        if product_type in {"problem çözüm/yedek parça ürünü", "ihtiyaç ürünü"}:
            return ["Google Search", "SEO", "Pazar yeri araması"]
        return ["Pazar yeri araması", "SEO"]

    if product_type == "trend/stil ürünü":
        return ["Instagram", "TikTok"]
    if product_type == "hediye ürünü":
        return ["Instagram", "TikTok", "Pazar yeri içi optimizasyon"]
    if product_type == "problem çözüm/yedek parça ürünü":
        return ["Google Search", "SEO", "Pazar yeri araması"]
    return ["Google Search", "SEO", "Pazar yeri içi optimizasyon"]


def score_overall(normalized_product: Mapping[str, float], weights: Mapping[str, float]) -> int:
    w = normalize_weights(weights)
    score01 = weighted_sum(normalized_product, w)
    return int(round(100.0 * clamp01(score01)))
