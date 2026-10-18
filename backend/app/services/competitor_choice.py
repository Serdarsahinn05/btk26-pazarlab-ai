"""Competitor choice (Faz 21): estimated share of the seller's product against 1–3 rivals on the same town.

Every option (the seller's product and each rival) is scored by the same engine (`engine.utilities`) and the
residents choose between them and "none" with a multinomial logit (`engine.run_choice`). No AI: every option
uses the rule-based input analysis, so the seller's product and a rival with the same text score the same.

A rival field left empty is copied from the seller's product and listed in `assumed`; with only a name and a
price (the Serper fallback) the rivals differ by price alone, which the result says ("equal quality").
"""

from __future__ import annotations

from typing import Any

from app.models.competitor import CompetitorInput
from app.models.product import CommerceInfo, ProductFeatures, SimulationRequest
from app.services import categories
from app.services.engine import MONTE_CARLO_RUNS, run_choice, utilities
from app.services.input_analysis_service import deterministic_analysis
from app.services.labels import persona_label
from app.services.normalization_service import normalize_product
from app.services.simulation_service import candidate_changes, town_context
from app.services.town import residents_with_traits
from app.services.town_insights import FEATURE_LABELS

MIN_DESCRIPTION = 40
# Field → Turkish name, for "assumed the same as yours" notes.
ASSUMED_LABELS = {
    "description": "açıklama",
    "features": "özellikler",
    "rating": "mağaza puanı",
    "shipping": "kargo süresi",
    "returns": "iade",
    "warranty": "garanti",
}


def competitor_request(own: SimulationRequest, rival: CompetitorInput) -> tuple[SimulationRequest, list[str]]:
    """The rival as a product of the same category, audience and reference price; plus what was assumed."""
    assumed: list[str] = []
    description = (rival.description or "").strip()
    if len(description) < MIN_DESCRIPTION:
        description = own.description
        assumed.append("description")
    features = ProductFeatures(**rival.features)
    if not features.model_dump(exclude_none=True):
        features = own.features
        assumed.append("features")
    rating, review_count = rival.rating, rival.review_count
    if rating is None and review_count is None:
        rating, review_count = own.rating, own.review_count
        assumed.append("rating")
    commerce = own.commerce
    updates: dict[str, Any] = {}
    for field, key in (("shipping_days", "shipping"), ("return_available", "returns"), ("warranty", "warranty")):
        value = getattr(rival, field)
        if value is None:
            assumed.append(key)
        else:
            updates[field] = value
    if "warranty" in updates and not updates["warranty"]:
        updates["warranty_months"] = None
    request = own.model_copy(update={
        "product_name": rival.name,
        "product_url": rival.url,
        "price": rival.price,
        "description": description,
        "features": features,
        "rating": rating,
        "review_count": review_count,
        "commerce": CommerceInfo.model_validate({**commerce.model_dump(), **updates}),
        "images": [],
        "input_analysis": None,
    })
    return request, assumed


def _option_bases(request: SimulationRequest, context: dict[str, Any]) -> tuple[list[float], list[dict[str, Any]], dict[str, float]]:
    product = normalize_product(request, deterministic_analysis(request).signals)
    bases, parts, _ = utilities(request, product, context["weights"], context["preferred"])
    values = {k: getattr(product, field) for k, field in _FEATURE_FIELDS.items()}
    return bases, parts, values


_FEATURE_FIELDS = {
    "qualityScore": "quality_score",
    "trendFit": "trend_fit",
    "brandTrust": "brand_trust",
    "descriptionCompleteness": "description_completeness",
    "visualAppeal": "visual_appeal",
    "seasonFit": "season_fit",
    "shippingReturnScore": "shipping_return_score",
    "targetAudienceFit": "target_audience_fit",
    "differentiationScore": "differentiation_score",
}


def _share_stats(runs: list[list[int]], index: int, n: int) -> dict[str, Any]:
    counts = sorted(run[index] for run in runs)
    mean = sum(counts) / len(counts)
    return {
        "share": round(mean / n, 4),
        "low": round(counts[int(0.1 * (len(counts) - 1))] / n, 4),
        "high": round(counts[int(round(0.9 * (len(counts) - 1)))] / n, 4),
        "residents": round(mean),
    }


def _reasons(own_parts, rival_parts, rival_probability, own_values, rival_values, weights) -> list[dict[str, Any]]:
    """Why residents lean to this rival: the price side or the product side of the utility, weighted by how
    likely each resident is to pick the rival. Only advantages count (a rival can win on one and lose on the other)."""
    price = fit = 0.0
    for own, rival, p in zip(own_parts, rival_parts, rival_probability):
        price += p * max((rival["price"] + rival["cheap"]) - (own["price"] + own["cheap"]), 0.0)
        fit += p * max(rival["fit"] - own["fit"], 0.0)
    total = price + fit
    if total < 1e-9:
        return []
    edge = {k: weights.get(k, 0.0) * (rival_values[k] - own_values[k]) for k in own_values}
    best = max(edge, key=edge.get)
    reasons = [
        {"key": "price", "label": "fiyat", "share": round(price / total, 2)},
        {"key": "fit", "label": "ürünün kendisi", "detail": FEATURE_LABELS[best] if edge[best] > 0 else None, "share": round(fit / total, 2)},
    ]
    return sorted((r for r in reasons if r["share"] > 0), key=lambda r: r["share"], reverse=True)


def _personas(probability: list[list[float]]) -> list[dict[str, Any]]:
    """Mean choice probabilities per shopping persona: [own, rivals…, none]."""
    groups: dict[str, list[int]] = {}
    for i, resident in enumerate(residents_with_traits()):
        groups.setdefault(resident["persona"], []).append(i)
    rows = []
    for persona, members in groups.items():
        shares = [sum(row[i] for i in members) / len(members) for row in probability]
        rows.append({"persona": persona_label(persona), "residents": len(members),
                     "shares": [round(s, 3) for s in shares] + [round(1 - sum(shares), 3)]})
    # Where the rivals take the most first: that is what the seller wants to see.
    return sorted(rows, key=lambda r: sum(r["shares"][1:-1]), reverse=True)


def _best_changes(own: SimulationRequest, context, rival_bases: list[list[float]], base_buyers: float, limit: int = 3) -> list[dict[str, Any]]:
    """The single-product improvements, tried against the rivals: which one wins back the most residents."""
    n = len(rival_bases[0])
    results = []
    for key, label, variant in candidate_changes(own):
        bases, _, _ = _option_bases(variant, context)
        runs = run_choice([bases, *rival_bases], context["market_relevance"], context["seed"])["runs"]
        buyers = sum(run[0] for run in runs) / len(runs)
        delta_buyers = round(buyers - base_buyers)
        delta_revenue = round(buyers * variant.price - base_buyers * own.price, 2)
        helps = delta_revenue > 0 if key == "price_up_10" else delta_buyers > 0
        if helps:
            results.append({"key": key, "label": label, "deltaBuyers": delta_buyers,
                            "deltaShare": round(delta_buyers / n, 4), "deltaRevenue": delta_revenue})
    return sorted(results, key=lambda r: (r["deltaBuyers"], r["deltaRevenue"]), reverse=True)[:limit]


def competitor_choice(own: SimulationRequest, rivals: list[CompetitorInput]) -> dict[str, Any]:
    own = categories.anchored(own.model_copy(update={"input_analysis": None, "images": []}))
    context = town_context(own)
    own_bases, own_parts, own_values = _option_bases(own, context)
    rival_rows = []
    for index, rival in enumerate(rivals, start=1):
        request, assumed = competitor_request(own, rival)
        bases, parts, values = _option_bases(request, context)
        rival_rows.append({"key": f"c{index}", "input": rival, "request": request, "assumed": assumed,
                           "bases": bases, "parts": parts, "values": values})

    rival_bases = [row["bases"] for row in rival_rows]
    choice = run_choice([own_bases, *rival_bases], context["market_relevance"], context["seed"])
    runs, probability = choice["runs"], choice["probability"]
    n = len(own_bases)

    options = [{"key": "own", "name": own.product_name, "price": own.price, **_share_stats(runs, 0, n), "assumed": [], "equalQuality": False}]
    for j, row in enumerate(rival_rows, start=1):
        assumed = row["assumed"]
        options.append({
            "key": row["key"],
            "name": row["input"].name,
            "price": row["input"].price,
            "url": row["input"].url,
            **_share_stats(runs, j, n),
            "assumed": [ASSUMED_LABELS[a] for a in assumed],
            # Only a name and a price known: the rivals differ by price alone.
            "equalQuality": set(assumed) == set(ASSUMED_LABELS),
            "reasons": _reasons(own_parts, row["parts"], probability[j], own_values, row["values"], context["weights"]),
        })
    base_buyers = sum(run[0] for run in runs) / len(runs)
    return {
        "options": options,
        "none": _share_stats(runs, len(rival_rows) + 1, n),
        "personas": _personas(probability),
        "bestChanges": _best_changes(own, context, rival_bases, base_buyers),
        "simulatedConsumers": n,
        "runs": MONTE_CARLO_RUNS,
    }
