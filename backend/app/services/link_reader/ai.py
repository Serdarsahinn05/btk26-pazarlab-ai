"""LLM fallback that reads fields the page does not structure."""

from __future__ import annotations

import logging
from typing import Any, Dict

from app.services import llm_client

from app.services.link_reader.html_parse import HTMLCleaner, PriceEngine
from app.services.link_reader.models import ScraperConfig

logger = logging.getLogger("product_scraper")


class GeminiAIExtractor:
    SYSTEM_PROMPT = """
    You are the Product Page Extraction Council for PazarLab AI. Work as 4 specialized agents, then return one JSON:
    1) Identity agent: identify title, brand, model, category and availability from trustworthy product-page text.
    2) Commerce agent: extract current price, original price and currency. Do not invent price if it is not visible.
    3) Specification agent: extract all decision-making specs from tables, bullets and product detail sections.
    4) Media agent: select only real product gallery images, not logos, banners, badges, avatars or decorative images.

    Critical rules:
    - Prefer JSON-LD, product detail tables, visible product title/price and gallery data over generic meta tags.
    - If the page is blocked or data is uncertain, leave fields null instead of guessing.
    - Keep feature keys close to the original marketplace labels, but values must be short and clean.
    - For technology products, prioritize model, processor, RAM, storage, display, battery, connectivity, warranty and OS.
    - For clothing, prioritize fabric, fit, size range, season, color, care and use case.
    - Description must summarize concrete product facts from the page, not marketing filler.
    - Images must be absolute URLs when possible; include 1-8 best product photos.

    Return ONLY valid JSON:
    {
      "title": "string or null",
      "description": "string or null",
      "price": number or null,
      "original_price": number or null,
      "currency": "TRY/USD/EUR or null",
      "brand": "string or null",
      "category": "string or null",
      "availability": "string or null",
      "sku": "string or null",
      "mpn": "string or null",
      "images": ["url1"],
      "variants": [{"color":"Red","size":"M","price":123}],
      "features": {"RAM":"8 GB", "Ekran":"10.9 inch"}
    }
    """

    def __init__(self, config: ScraperConfig):
        self.config = config

    def extract(self, html: str) -> Dict[str, Any]:
        if not llm_client.is_configured():
            return {}
        cleaned_html = HTMLCleaner.clean(html, self.config.ai_html_max_bytes)
        result = llm_client.generate_json(self.SYSTEM_PROMPT, cleaned_html, temperature=0.1)
        if not isinstance(result, dict):
            raise ValueError("AI response is not a JSON object.")
        return self._normalize_ai_response(result)

    @staticmethod
    def _normalize_ai_response(result: Dict[str, Any]) -> Dict[str, Any]:
        normalized = dict(result)

        for key in ["price", "original_price"]:
            val = normalized.get(key)
            if val is not None:
                parsed, _ = PriceEngine.parse_price(val)
                normalized[key] = parsed

        # Images normalization & Universal Flattening
        raw_images = normalized.get("images", [])
        images = []
        def deep_flatten(item):
            if isinstance(item, list):
                for i in item:
                    deep_flatten(i)
            elif isinstance(item, str) and item.strip():
                images.append(item.strip())
            elif isinstance(item, dict):
                # Sometimes image is a dict with 'url' key
                url = item.get("url") or item.get("src") or item.get("hiRes")
                if url:
                    deep_flatten(url)
        
        deep_flatten(raw_images)
        normalized["images"] = images

        variants = normalized.get("variants", [])
        if isinstance(variants, dict):
            variants = [variants]
        normalized["variants"] = [v for v in variants if isinstance(v, dict)]

        features = normalized.get("features", {})
        if not isinstance(features, dict):
            normalized["features"] = {}

        cat = normalized.get("category")
        if isinstance(cat, str):
            normalized["category"] = cat.lower().strip()

        return normalized
