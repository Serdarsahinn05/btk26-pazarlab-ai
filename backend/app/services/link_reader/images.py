"""Picking the product's own images out of everything a page shows."""

from __future__ import annotations

import logging
import re
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, List, Optional, Set, Tuple


logger = logging.getLogger("product_scraper")


class ImageProcessor:
    """
    Extracts ONLY product gallery images.
    Uses trusted references (JSON-LD, meta) to identify the real product images
    and filters out logos, banners, icons, and decorative images.
    """

    # Minimal blacklist for obvious junk
    BLACKLIST = ["pixel", "tracking", "sprite", "loader", "spinner", "placeholder"]

    @classmethod
    def extract_product_images(
        cls,
        all_sources: List[Any],
        trusted_references: List[str],
        max_images: int = 12,
    ) -> List[str]:
        """
        Surgical extraction based on 'Gold Standard' (trusted_references).
        If we have reliable sources, we strictly filter everything else.
        """
        # 1. Start with Gold Standard
        gold_urls = [r for r in trusted_references if isinstance(r, str) and r.startswith(("http", "//"))]
        gold_urls = list(dict.fromkeys(gold_urls)) # Dedup
        
        # Build signatures for the gold standard
        gold_sigs = {cls._url_signature(u) for u in gold_urls}
        
        # 2. If we already have enough gold images, don't even look at the messy HTML tags
        # Amazon/n11 usually have 1-5 gold images in JSON-LD/AI
        if len(gold_urls) >= 5:
            return gold_urls[:max_images]

        # 3. Process all sources with a high similarity bar
        candidates: List[Tuple[int, str]] = []
        seen_urls = set(gold_urls)
        
        for src in all_sources:
            # Flatten/Normalize source
            items = src if isinstance(src, list) else [src]
            for item in items:
                processed = cls._process_source(item, gold_sigs)
                for score, url in processed:
                    if url not in seen_urls:
                        # CRITICAL: If we have gold images, the similarity bar is VERY high
                        # This blocks random banners and logos that don't look like our product
                        if gold_sigs and score < 600: 
                            continue
                        
                        seen_urls.add(url)
                        candidates.append((score, url))

        # 4. Merge: Gold first, then best of candidates
        candidates.sort(key=lambda x: x[0], reverse=True)
        final_list = gold_urls + [url for score, url in candidates]
        
        # 5. Final deduplication based on normalized URL (remove size suffixes)
        result: List[str] = []
        norm_seen = set()
        for url in final_list:
            norm = re.sub(r'[_/-]\d+x\d+(?=[._])', '', url.lower())
            if norm not in norm_seen:
                norm_seen.add(norm)
                result.append(url)
                if len(result) >= max_images:
                    break
                    
        return result

    @classmethod
    def _process_source(cls, src: Any, gold_sigs: Set[str]) -> List[Tuple[int, str]]:
        if isinstance(src, str):
            url = src.strip()
            attrs = {}
        elif isinstance(src, dict):
            url = (src.get("data-src") or src.get("data-original") or src.get("data-lazy-src") or 
                   src.get("src") or src.get("url") or src.get("contentUrl") or "")
            attrs = src
        else:
            return []

        if not url or not isinstance(url, str):
            return []
        url_lower = url.lower().strip()

        if any(kw in url_lower for kw in cls.BLACKLIST):
            return []
        if url_lower.endswith((".svg", ".gif", ".ico", ".js", ".css")):
            return []
        if not url_lower.startswith(("http://", "https://", "//")):
            return []

        score = 0
        sig = cls._url_signature(url)

        # Similarity to Gold Standard is the #1 signal
        if sig in gold_sigs:
            score += 2000
        elif gold_sigs:
            for g_sig in gold_sigs:
                sim = cls._path_similarity(sig, g_sig)
                if sim > 0.85: # Very strict similarity
                    score += 1000
                elif sim > 0.6: # Moderate similarity
                    score += 300
        
        # Secondary signals (only used if gold images are missing or few)
        if not gold_sigs:
            # Traditional scoring as fallback
            width = cls._extract_int(attrs.get("width"))
            height = cls._extract_int(attrs.get("height"))
            if (width and width >= 400) or (height and height >= 400):
                score += 300
            if attrs.get("data-src") or attrs.get("data-original"):
                score += 200
            if any(w in url_lower for w in ["product", "urun", "item", "large", "full"]):
                score += 100

        return [(score, url)] if score > 0 else []

    @staticmethod
    def _url_signature(url: str) -> str:
        """Extract a comparable signature from URL (domain + normalized path)."""
        url = url.strip().lower()
        if url.startswith("//"):
            url = "https:" + url
        parsed = urllib.parse.urlparse(url)
        # Remove common size suffixes for comparison
        path = re.sub(r'[_/-]\d+x\d+', '', parsed.path)
        # Remove extension
        path = re.sub(r'\.(jpg|jpeg|png|webp|gif)$', '', path)
        return f"{parsed.netloc}{path}"

    @staticmethod
    def _path_similarity(sig1: str, sig2: str) -> float:
        """Simple path similarity for grouping gallery images."""
        parts1 = sig1.split("/")
        parts2 = sig2.split("/")
        if not parts1 or not parts2:
            return 0.0
        # Compare directory structure
        min_len = min(len(parts1), len(parts2))
        matches = sum(1 for i in range(min_len) if parts1[i] == parts2[i])
        return matches / max(len(parts1), len(parts2))

    @staticmethod
    def _extract_int(val: Any) -> Optional[int]:
        if not val:
            return None
        try:
            return int(str(val).replace("px", "").replace("%", "").strip())
        except ValueError:
            return None
