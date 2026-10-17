"""HTML parsing helpers: page parser, prices, text cleanup."""

from __future__ import annotations

import html as html_module
import logging
import re
from html.parser import HTMLParser
from typing import Any, Dict, List, Optional, Tuple


logger = logging.getLogger("product_scraper")


class ProductPageParser(HTMLParser):
    __slots__ = (
        "title_parts", "meta", "json_ld", "app_json", "_in_title",
        "_in_json_ld", "_in_app_json", "_script_buffer", "_current_script_type",
        "_all_images", "itemprops"
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
        # schema.org microdata (itemprop + content), kept apart from meta: "ratingValue" must not look like a price.
        self.itemprops: Dict[str, str] = {}

    def handle_starttag(self, tag: str, attrs: List[Tuple[str, Optional[str]]]) -> None:
        attrs_dict = {k.lower(): (v or "") for k, v in attrs}
        tag_lower = tag.lower()
        if attrs_dict.get("itemprop") and attrs_dict.get("content"):
            self.itemprops.setdefault(attrs_dict["itemprop"].lower(), attrs_dict["content"].strip())

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
