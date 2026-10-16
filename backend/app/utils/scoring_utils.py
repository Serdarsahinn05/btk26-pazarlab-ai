from __future__ import annotations

from typing import List


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
