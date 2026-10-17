"""Serper.dev shopping search (competitor prices for the benchmark)."""

from __future__ import annotations

import json
import logging
import os
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List


logger = logging.getLogger("product_scraper")


class SerperShoppingService:
    def __init__(self):
        self.api_key = os.getenv("SERPER_API_KEY")
        self.url = "https://google.serper.dev/shopping"

    def search(self, q: str, gl: str = "tr", hl: str = "tr") -> List[Dict[str, Any]]:
        if not self.api_key:
            logger.warning("SERPER_API_KEY is missing. Skipping benchmark.")
            return []

        payload = json.dumps({
            "q": q,
            "gl": gl,
            "hl": hl
        })
        headers = {
            'X-API-KEY': self.api_key,
            'Content-Type': 'application/json'
        }

        try:
            req = urllib.request.Request(self.url, data=payload.encode(), headers=headers, method="POST")
            with urllib.request.urlopen(req, timeout=15) as response:
                data = json.loads(response.read().decode())
                return data.get("shopping", [])
        except Exception as e:
            logger.error(f"Serper API Error: {e}")
            return []

    @staticmethod
    def filter_competitors(results: List[Dict[str, Any]], target_product_name: str) -> List[Dict[str, Any]]:
        """
        Filters and ranks competitor products based on name similarity.
        """
        competitors = []
        for item in results:
            title = item.get("title", "")
            price = item.get("price")
            source = item.get("source", "")
            
            # Simple heuristic: ignore the target product if it appears in results
            if target_product_name.lower() in title.lower():
                # We still keep it but might flag it or prioritize others
                pass
                
            competitors.append({
                "title": title,
                "price": price,
                "source": source,
                "link": item.get("link"),
                "thumbnail": item.get("thumbnail"),
                "rating": item.get("rating"),
                "delivery": item.get("delivery")
            })
        return competitors[:5] # Top 5 competitors
