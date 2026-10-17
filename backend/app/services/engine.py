"""Simulation engine v2 (Faz 12b): the town's 500 residents decide with a willingness-to-pay + logistic model.

For every resident:
    q        non-price fit: product scores weighted by the category/motivation weights and by the
             resident's own sensitivities (same structure as v1, price taken out)
    wtp      willingness to pay: category average × income × price sensitivity × product quality ×
             a personal log-normal factor (fixed per resident and category)
    utility  INTERCEPT + Q_SLOPE·(q − Q_CENTER) + β·ln(wtp / price) − cheap suspicion + motivation + audience
    P        sigmoid(utility + noise), averaged over MONTE_CARLO_RUNS draws of noise and the buy roll

Word of mouth (Faz 12c): week 1 is the direct decision; in weeks 2–4 a resident whose friends bought gets
SOCIAL_WEIGHT × sociability × (share of friends who bought) added to the utility and may convert.
Sociability = mean of extraversion and agreeableness. The cumulative buyers per week form the adoption curve.

Why: in v1 price fit fell in both directions around the category average, so halving the price lost
buyers (B15). Here a lower price always raises ln(wtp/price); only quality-minded residents distrust a
price far below the average. All constants are ASSUMPTIONS, chosen so a typical listing lands in the
same score range as v1; calibrating them against real sales is Faz 19.
"""

from __future__ import annotations

import hashlib
import math
import random
import re
from typing import Any

from app.models.product import SimulationRequest
from app.models.simulation import NormalizedProduct
from app.services import categories
from app.services.normalization_service import get_category_rule
from app.services.town import residents_with_traits

ENGINE_VERSION = 2
MONTE_CARLO_RUNS = 30

INTERCEPT = -0.05
Q_CENTER = 0.55
Q_SLOPE = 4.2
NOISE_SD = 0.45
PRICE_UTILITY_CLIP = (-3.0, 1.2)
INCOME_WTP = {"low": 0.75, "middle": 1.0, "high": 1.45}
WTP_SPREAD = 0.30
CHEAP_RATIO = 0.6
CHEAP_PENALTY = 3.0
MOTIVATION_BONUS = 0.35
AUDIENCE_MATCH, AUDIENCE_MISS = 0.15, -0.20
WATCH_THRESHOLD = 0.40  # a non-buyer with P ≥ this "watches" (adds to cart, waits) instead of skipping
SOCIAL_WEIGHT = 1.1
SOCIAL_WEEKS = 3  # weeks 2–4 after the direct decision in week 1

# Product score → the resident trait that says how much they care about it (v1 mapping, price excluded).
SENSITIVITY = {
    "qualityScore": "qualityExpectation",
    "trendFit": "trendSensitivity",
    "brandTrust": "brandTrustNeed",
    "descriptionCompleteness": "detailNeed",
    "visualAppeal": "impulsiveness",
    "seasonFit": "seasonSensitivity",
    "shippingReturnScore": "shippingSensitivity",
    "targetAudienceFit": "targetFitSensitivity",
    "differentiationScore": "noveltySeeking",
}


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def _unit_normal(*parts: str) -> float:
    """A fixed N(0, 1) draw for a key (resident + category): stable across products, runs and processes."""
    digest = hashlib.sha256("|".join(parts).encode()).digest()
    u1 = (int.from_bytes(digest[:8], "big") + 1) / (2**64 + 2)
    u2 = int.from_bytes(digest[8:16], "big") / 2**64
    return math.sqrt(-2.0 * math.log(u1)) * math.cos(2 * math.pi * u2)


def _product_values(product: NormalizedProduct) -> dict[str, float]:
    return {
        "qualityScore": product.quality_score,
        "trendFit": product.trend_fit,
        "brandTrust": product.brand_trust,
        "descriptionCompleteness": product.description_completeness,
        "visualAppeal": product.visual_appeal,
        "seasonFit": product.season_fit,
        "shippingReturnScore": product.shipping_return_score,
        "targetAudienceFit": product.target_audience_fit,
        "differentiationScore": product.differentiation_score,
    }


def _age_range(text: str) -> tuple[int, int] | None:
    match = re.fullmatch(r"\s*(\d{2})\s*[-–]\s*(\d{2})\s*", text or "")
    return (int(match.group(1)), int(match.group(2))) if match else None


def _audience_term(request: SimulationRequest, resident: dict[str, Any], applicable: set[str]) -> float:
    """Residents inside the seller's stated target segment like the product more; outside, less."""
    audience = request.target_audience
    term = 0.0
    if "ageRange" in applicable and (span := _age_range(audience.age_range)):
        term += AUDIENCE_MATCH if span[0] <= resident["age"] <= span[1] else AUDIENCE_MISS
    if "gender" in applicable and audience.gender in {"kadin", "erkek"}:
        term += AUDIENCE_MATCH if resident["gender"] == audience.gender else AUDIENCE_MISS
    if "incomeLevel" in applicable and audience.income_level in {"low", "middle", "high"}:
        term += AUDIENCE_MATCH if resident["incomeLevel"] == audience.income_level else AUDIENCE_MISS / 2
    return term


def willingness_to_pay(resident: dict[str, Any], category: str, average_price: float, quality: float) -> float:
    traits = resident["traits"]
    personal = math.exp(WTP_SPREAD * _unit_normal(resident["id"], category, "wtp"))
    return average_price * INCOME_WTP[resident["incomeLevel"]] * (1.35 - 0.7 * traits["priceSensitivity"]) * (0.8 + 0.4 * quality) * personal


def run_town(
    request: SimulationRequest,
    product: NormalizedProduct,
    weights: dict[str, float],
    preferred: dict[str, list[str]],
    market_relevance: float,
    seed: int,
) -> dict[str, Any]:
    """Decisions of the whole town for one product. `seed` fixes the crowd's noise (price is not part of it)."""
    rule = get_category_rule(request.category)
    average_price = categories.reference_price(request.category, request.market_price, request.price)
    applicable = set(rule.get("applicableAudienceFields", []))
    price = float(request.price)
    values = _product_values(product)
    feature_weight = {k: weights.get(k, 0.0) for k in values}
    feature_total = sum(feature_weight.values()) or 1.0
    product_fit = sum(values[k] * feature_weight[k] for k in values) / feature_total
    beta_scale = 0.6 + 2.0 * weights.get("priceFit", 0.12)
    motivation = request.purchase_motivation.value
    ratio = price / average_price if average_price else 1.0

    residents = residents_with_traits()
    index = {r["id"]: i for i, r in enumerate(residents)}
    bases, wtps, parts, sociability = [], [], [], []
    for r in residents:
        t = r["traits"]
        cared = {k: feature_weight[k] * t[SENSITIVITY[k]] for k in values}
        cared_total = sum(cared.values()) or 1.0
        persona_fit = sum(values[k] * cared[k] for k in values) / cared_total
        q = 0.45 * product_fit + 0.55 * persona_fit
        wtp = willingness_to_pay(r, request.category, average_price, product.quality_score)
        beta = (0.6 + 1.6 * t["priceSensitivity"]) * beta_scale
        price_term = min(max(beta * math.log(wtp / price), PRICE_UTILITY_CLIP[0]), PRICE_UTILITY_CLIP[1])
        cheap = CHEAP_PENALTY * t["qualityExpectation"] * (CHEAP_RATIO - ratio) if ratio < CHEAP_RATIO else 0.0
        bonus = MOTIVATION_BONUS if motivation in preferred.get(r["persona"], []) else 0.0
        audience_term = _audience_term(request, r, applicable)
        fit_term = Q_SLOPE * (q - Q_CENTER)
        bases.append(INTERCEPT + fit_term + price_term - cheap + bonus + audience_term)
        wtps.append(wtp)
        # What moved this resident, for explanations ("bought because …"): signed utility parts, and the
        # product score that helped / hurt most from the resident's own point of view.
        contrib = {k: cared[k] / cared_total * (values[k] - 0.5) for k in values}
        parts.append({"fit": fit_term, "price": price_term, "cheap": -cheap, "motivation": bonus, "audience": audience_term,
                      "bestFeature": max(contrib, key=contrib.get), "worstFeature": min(contrib, key=contrib.get), "wtp": wtp})
        sociability.append((r["bigFive"]["extraversion"] + r["bigFive"]["agreeableness"]) / 2)

    n = len(residents)
    friends = [[index[f] for f in r.get("friends", []) if f in index] for r in residents]
    prob_sum = [0.0] * n
    buys = [0] * n
    social_sum = [0.0] * n
    weekly = [0.0] * (1 + SOCIAL_WEEKS)
    runs: list[dict[str, int]] = []
    for run in range(MONTE_CARLO_RUNS):
        rng = random.Random(seed * 1000 + run)
        noisy = [base + rng.gauss(0.0, NOISE_SD) for base in bases]
        probability = [_sigmoid(u) * market_relevance for u in noisy]
        bought = [rng.random() < p for p in probability]
        boost = [0.0] * n
        weekly[0] += sum(bought)
        for week in range(SOCIAL_WEEKS):
            snapshot = list(bought)
            for i in range(n):
                if snapshot[i] or not friends[i]:
                    continue
                share = sum(snapshot[f] for f in friends[i]) / len(friends[i])
                if share == 0:
                    continue
                boost[i] = SOCIAL_WEIGHT * sociability[i] * share
                boosted = _sigmoid(noisy[i] + boost[i]) * market_relevance
                # They already said no at `probability[i]`; convert with the extra probability only.
                if boosted > probability[i] and rng.random() < (boosted - probability[i]) / (1.0 - probability[i]):
                    bought[i] = True
                probability[i] = max(probability[i], boosted)
            weekly[week + 1] += sum(bought)
        counts = {"buy": 0, "watch": 0, "skip": 0}
        for i in range(n):
            prob_sum[i] += probability[i]
            social_sum[i] += boost[i]
            if bought[i]:
                counts["buy"] += 1
                buys[i] += 1
            else:
                counts["watch" if probability[i] >= WATCH_THRESHOLD else "skip"] += 1
        runs.append(counts)

    for i in range(n):
        parts[i]["social"] = social_sum[i] / MONTE_CARLO_RUNS
    too_expensive = sum(1 for w in wtps if w < price) / n
    buyer_runs = sorted(c["buy"] for c in runs)
    return {
        "residents": residents,
        "probability": [s / MONTE_CARLO_RUNS for s in prob_sum],
        "buyShare": [b / MONTE_CARLO_RUNS for b in buys],
        "parts": parts,
        "decisionCounts": _mean_counts(runs, n),
        "buyersLow": buyer_runs[int(0.1 * (MONTE_CARLO_RUNS - 1))],
        "buyersHigh": buyer_runs[int(round(0.9 * (MONTE_CARLO_RUNS - 1)))],
        "adoptionCurve": [round(w / MONTE_CARLO_RUNS) for w in weekly],
        "priceRisk": round(too_expensive, 2),
        "medianWtp": round(sorted(wtps)[n // 2], 2),
    }


def _mean_counts(runs: list[dict[str, int]], n: int) -> dict[str, int]:
    """Average decision counts over runs as integers that still add up to the town size (largest remainder)."""
    means = {k: sum(r[k] for r in runs) / len(runs) for k in ("buy", "watch", "skip")}
    counts = {k: int(v) for k, v in means.items()}
    for k in sorted(means, key=lambda k: means[k] - counts[k], reverse=True)[: n - sum(counts.values())]:
        counts[k] += 1
    return counts

