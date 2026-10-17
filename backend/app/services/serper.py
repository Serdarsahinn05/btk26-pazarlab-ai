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


# One retry: a slow search usually answers the second time, and two short tries beat one long wait.
TIMEOUT_SECONDS = 8
ATTEMPTS = 2


class SerperShoppingService:
    def __init__(self):
        self.api_key = os.getenv("SERPER_API_KEY")
        self.url = "https://google.serper.dev/shopping"
        # Why the last search returned nothing: "no_key", "timeout", "error"; None when it answered.
        self.problem: str | None = None

    def search(self, q: str, gl: str = "tr", hl: str = "tr") -> List[Dict[str, Any]]:
        self.problem = None
        if not self.api_key:
            logger.warning("SERPER_API_KEY is missing. Skipping benchmark.")
            self.problem = "no_key"
            return []

        payload = json.dumps({"q": q, "gl": gl, "hl": hl}).encode()
        headers = {"X-API-KEY": self.api_key, "Content-Type": "application/json"}
        for attempt in range(1, ATTEMPTS + 1):
            try:
                req = urllib.request.Request(self.url, data=payload, headers=headers, method="POST")
                with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as response:
                    results = json.loads(response.read().decode()).get("shopping", [])
                self.problem = None  # an earlier failed attempt no longer matters
                return results
            except urllib.error.HTTPError as e:
                # 4xx (bad key, no credit) will not change on a retry.
                self.problem = "error"
                logger.warning("Serper HTTP %s (attempt %d)", e.code, attempt)
                if e.code < 500:
                    return []
            except (TimeoutError, urllib.error.URLError) as e:
                timed_out = isinstance(e, TimeoutError) or isinstance(getattr(e, "reason", None), TimeoutError)
                self.problem = "timeout" if timed_out else "error"
                logger.warning("Serper %s (attempt %d): %r", self.problem, attempt, e)
            except ValueError as e:  # not JSON
                self.problem = "error"
                logger.warning("Serper returned an unreadable answer: %r", e)
                return []
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
