from __future__ import annotations

import ipaddress
import json
import re
import socket
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from typing import Any, Dict, List, Optional

from app.models.product_link import ProductLinkReadResponse


MAX_HTML_BYTES = 700_000


class _ProductPageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.title_parts: List[str] = []
        self.meta: Dict[str, str] = {}
        self.json_ld: List[str] = []
        self._in_title = False
        self._in_json_ld = False
        self._script_buffer: List[str] = []

    def handle_starttag(self, tag: str, attrs: List[tuple[str, Optional[str]]]) -> None:
        attrs_dict = {key.lower(): (value or "") for key, value in attrs}
        if tag.lower() == "title":
            self._in_title = True
        elif tag.lower() == "meta":
            key = attrs_dict.get("property") or attrs_dict.get("name")
            content = attrs_dict.get("content")
            if key and content:
                self.meta[key.lower()] = content.strip()
        elif tag.lower() == "script" and attrs_dict.get("type", "").lower() == "application/ld+json":
            self._in_json_ld = True
            self._script_buffer = []

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() == "title":
            self._in_title = False
        elif tag.lower() == "script" and self._in_json_ld:
            self._in_json_ld = False
            script = "".join(self._script_buffer).strip()
            if script:
                self.json_ld.append(script)

    def handle_data(self, data: str) -> None:
        if self._in_title:
            self.title_parts.append(data.strip())
        elif self._in_json_ld:
            self._script_buffer.append(data)


def read_product_link(url: str) -> ProductLinkReadResponse:
    normalized_url = _validate_public_url(url)
    warnings: List[str] = []
    try:
        req = urllib.request.Request(
            normalized_url,
            headers={
                "User-Agent": "Mozilla/5.0 PazarlabAI/1.0 product-link-reader",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
            method="GET",
        )
        with urllib.request.urlopen(req, timeout=8) as response:
            content_type = response.headers.get("Content-Type", "")
            if "text/html" not in content_type and "application/xhtml" not in content_type:
                warnings.append("Link HTML urun sayfasi gibi gorunmuyor; sadece sinirli veri okunabildi.")
            raw = response.read(MAX_HTML_BYTES + 1)
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        return ProductLinkReadResponse(
            url=normalized_url,
            source="fallback",
            warnings=[f"Link okunamadi: {exc.__class__.__name__}. Urun bilgilerini elle girin."],
        )

    if len(raw) > MAX_HTML_BYTES:
        warnings.append("Sayfa cok buyuk oldugu icin ilk bolum analiz edildi.")
        raw = raw[:MAX_HTML_BYTES]

    html = raw.decode("utf-8", errors="ignore")
    parser = _ProductPageParser()
    parser.feed(html)

    metadata = _extract_from_metadata(parser)
    structured = _extract_from_json_ld(parser.json_ld)
    merged = {**metadata, **{k: v for k, v in structured.items() if v not in (None, "", [])}}

    if not merged.get("title"):
        warnings.append("Urun basligi linkten net okunamadi.")
    if not merged.get("description"):
        warnings.append("Urun aciklamasi linkte meta veri olarak bulunamadi.")

    return ProductLinkReadResponse(
        url=normalized_url,
        title=_clean_text(merged.get("title")),
        description=_clean_text(merged.get("description")),
        price=_parse_price(merged.get("price")),
        currency=_clean_text(merged.get("currency")),
        image=_clean_text(merged.get("image")),
        brand=_clean_text(merged.get("brand")),
        source="json_ld" if structured else "metadata" if metadata else "fallback",
        warnings=warnings,
    )


def _validate_public_url(url: str) -> str:
    parsed = urllib.parse.urlparse(url.strip())
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("Sadece http/https urun linkleri desteklenir.")

    hostname = parsed.hostname or ""
    try:
        infos = socket.getaddrinfo(hostname, None)
        for info in infos:
            address = ipaddress.ip_address(info[4][0])
            if address.is_private or address.is_loopback or address.is_link_local or address.is_reserved:
                raise ValueError("Yerel veya ozel ag adresleri okunmaz.")
    except socket.gaierror:
        raise ValueError("Link alan adi cozulemedi.")

    return urllib.parse.urlunparse(parsed)


def _extract_from_metadata(parser: _ProductPageParser) -> Dict[str, Any]:
    title = parser.meta.get("og:title") or parser.meta.get("twitter:title") or " ".join(parser.title_parts)
    description = (
        parser.meta.get("og:description")
        or parser.meta.get("twitter:description")
        or parser.meta.get("description")
    )
    image = parser.meta.get("og:image") or parser.meta.get("twitter:image")
    price = (
        parser.meta.get("product:price:amount")
        or parser.meta.get("og:price:amount")
        or parser.meta.get("twitter:data1")
    )
    currency = parser.meta.get("product:price:currency") or parser.meta.get("og:price:currency")
    return {
        "title": title,
        "description": description,
        "image": image,
        "price": price,
        "currency": currency,
    }


def _extract_from_json_ld(scripts: List[str]) -> Dict[str, Any]:
    for script in scripts:
        for item in _iter_json_objects(script):
            product = _find_product_object(item)
            if product:
                offers = product.get("offers") or {}
                if isinstance(offers, list):
                    offers = offers[0] if offers else {}
                brand = product.get("brand")
                if isinstance(brand, dict):
                    brand = brand.get("name")
                image = product.get("image")
                if isinstance(image, list):
                    image = image[0] if image else None
                return {
                    "title": product.get("name"),
                    "description": product.get("description"),
                    "price": offers.get("price") if isinstance(offers, dict) else None,
                    "currency": offers.get("priceCurrency") if isinstance(offers, dict) else None,
                    "image": image,
                    "brand": brand,
                }
    return {}


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


def _find_product_object(data: Any) -> Optional[Dict[str, Any]]:
    if isinstance(data, dict):
        type_value = data.get("@type")
        if type_value == "Product" or (isinstance(type_value, list) and "Product" in type_value):
            return data
        graph = data.get("@graph")
        if isinstance(graph, list):
            for item in graph:
                found = _find_product_object(item)
                if found:
                    return found
    return None


def _parse_price(value: Any) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value)
    match = re.search(r"(\d+(?:[.,]\d{1,2})?)", text.replace(" ", ""))
    if not match:
        return None
    return float(match.group(1).replace(",", "."))


def _clean_text(value: Any) -> Optional[str]:
    if value is None:
        return None
    text = re.sub(r"\s+", " ", str(value)).strip()
    return text or None
