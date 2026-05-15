from __future__ import annotations

import ipaddress
import json
import logging
import os
import random
import re
import socket
import time
import urllib.error
import urllib.parse
import urllib.request
import html as html_module
from dataclasses import dataclass, field
from enum import Enum
from html.parser import HTMLParser
from typing import Any, Dict, List, Optional, Set, Tuple

try:
    import cloudscraper
except ImportError:
    cloudscraper = None

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("product_scraper")


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class ScraperConfig:
    max_html_bytes: int = 5_000_000
    ai_html_max_bytes: int = 300_000
    request_timeout: float = 25.0
    fallback_timeout: float = 15.0
    gemini_timeout: float = 20.0
    max_retries: int = 3
    retry_backoff_base: float = 1.5
    retry_jitter: bool = True
    rate_limit_rpm: int = 15
    user_agent_bot: str = (
        "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
    )
    user_agent_browser: str = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    )
    default_gemini_model: str = field(default_factory=lambda: os.getenv("GEMINI_MODEL", "gemini-1.5-flash"))
    gemini_api_key: Optional[str] = field(default_factory=lambda: os.getenv("GEMINI_API_KEY"))
    domain_currency_hints: Dict[str, str] = field(default_factory=lambda: {
        ".tr": "TRY", ".com.tr": "TRY", ".de": "EUR", ".fr": "EUR",
        ".co.uk": "GBP", ".uk": "GBP", ".com": "USD", ".jp": "JPY",
    })


# ---------------------------------------------------------------------------
# Domain Models
# ---------------------------------------------------------------------------
class SourceType(str, Enum):
    METADATA = "metadata"
    JSON_LD = "json_ld"
    AI_ENHANCED = "ai_enhanced"
    FALLBACK = "fallback"
    HYBRID = "hybrid"


@dataclass
class ProductVariant:
    name: Optional[str] = None
    color: Optional[str] = None
    size: Optional[str] = None
    material: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    availability: Optional[str] = None
    sku: Optional[str] = None


@dataclass
class ProductLinkReadResponse:
    url: str
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    original_price: Optional[float] = None
    currency: Optional[str] = None
    image: Optional[str] = None
    images: List[str] = field(default_factory=list)
    brand: Optional[str] = None
    category: Optional[str] = None
    features: Dict[str, Any] = field(default_factory=dict)
    availability: Optional[str] = None
    sku: Optional[str] = None
    mpn: Optional[str] = None
    gtin: Optional[str] = None
    variants: List[ProductVariant] = field(default_factory=list)
    source: str = SourceType.FALLBACK.value
    warnings: List[str] = field(default_factory=list)


class ScrapingError(Exception):
    pass


class URLValidationError(ScrapingError):
    pass


class BotProtectionError(ScrapingError):
    pass


class AIQuotaError(ScrapingError):
    pass


class AIRateLimitError(ScrapingError):
    pass


def _is_private_address(address: Any) -> bool:
    return (
        address.is_private
        or address.is_loopback
        or address.is_link_local
        or address.is_reserved
        or address.is_multicast
        or address.is_unspecified
    )


# ---------------------------------------------------------------------------
# Rate Limiter
# ---------------------------------------------------------------------------
class RateLimiter:
    def __init__(self, max_requests: int, window_seconds: float = 60.0):
        self.max_requests = max_requests
        self.window = window_seconds
        self._tokens: float = float(max_requests)
        self._last_update = time.monotonic()

    def acquire(self) -> bool:
        now = time.monotonic()
        elapsed = now - self._last_update
        self._tokens = min(
            self.max_requests,
            self._tokens + elapsed * (self.max_requests / self.window),
        )
        self._last_update = now
        if self._tokens >= 1.0:
            self._tokens -= 1.0
            return True
        return False

    def wait_time(self) -> float:
        if self._tokens >= 1.0:
            return 0.0
        return (1.0 - self._tokens) * (self.window / self.max_requests)


# ---------------------------------------------------------------------------
# HTML Parser (Enhanced)
# ---------------------------------------------------------------------------
class ProductPageParser(HTMLParser):
    __slots__ = (
        "title_parts", "meta", "json_ld", "app_json", "_in_title",
        "_in_json_ld", "_in_app_json", "_script_buffer", "_current_script_type",
        "_all_images"
    )

    def __init__(self) -> None:
        super().__init__()
        self.title_parts: List[str] = []
        self.meta: Dict[str, str] = {}
        self.json_ld: List[str] = []
        self.app_json: List[str] = []
        self._in_title = False
        self._in_json_ld = False
        self._in_app_json = False
        self._script_buffer: List[str] = []
        self._current_script_type: Optional[str] = None
        self._all_images: List[Dict[str, str]] = []

    def handle_starttag(self, tag: str, attrs: List[Tuple[str, Optional[str]]]) -> None:
        attrs_dict = {k.lower(): (v or "") for k, v in attrs}
        tag_lower = tag.lower()

        if tag_lower == "title":
            self._in_title = True
        elif tag_lower == "meta":
            key = attrs_dict.get("property") or attrs_dict.get("name")
            content = attrs_dict.get("content")
            if key and content:
                self.meta[key.lower()] = content.strip()
        elif tag_lower == "script":
            self._current_script_type = attrs_dict.get("type", "").lower()
            if self._current_script_type == "application/ld+json":
                self._in_json_ld = True
                self._script_buffer = []
            elif self._current_script_type == "application/json":
                self._in_app_json = True
                self._script_buffer = []
        elif tag_lower == "img":
            self._all_images.append(attrs_dict)

    def handle_endtag(self, tag: str) -> None:
        tag_lower = tag.lower()
        if tag_lower == "title":
            self._in_title = False
        elif tag_lower == "script":
            script = "".join(self._script_buffer).strip()
            if self._in_json_ld and script:
                self.json_ld.append(script)
            elif self._in_app_json and script:
                self.app_json.append(script)
            self._in_json_ld = False
            self._in_app_json = False
            self._current_script_type = None

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self.title_parts.append(data.strip())
        elif self._in_json_ld or self._in_app_json:
            self._script_buffer.append(data)

    def error(self, message: str) -> None:
        logger.warning(f"HTML Parser error: {message}")


# ---------------------------------------------------------------------------
# Price & Currency Engine
# ---------------------------------------------------------------------------
class PriceEngine:
    CURRENCY_SYMBOLS: Dict[str, List[str]] = {
        "TRY": ["₺", "tl", "try", "türk lirası", "türk liras"],
        "USD": ["$", "usd", "dollar", "dollars", "us$"],
        "EUR": ["€", "eur", "euro", "euros", "€uro"],
        "GBP": ["£", "gbp", "pound", "pounds", "sterling"],
        "JPY": ["¥", "jpy", "yen", "yen"],
    }

    PRICE_RE = re.compile(
        r"(?:^|\s|[₺$€£¥])"
        r"(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?"
        r"|\d+(?:[.,]\d{1,2})?)"
        r"(?:\s|[₺$€£¥]|TL|USD|EUR|GBP|JPY|%|$)?",
        re.IGNORECASE,
    )

    @classmethod
    def extract_currency(cls, text: Optional[str]) -> Optional[str]:
        if not text:
            return None
        text_lower = text.lower()
        for currency, symbols in cls.CURRENCY_SYMBOLS.items():
            if any(sym in text_lower for sym in symbols):
                return currency
        return None

    @classmethod
    def parse_price(cls, value: Any) -> Tuple[Optional[float], Optional[str]]:
        if value is None:
            return None, None
        if isinstance(value, (int, float)):
            return float(value), None

        text = str(value).strip()
        if not text:
            return None, None

        currency = cls.extract_currency(text)
        clean_text = text.replace("\xa0", " ").replace("\u202f", " ")
        matches = cls.PRICE_RE.findall(clean_text)
        if not matches:
            return None, currency

        parsed_values = []
        for raw in matches:
            parsed = cls._parse_single_number(raw)
            if parsed is not None:
                parsed_values.append(parsed)

        if not parsed_values:
            return None, currency
        return parsed_values[0], currency

    @staticmethod
    def _parse_single_number(raw: str) -> Optional[float]:
        raw = raw.strip()
        if not raw:
            return None

        comma_count = raw.count(",")
        dot_count = raw.count(".")

        if comma_count > 0 and dot_count > 0:
            if raw.rfind(",") > raw.rfind("."):
                raw = raw.replace(".", "").replace(",", ".")
            else:
                raw = raw.replace(",", "")
        elif "," in raw and "." not in raw:
            parts = raw.split(",")
            if len(parts[-1]) == 2 and len(parts[0]) > 1:
                raw = raw.replace(",", ".")
            else:
                raw = raw.replace(",", "")
        else:
            raw = raw.replace(",", "")

        try:
            return float(raw)
        except ValueError:
            return None

    @classmethod
    def find_sale_and_original(
        cls, values: List[Any]
    ) -> Tuple[Optional[float], Optional[float], Optional[str]]:
        prices: List[Tuple[float, Optional[str]]] = []
        for v in values:
            price, curr = cls.parse_price(v)
            if price is not None:
                prices.append((price, curr))

        if not prices:
            return None, None, None

        prices.sort(key=lambda x: x[0])
        currency = prices[0][1] or (prices[-1][1] if len(prices) > 1 else None)

        if len(prices) == 1:
            return prices[0][0], None, currency

        sale = prices[0][0]
        original = prices[-1][0]
        if original > sale * 1.15:
            return sale, original, currency
        else:
            return sale, None, currency


# ---------------------------------------------------------------------------
# JSON-LD Extractor
# ---------------------------------------------------------------------------
class JSONLDExtractor:
    @classmethod
    def extract(cls, scripts: List[str]) -> Dict[str, Any]:
        for script in scripts:
            for item in cls._iter_json_objects(script):
                product = cls._find_product_object(item)
                if product and isinstance(product, dict):
                    return cls._parse_product(product)
        return {}

    @staticmethod
    def _iter_json_objects(script: str) -> List[Any]:
        try:
            data = json.loads(script)
        except json.JSONDecodeError:
            cleaned = re.sub(r"[\x00-\x1f]+", " ", script)
            try:
                data = json.loads(cleaned)
            except json.JSONDecodeError:
                return []
        return data if isinstance(data, list) else [data]

    @classmethod
    def _find_product_object(cls, data: Any) -> Optional[Dict[str, Any]]:
        if isinstance(data, list):
            for item in data:
                found = cls._find_product_object(item)
                if found:
                    return found
        elif isinstance(data, dict):
            type_value = data.get("@type")
            types = type_value if isinstance(type_value, list) else [type_value] if type_value else []
            if "Product" in types:
                return data
            if graph := data.get("@graph"):
                return cls._find_product_object(graph)
            for v in data.values():
                if isinstance(v, (dict, list)):
                    found = cls._find_product_object(v)
                    if found:
                        return found
        return None

    @classmethod
    def _parse_product(cls, product: Dict[str, Any]) -> Dict[str, Any]:
        result: Dict[str, Any] = {}

        result["title"] = product.get("name")
        result["description"] = product.get("description")
        result["brand"] = cls._extract_brand(product.get("brand"))
        result["sku"] = product.get("sku")
        result["mpn"] = product.get("mpn")
        result["gtin"] = product.get("gtin") or product.get("gtin13") or product.get("gtin14") or product.get("isbn")

        image_data = product.get("image")
        images = []
        
        def collect_urls(data):
            if isinstance(data, list):
                for item in data: collect_urls(item)
            elif isinstance(data, str):
                if data.startswith(("http", "//")): images.append(data)
            elif isinstance(data, dict):
                # Trendyol style: {"contentUrl": [...]} or {"url": "..."}
                url = data.get("contentUrl") or data.get("url")
                if url: collect_urls(url)

        collect_urls(image_data)
        
        result["images"] = images
        result["image"] = images[0] if images else None

        offers = product.get("offers")
        sale_price, original_price, currency, availability = cls._parse_offers(offers)
        result["price"] = sale_price
        result["original_price"] = original_price
        result["currency"] = currency
        result["availability"] = availability

        variants = []
        has_variant = product.get("hasVariant", [])
        if isinstance(has_variant, dict):
            has_variant = [has_variant]
        for variant in has_variant if isinstance(has_variant, list) else []:
            if isinstance(variant, dict):
                v = cls._parse_variant(variant)
                if v:
                    variants.append(v)
        result["variants"] = variants

        result["category"] = product.get("category") or product.get("additionalType")

        # --- TECHNICAL SPECS (Gold Mine: additionalProperty) ---
        features = {}
        props = product.get("additionalProperty", [])
        if isinstance(props, list):
            for prop in props:
                if isinstance(prop, dict):
                    name = prop.get("name")
                    # Value can be in 'value' or 'unitText' (Trendyol style)
                    val = prop.get("value") or prop.get("unitText")
                    if name and val:
                        features[name] = val
        
        if features:
            # We don't map keys here yet, will do in ProductLinkReader.read
            result["features"] = features

        return {k: v for k, v in result.items() if v not in (None, "", [])}

    @staticmethod
    def _extract_brand(brand: Any) -> Optional[str]:
        if isinstance(brand, str):
            return brand
        if isinstance(brand, dict):
            return brand.get("name")
        return None

    @classmethod
    def _parse_offers(cls, offers: Any) -> Tuple[Optional[float], Optional[float], Optional[str], Optional[str]]:
        if not offers:
            return None, None, None, None

        if isinstance(offers, dict):
            offers = [offers]
        elif not isinstance(offers, list):
            return None, None, None, None

        all_prices: List[Any] = []
        currency: Optional[str] = None
        availability: Optional[str] = None

        for offer in offers:
            if not isinstance(offer, dict):
                continue

            av = offer.get("availability", "")
            if isinstance(av, str) and av:
                availability = av.split("/")[-1]

            price = offer.get("price")
            if price:
                all_prices.append(price)

            price_spec = offer.get("priceSpecification")
            if isinstance(price_spec, dict):
                ps_price = price_spec.get("price")
                if ps_price:
                    all_prices.append(ps_price)
                ps_currency = price_spec.get("priceCurrency")
                if ps_currency:
                    currency = ps_currency
            elif isinstance(price_spec, list):
                for ps in price_spec:
                    if isinstance(ps, dict):
                        ps_price = ps.get("price")
                        if ps_price:
                            all_prices.append(ps_price)
                        ps_currency = ps.get("priceCurrency")
                        if ps_currency:
                            currency = ps_currency

            unit_price = offer.get("unitPriceSpecification")
            if isinstance(unit_price, dict):
                up_price = unit_price.get("price")
                if up_price:
                    all_prices.append(up_price)

            if "AggregateOffer" in str(offer.get("@type", "")):
                low_price = offer.get("lowPrice")
                high_price = offer.get("highPrice")
                if low_price:
                    all_prices.append(low_price)
                if high_price:
                    all_prices.append(high_price)

            offer_currency = offer.get("priceCurrency")
            if offer_currency:
                currency = offer_currency

        sale, original, inferred_currency = PriceEngine.find_sale_and_original(all_prices)
        final_currency = currency or inferred_currency

        return sale, original, final_currency, availability

    @classmethod
    def _parse_variant(cls, variant: Dict[str, Any]) -> Optional[ProductVariant]:
        if not isinstance(variant, dict):
            return None

        type_val = variant.get("@type", "")
        if isinstance(type_val, list):
            type_val = type_val[0] if type_val else ""

        color = None
        size = None
        material = None
        name = variant.get("name")

        props = variant.get("additionalProperty", [])
        if isinstance(props, dict):
            props = [props]
        for prop in props if isinstance(props, list) else []:
            if isinstance(prop, dict):
                prop_name = prop.get("name", "").lower()
                prop_val = prop.get("value")
                if prop_val:
                    if any(x in prop_name for x in ["color", "renk", "colour"]):
                        color = str(prop_val)
                    elif any(x in prop_name for x in ["size", "beden", "dimension"]):
                        size = str(prop_val)
                    elif any(x in prop_name for x in ["material", "kumas", "fabric", "materyal"]):
                        material = str(prop_val)

        if not color:
            color = variant.get("color")
        if not size:
            size = variant.get("size")

        v_offers = variant.get("offers", {})
        v_price = None
        v_currency = None
        v_availability = None
        v_sku = variant.get("sku")

        if isinstance(v_offers, dict):
            v_price = v_offers.get("price")
            v_currency = v_offers.get("priceCurrency")
            v_av = v_offers.get("availability", "")
            if isinstance(v_av, str):
                v_availability = v_av.split("/")[-1]

        parsed_price, _ = PriceEngine.parse_price(v_price) if v_price else (None, None)

        if any([name, color, size, material, parsed_price]):
            return ProductVariant(
                name=name,
                color=color,
                size=size,
                material=material,
                price=parsed_price,
                currency=v_currency,
                availability=v_availability,
                sku=v_sku,
            )
        return None


# ---------------------------------------------------------------------------
# Metadata Extractor
# ---------------------------------------------------------------------------
class MetadataExtractor:
    @staticmethod
    def extract(parser: ProductPageParser, url: str) -> Dict[str, Any]:
        meta = parser.meta
        result: Dict[str, Any] = {}

        result["title"] = (
            meta.get("og:title")
            or meta.get("twitter:title")
            or " ".join(parser.title_parts)
        )

        result["description"] = (
            meta.get("og:description")
            or meta.get("twitter:description")
            or meta.get("description")
        )

        result["image"] = meta.get("og:image") or meta.get("twitter:image")

        price_candidates = []
        for key, value in meta.items():
            if any(x in key for x in ["price", "amount", "fiyat", "cost", "value"]):
                price_candidates.append(value)

        twitter_data1 = meta.get("twitter:data1", "")
        if twitter_data1 and PriceEngine.PRICE_RE.search(twitter_data1):
            price_candidates.append(twitter_data1)

        if price_candidates:
            sale, original, currency = PriceEngine.find_sale_and_original(price_candidates)
            if sale:
                result["price"] = sale
            if original:
                result["original_price"] = original
            if currency:
                result["currency"] = currency

        if not result.get("currency"):
            result["currency"] = MetadataExtractor._infer_currency_from_url(url)

        return {k: v for k, v in result.items() if v not in (None, "", [])}

    @staticmethod
    def _infer_currency_from_url(url: str) -> Optional[str]:
        parsed = urllib.parse.urlparse(url)
        domain = parsed.netloc.lower()
        config = ScraperConfig()
        for suffix, currency in config.domain_currency_hints.items():
            if domain.endswith(suffix):
                return currency
        return None


# ---------------------------------------------------------------------------
# Table Extractor (NEW) - Extracts technical specs from HTML tables
# ---------------------------------------------------------------------------
class TableExtractor:
    """
    Extracts technical specifications from HTML tables.
    Handles <th><td> pairs and <td><td> (key-value) structures.
    """

    @classmethod
    def extract(cls, html_content: str) -> Dict[str, str]:
        """
        Extracts technical specifications from HTML tables.
        Targeting common marketplace containers like Amazon's prodDetTable.
        """
        features: Dict[str, str] = {}
        
        # 1. Target specific high-confidence containers
        # Amazon: prodDetTable, Trendyol: detail-border, n11: unf-p-detail
        container_regex = r'<(?:table|div)[^>]*(?:class|id)=["\'](?:prodDetTable|productDetails_techSpec_section_1|detail-border|unf-p-detail|spec-table|attributes-table)[^>]*>(.*?)</(?:table|div)>'
        sections = re.findall(container_regex, html_content, re.DOTALL | re.IGNORECASE)
        
        # 2. Fallback to generic tables if no specific container found
        if not sections:
            sections = re.findall(r'<table[^>]*>(.*?)</table>', html_content, re.DOTALL | re.IGNORECASE)

        for body in sections:
            rows = re.findall(r'<tr[^>]*>(.*?)</tr>', body, re.DOTALL | re.IGNORECASE)
            for row in rows:
                row_clean = re.sub(r'\s+', ' ', row).strip()
                
                # Check for standard th-td or labeled td-td
                headers = re.findall(r'<(?:th|td)[^>]*class=["\'][^"\']*(?:label|title|attr-name)[^"\']*["\'][^>]*>(.*?)</(?:th|td)>', row_clean, re.DOTALL | re.IGNORECASE)
                cells = re.findall(r'<(?:td)[^>]*class=["\'][^"\']*(?:value|attr-value)[^"\']*["\'][^>]*>(.*?)</(?:td)>', row_clean, re.DOTALL | re.IGNORECASE)
                
                if not headers:
                    # Simple fallback: th -> td or first td -> second td
                    headers = re.findall(r'<th[^>]*>(.*?)</th>', row_clean, re.DOTALL | re.IGNORECASE)
                    cells = re.findall(r'<td[^>]*>(.*?)</td>', row_clean, re.DOTALL | re.IGNORECASE)
                
                if headers and cells:
                    for i, h in enumerate(headers):
                        if i < len(cells):
                            key = cls._clean_cell(h)
                            val = cls._clean_cell(cells[i])
                            if key and val and len(key) < 100:
                                features[key] = val
                elif len(re.findall(r'<td[^>]*>', row_clean)) == 2:
                    parts = re.findall(r'<td[^>]*>(.*?)</td>', row_clean, re.DOTALL | re.IGNORECASE)
                    if len(parts) == 2:
                        key = cls._clean_cell(parts[0])
                        val = cls._clean_cell(parts[1])
                        if key and val and len(key) < 100 and not val.startswith("http"):
                            features[key] = val
        return features

    @staticmethod
    def _clean_cell(html_fragment: str) -> str:
        # Remove inner tags
        text = re.sub(r'<[^>]+>', ' ', html_fragment)
        # Decode entities
        text = html_module.unescape(text)
        # Clean whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        # Remove trailing colons
        text = text.rstrip(':').strip()
        return text


# ---------------------------------------------------------------------------
# Image Processor (MAJOR UPGRADE) - Product-only images
# ---------------------------------------------------------------------------
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

        if not url or not isinstance(url, str): return []
        url_lower = url.lower().strip()

        if any(kw in url_lower for kw in cls.BLACKLIST): return []
        if url_lower.endswith((".svg", ".gif", ".ico", ".js", ".css")): return []
        if not url_lower.startswith(("http://", "https://", "//")): return []

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
            if (width and width >= 400) or (height and height >= 400): score += 300
            if attrs.get("data-src") or attrs.get("data-original"): score += 200
            if any(w in url_lower for w in ["product", "urun", "item", "large", "full"]): score += 100

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

    # Legacy clean method for simple string list normalization (used by AI response)
    @classmethod
    def clean(cls, images: Any) -> List[str]:
        if not images:
            return []
        if not isinstance(images, list):
            images = [images]

        cleaned: List[str] = []
        for img in images:
            if isinstance(img, str):
                url = img.strip()
                if url.startswith(("http://", "https://", "//")):
                    cleaned.append(url)
            elif isinstance(img, dict):
                url = img.get("url") or img.get("contentUrl")
                if isinstance(url, str):
                    cleaned.append(url.strip())

        seen: Set[str] = set()
        result: List[str] = []
        for url in cleaned:
            if url not in seen:
                seen.add(url)
                result.append(url)
        return result


# ---------------------------------------------------------------------------
# Text & HTML Cleaners
# ---------------------------------------------------------------------------
class TextCleaner:
    @staticmethod
    def clean(value: Any) -> Optional[str]:
        if not isinstance(value, str):
            return None
        text = html_module.unescape(value)
        text = re.sub(r"\s+", " ", text).strip()
        return text or None


class HTMLCleaner:
    @staticmethod
    def clean(html_str: str, max_bytes: int = 300_000) -> str:
        html_str = re.sub(r"<!--.*?-->", "", html_str, flags=re.DOTALL)
        html_str = re.sub(
            r"<(script|style|svg|noscript|header|footer|nav|head|iframe|form|button|aside)"
            r".*?>.*?</\1>",
            "",
            html_str,
            flags=re.DOTALL | re.IGNORECASE,
        )
        html_str = re.sub(r"[\x00-\x1f\x7f-\x9f]", "", html_str)
        html_str = re.sub(r"\s+", " ", html_str).strip()
        return html_str[:max_bytes]


# ---------------------------------------------------------------------------
# AI Extractor (Gemini) - Focused Prompt
# ---------------------------------------------------------------------------
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
        self._rate_limiter = RateLimiter(config.rate_limit_rpm)
        self._available_models: Optional[List[str]] = None

    def extract(self, html: str) -> Dict[str, Any]:
        if not self.config.gemini_api_key:
            return {}

        if not self._rate_limiter.acquire():
            wait = self._rate_limiter.wait_time()
            time.sleep(wait)
            if not self._rate_limiter.acquire():
                raise AIRateLimitError("Gemini API rate limit exceeded")

        cleaned_html = HTMLCleaner.clean(html, self.config.ai_html_max_bytes)
        models = self._get_models()

        last_error: Optional[Exception] = None
        quota_errors_count = 0
        
        for model_name in models:
            try:
                return self._call_model(model_name, cleaned_html)
            except urllib.error.HTTPError as e:
                if e.code == 429:
                    quota_errors_count += 1
                    last_error = AIQuotaError(f"Quota exceeded for {model_name}")
                    logger.warning(f"Model {model_name} quota exceeded (429). [Hata Sayısı: {quota_errors_count}]")
                    
                    if quota_errors_count == 3:
                        logger.info("Birden fazla modelde kota hatası alındı, denemeye devam ediliyor...")
                    continue
                raise AIQuotaError(f"AI Service Error ({e.code}): {e.reason}") from e
            except Exception as e:
                logger.warning(f"Model {model_name} failed: {e}. Trying next...")
                last_error = e
                continue

        if last_error:
            raise last_error
        return {}

    def _get_models(self) -> List[str]:
        if self._available_models is not None:
            return self._available_models

        key = self.config.gemini_api_key
        if key:
            masked_key = f"{key[:4]}...{key[-4:]}" if len(key) > 8 else "****"
            logger.info(f"Initializing Gemini with API Key: {masked_key}")

        default = self.config.default_gemini_model
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models?key={self.config.gemini_api_key}"
            with urllib.request.urlopen(url, timeout=5) as resp:
                data = json.loads(resp.read().decode("utf-8"))

            models = []
            for m in data.get("models", []):
                name = m.get("name", "").split("/")[-1]
                if "generateContent" in m.get("supportedGenerationMethods", []) and "gemini" in name:
                    # Filter out experimental/specialized models unless they are the default
                    is_experimental = any(x in name for x in ["preview", "tts", "image", "robotics", "computer-use"])
                    if is_experimental and name != default:
                        continue
                    models.append(name)

            def priority(m: str) -> int:
                if m == default: return 0
                if "flash-lite" in m: return 1  # Favor lite models as they often have more quota
                if m == "gemini-1.5-flash": return 2
                if m == "gemini-1.5-pro": return 3
                if "flash" in m: return 4
                if "pro" in m: return 5
                return 6

            self._available_models = sorted(models, key=priority)
            logger.info(f"Discovered Gemini models: {self._available_models}")
            return self._available_models
        except Exception as e:
            logger.warning(f"Failed to list models: {e}. Using defaults.")
            self._available_models = [default, "gemini-1.5-flash", "gemini-1.5-pro"]
            return self._available_models

    def _call_model(self, model_name: str, cleaned_html: str) -> Dict[str, Any]:
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}"
            f":generateContent?key={self.config.gemini_api_key}"
        )

        body = {
            "systemInstruction": {"parts": [{"text": self.SYSTEM_PROMPT}]},
            "contents": [{
                "role": "user",
                "parts": [{"text": f"Extract product info from this HTML:\n\n{cleaned_html}"}]
            }],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.1,
            },
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=self.config.gemini_timeout) as resp:
            raw = resp.read().decode("utf-8")

        data = json.loads(raw)
        if "candidates" not in data or not data["candidates"]:
            raise ValueError(f"Model {model_name} returned no candidates.")

        content = data["candidates"][0]["content"]["parts"][0]["text"]
        result = json.loads(content)

        if not isinstance(result, dict):
            raise ValueError("AI response is not a JSON object.")
            
        logger.info(f"Successfully extracted data using model: {model_name}")
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
                for i in item: deep_flatten(i)
            elif isinstance(item, str) and item.strip():
                images.append(item.strip())
            elif isinstance(item, dict):
                # Sometimes image is a dict with 'url' key
                url = item.get("url") or item.get("src") or item.get("hiRes")
                if url: deep_flatten(url)
        
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


# ---------------------------------------------------------------------------
# HTTP Fetcher with Retry & Backoff
# ---------------------------------------------------------------------------
class HTTPFetcher:
    def __init__(self, config: ScraperConfig):
        self.config = config

    def fetch(self, url: str) -> Tuple[str, str, List[str]]:
        warnings: List[str] = []

        if cloudscraper:
            for attempt in range(self.config.max_retries):
                try:
                    html = self._fetch_cloudscraper(url)
                    return html, "cloudscraper", warnings
                except Exception as e:
                    logger.warning(f"Cloudscraper attempt {attempt + 1} failed: {e}")
                    if attempt < self.config.max_retries - 1:
                        self._backoff(attempt)
                    else:
                        warnings.append(f"Cloudscraper failed after {self.config.max_retries} attempts")

        for attempt in range(self.config.max_retries):
            try:
                html = self._fetch_urllib(url)
                return html, "urllib", warnings
            except urllib.error.HTTPError as he:
                if he.code == 403:
                    raise BotProtectionError("Access blocked by bot protection (403).") from he
                if he.code in (429, 502, 503, 504):
                    if attempt < self.config.max_retries - 1:
                        self._backoff(attempt)
                        continue
                raise ScrapingError(f"HTTP Error {he.code}: {he.reason}") from he
            except Exception as e:
                if attempt < self.config.max_retries - 1:
                    self._backoff(attempt)
                    continue
                raise ScrapingError(f"Fetch failed ({type(e).__name__}): {e}") from e

        raise ScrapingError("All fetch attempts exhausted")

    def _backoff(self, attempt: int) -> None:
        delay = (self.config.retry_backoff_base ** attempt) + (random.random() if self.config.retry_jitter else 0)
        time.sleep(delay)

    def _fetch_cloudscraper(self, url: str) -> str:
        scraper = cloudscraper.create_scraper()
        headers = {
            "User-Agent": self.config.user_agent_bot,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
        }
        response = scraper.get(url, headers=headers, timeout=self.config.request_timeout)

        if response.status_code == 403:
            raise BotProtectionError("Cloudscraper received 403 Forbidden.")
        response.raise_for_status()
        return response.text[: self.config.max_html_bytes]

    def _fetch_urllib(self, url: str) -> str:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": self.config.user_agent_browser,
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
            method="GET",
        )
        with urllib.request.urlopen(req, timeout=self.config.fallback_timeout) as response:
            raw = response.read(self.config.max_html_bytes + 1)
            return raw.decode("utf-8", errors="ignore")[: self.config.max_html_bytes]


# ---------------------------------------------------------------------------
# Main Service
# ---------------------------------------------------------------------------
class ProductLinkReader:
    def __init__(self, config: Optional[ScraperConfig] = None):
        self.config = config or ScraperConfig()
        self.fetcher = HTTPFetcher(self.config)
        self.ai_extractor = GeminiAIExtractor(self.config)
        self.metadata_extractor = MetadataExtractor()
        self.jsonld_extractor = JSONLDExtractor()

    def read(self, url: str) -> ProductLinkReadResponse:
        normalized_url = self._validate_url(url)
        warnings: List[str] = []

        try:
            raw_html, source, fetch_warnings = self.fetcher.fetch(normalized_url)
            warnings.extend(fetch_warnings)
        except BotProtectionError as e:
            return ProductLinkReadResponse(url=normalized_url, source=SourceType.FALLBACK.value, warnings=[str(e)])
        except ScrapingError as e:
            return ProductLinkReadResponse(url=normalized_url, source=SourceType.FALLBACK.value, warnings=[str(e)])

        if not raw_html:
            return ProductLinkReadResponse(
                url=normalized_url,
                source=SourceType.FALLBACK.value,
                warnings=["Empty response from server. Possible bot protection."],
            )

        # Parse HTML
        parser = ProductPageParser()
        try:
            parser.feed(raw_html)
        except Exception as e:
            logger.error(f"HTML parsing failed: {e}")
            warnings.append(f"HTML parsing error: {e}")

        # Extract from all sources
        metadata = self.metadata_extractor.extract(parser, normalized_url)
        structured = self.jsonld_extractor.extract(parser.json_ld)
        app_json_data = self._extract_app_json(parser.app_json)

        # NEW: Extract technical specs from HTML tables
        table_features = TableExtractor.extract(raw_html)

        # Merge priority: structured > app_json > metadata
        merged: Dict[str, Any] = {**metadata}
        for key, value in app_json_data.items():
            if value not in (None, "", []):
                merged[key] = value
        for key, value in structured.items():
            if value not in (None, "", []):
                merged[key] = value

        # Merge table features (they override if more specific)
        if table_features:
            merged["features"] = {**(merged.get("features") or {}), **table_features}

        # AI Enhancement
        needs_ai = self._needs_ai_enhancement(merged)
        ai_applied = False
        ai_data = {}

        if needs_ai:
            try:
                ai_data = self.ai_extractor.extract(raw_html)
                if ai_data:
                    merged = self._merge_ai_data(merged, ai_data)
                    ai_applied = True
            except (AIQuotaError, AIRateLimitError) as e:
                warnings.append(str(e))
            except Exception as e:
                logger.error(f"AI extraction failed: {e}")
                warnings.append(f"AI analysis error: {e}")

        # --- IMAGE EXTRACTION (Surgical & Clean) ---
        # 1. Collect trusted references from Structured Data, AI and JS Variables
        trusted_refs: List[str] = []
        
        # Priority 1: JS-based Gallery Data (Best for Amazon/n11)
        js_images = self._extract_js_images(raw_html)
        if js_images:
            trusted_refs.extend(js_images)
            
        # Priority 2: Structured/AI Data
        for src in [structured.get("images"), [structured.get("image")], [metadata.get("image")], ai_data.get("images")]:
            if src:
                if isinstance(src, list):
                    trusted_refs.extend([s for s in src if isinstance(s, str)])
                elif isinstance(src, str):
                    trusted_refs.append(src)
        
        # Deduplicate trusted
        trusted_refs = list(dict.fromkeys(trusted_refs))

        # Collect all raw images (last resort)
        html_img_sources = parser._all_images
        
        # Extract using clustering (Gold Standard first)
        final_images = ImageProcessor.extract_product_images(html_img_sources, trusted_refs, max_images=12)
        main_image = final_images[0] if final_images else None

        # Price finalization
        final_price = PriceEngine.parse_price(merged.get("price"))[0]
        final_original = PriceEngine.parse_price(merged.get("original_price"))[0]
        final_currency = merged.get("currency") or PriceEngine.extract_currency(str(merged.get("price")))

        # Variants finalization
        raw_variants = merged.get("variants", [])
        final_variants = []
        for v in raw_variants:
            if isinstance(v, dict):
                vp = PriceEngine.parse_price(v.get("price"))[0]
                final_variants.append(ProductVariant(
                    name=TextCleaner.clean(v.get("name")),
                    color=TextCleaner.clean(v.get("color")),
                    size=TextCleaner.clean(v.get("size")),
                    material=TextCleaner.clean(v.get("material")),
                    price=vp,
                    currency=v.get("currency") or final_currency,
                    availability=v.get("availability"),
                    sku=v.get("sku"),
                ))
            elif isinstance(v, ProductVariant):
                final_variants.append(v)

        # Source type
        sources_used = []
        if metadata:
            sources_used.append(SourceType.METADATA.value)
        if structured:
            sources_used.append(SourceType.JSON_LD.value)
        if app_json_data:
            sources_used.append("app_json")
        if table_features:
            sources_used.append("table_specs")
        if ai_applied:
            sources_used.append(SourceType.AI_ENHANCED.value)

        final_source = SourceType.HYBRID.value if len(sources_used) > 1 else (sources_used[0] if sources_used else SourceType.FALLBACK.value)

        # Intelligent Mapping
        final_category = self._map_category(merged.get("category"), merged.get("title"))
        final_features = self._map_features(merged.get("features"))

        return ProductLinkReadResponse(
            url=normalized_url,
            title=TextCleaner.clean(merged.get("title")),
            description=TextCleaner.clean(merged.get("description")),
            price=final_price,
            original_price=final_original,
            currency=TextCleaner.clean(final_currency),
            image=main_image,
            images=final_images,
            brand=TextCleaner.clean(merged.get("brand")),
            category=final_category,
            features=final_features,
            availability=TextCleaner.clean(merged.get("availability")),
            sku=TextCleaner.clean(merged.get("sku")),
            mpn=TextCleaner.clean(merged.get("mpn")),
            gtin=TextCleaner.clean(merged.get("gtin")),
            variants=final_variants,
            source=final_source,
            warnings=warnings,
        )

    @staticmethod
    def _validate_url(url: str) -> str:
        parsed = urllib.parse.urlparse(url.strip())
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise URLValidationError("Only http/https product links are supported.")

        hostname = parsed.hostname
        if hostname:
            blocked_hosts = {"localhost", "0.0.0.0"}
            if hostname.lower() in blocked_hosts or hostname.lower().endswith(".local"):
                raise URLValidationError("Private/localhost URLs are not allowed.")
            try:
                ip = ipaddress.ip_address(hostname)
                if _is_private_address(ip):
                    raise URLValidationError("Private/localhost URLs are not allowed.")
            except ValueError:
                try:
                    for info in socket.getaddrinfo(hostname, None):
                        resolved_ip = ipaddress.ip_address(info[4][0])
                        if _is_private_address(resolved_ip):
                            raise URLValidationError("Private/localhost URLs are not allowed.")
                except socket.gaierror as exc:
                    raise URLValidationError("Product link domain could not be resolved.") from exc

        return urllib.parse.urlunparse(parsed)

    def _needs_ai_enhancement(self, data: Dict[str, Any]) -> bool:
        """Determines if we need AI to fill missing gaps."""
        # 1. Essential fields check
        essential_fields = ["price", "description", "image"]
        for field in essential_fields:
            if not data.get(field):
                return True
        
        # 2. Tech check: If it's likely a tech product, we MUST have features
        title = str(data.get("title", "")).lower()
        tech_keywords = ["telefon", "phone", "laptop", "bilgisayar", "tablet", "watch", "saat", "kulaklık"]
        if any(k in title for k in tech_keywords):
            features = data.get("features", {})
            # If we have less than 3 specs, we need AI to find more
            if len(features) < 3:
                return True

        # 3. Description quality
        desc = str(data.get("description", ""))
        if len(desc) < 100:
            return True
            
        return False

    @staticmethod
    def _merge_ai_data(existing: Dict[str, Any], ai_data: Dict[str, Any]) -> Dict[str, Any]:
        result = dict(existing)

        ai_title = ai_data.get("title")
        if ai_title and (not result.get("title") or len(str(ai_title)) > len(str(result.get("title", "")))):
            result["title"] = ai_title

        ai_desc = ai_data.get("description")
        if ai_desc and (not result.get("description") or len(str(ai_desc)) > len(str(result.get("description", "")))):
            result["description"] = ai_desc

        if ai_data.get("price"):
            result["price"] = ai_data["price"]
        if ai_data.get("original_price"):
            result["original_price"] = ai_data["original_price"]

        if ai_data.get("currency"):
            result["currency"] = ai_data["currency"]

        if ai_data.get("brand") and not result.get("brand"):
            result["brand"] = ai_data["brand"]

        if ai_data.get("category"):
            result["category"] = ai_data["category"]

        if ai_data.get("features"):
            result["features"] = {**(result.get("features") or {}), **ai_data["features"]}

        for key in ["availability", "sku", "mpn"]:
            if ai_data.get(key) and not result.get(key):
                result[key] = ai_data[key]

        ai_variants = ai_data.get("variants", [])
        if ai_variants:
            existing_variants = result.get("variants", [])
            if isinstance(existing_variants, list):
                result["variants"] = ai_variants + existing_variants
            else:
                result["variants"] = ai_variants

        # AI images: add to merged for later product-image filtering
        ai_images = ai_data.get("images", [])
        if ai_data.get("image") and ai_data["image"] not in ai_images:
            if isinstance(ai_data["image"], str):
                ai_images.insert(0, ai_data["image"])

        # SAFE FLATTEN & DEDUP (Bulletproof Fix for 'unhashable list')
        final_images = []
        seen = set()
        
        def safe_add(items):
            if isinstance(items, list):
                for i in items: safe_add(i)
            elif isinstance(items, str) and items.strip():
                url = items.strip()
                if url not in seen:
                    seen.add(url)
                    final_images.append(url)

        safe_add(ai_images)
        safe_add(result.get("images", []))
        
        result["images"] = final_images
        return result

    @staticmethod
    def _map_category(raw_category: Optional[str], title: Optional[str]) -> str:
        """Maps raw marketplace categories to our 15 supported categories."""
        text = f"{raw_category or ''} {title or ''}".lower()
        
        # Mapping rules
        mappings = {
            "telefon": ["telefon", "phone", "mobile", "cep", "iphone", "samsung", "xiaomi", "redmi"],
            "laptop": ["laptop", "bilgisayar", "computer", "notebook", "dizüstü", "macbook"],
            "akilli_saat": ["saat", "watch", "smartwatch", "bileklik"],
            "tablet": ["tablet", "ipad"],
            "kulaklik": ["kulaklık", "headphone", "earbud", "airpods"],
            "tisort": ["tişört", "t-shirt", "tshirt", "fanila"],
            "pantolon": ["pantolon", "jean", "denim", "trouser"],
            "mont": ["mont", "ceket", "kaban", "parka", "jacket"],
            "elbise": ["elbise", "dress"],
            "etek": ["etek", "skirt"],
            "ayakkabi": ["ayakkabı", "shoe", "sneaker", "bot", "çizme"],
            "canta": ["çanta", "bag", "backpack"],
            "kozmetik": ["kozmetik", "parfüm", "makyaj", "bakım", "shampoo", "krem"]
        }
        
        for target, keywords in mappings.items():
            if any(k in text for k in keywords):
                return target
        
        return "tisort" # Fallback

    @staticmethod
    def _map_features(features: Dict[str, Any]) -> Dict[str, Any]:
        """Maps various marketplace feature keys to internal form field names."""
        mapping = {
            # Tech / Electronics
            "islemci": "processor", "cpu": "processor", "işlemci": "processor",
            "kamera": "camera", "arka_kamera": "camera", "ana_kamera": "camera", "camera": "camera", "kamera_cozunurlugu": "camera",
            "dahili_hafiza": "storage", "kapasite": "storage", "hafiza": "storage", "disk": "storage", "depolama": "storage",
            "bellek": "ram", "memory": "ram", "ram": "ram", "ram_kapasitesi": "ram",
            "batarya": "battery", "pil": "battery", "guc": "battery", "pil_gucu": "battery", "batarya_kapasitesi": "battery",
            "ekran": "screenSize", "ekran_boyutu": "screenSize", "ekran_tazeleme": "refreshRate", "ekran_yenileme_hizi": "refreshRate",
            "isletim_sistemi": "operatingSystem", "yazilim": "operatingSystem", "os": "operatingSystem",
            "baglanti": "connectivity", "connectivity": "connectivity",
            "su_dayanimi": "waterResistance", "su_gecirmezlik": "waterResistance",
            
            # Clothing
            "kumas": "fabric", "materyal": "fabric", "kalip": "fit", "sezon": "season",
            "renk": "color", "beden": "size"
        }
        mapped = {}
        for k, v in (features or {}).items():
            k_norm = str(k).lower().strip().replace(" ", "_").replace("ı", "i")
            target = mapping.get(k_norm, k_norm)
            mapped[target] = str(v)
        return mapped

    @staticmethod
    def _extract_js_images(html: str) -> List[str]:
        """Extracts images from common marketplace JS variables (Amazon, n11, etc.)"""
        images = []
        
        # Amazon Pattern: colorImages or ImageBlockATF
        amazon_patterns = [
            r"'colorImages':\s*({.*?}),\s*'initial'",
            r"'ImageBlockATF':\s*({.*?}),",
            r"\"colorImages\":\s*({.*?}),",
        ]
        for pattern in amazon_patterns:
            match = re.search(pattern, html, re.DOTALL)
            if match:
                try:
                    # Amazon JS objects are often slightly malformed for json.loads (single quotes)
                    # We do a basic fix but stay safe
                    js_text = match.group(1).replace("'", '"')
                    js_obj = json.loads(js_text)
                    for key in ["initial", "colorImages"]:
                        set_data = js_obj.get(key, [])
                        if isinstance(set_data, list):
                            for item in set_data:
                                if isinstance(item, dict):
                                    img_url = item.get("hiRes") or item.get("large") or item.get("main")
                                    if img_url: images.append(img_url)
                except Exception:
                    continue

        # Generic initialImages/gallery patterns
        generic_patterns = [
            r"initialImages\s*=\s*(\[.*?\]);",
            r"productImages\s*=\s*(\[.*?\]);",
            r"galleryImages\s*=\s*(\[.*?\]);"
        ]
        for pattern in generic_patterns:
            match = re.search(pattern, html, re.DOTALL)
            if match:
                try:
                    data = json.loads(match.group(1))
                    if isinstance(data, list):
                        for item in data:
                            if isinstance(item, str): images.append(item)
                            elif isinstance(item, dict):
                                url = item.get("url") or item.get("src") or item.get("image")
                                if url: images.append(url)
                except Exception:
                    continue

        return [img for img in images if isinstance(img, str) and img.startswith(("http", "//"))]

    @staticmethod
    def _extract_app_json(scripts: List[str]) -> Dict[str, Any]:
        """Some sites embed product data in <script type='application/json'>."""
        for script in scripts:
            try:
                data = json.loads(script)
                if isinstance(data, dict):
                    # Common patterns
                    product = data.get("product") or data.get("props", {}).get("pageProps", {}).get("product")
                    if product and isinstance(product, dict):
                        return {
                            "title": product.get("title") or product.get("name"),
                            "price": product.get("price") or product.get("salePrice"),
                            "original_price": product.get("originalPrice") or product.get("listPrice"),
                            "currency": product.get("currency"),
                            "brand": product.get("brand"),
                            "images": product.get("images") or product.get("imageUrls") or product.get("initialImages"),
                            "sku": product.get("sku") or product.get("productId"),
                            "availability": product.get("availability"),
                        }
            except (json.JSONDecodeError, AttributeError):
                continue
        return {}


# ---------------------------------------------------------------------------
# Backward-compatible API
# ---------------------------------------------------------------------------
def read_product_link(url: str) -> ProductLinkReadResponse:
    reader = ProductLinkReader()
    return reader.read(url)

# ---------------------------------------------------------------------------
# Serper.dev Shopping API Integration (NEW)
# ---------------------------------------------------------------------------
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
