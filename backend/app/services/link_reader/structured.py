"""Structured data on product pages: JSON-LD, meta tags, spec tables."""

from __future__ import annotations

import html as html_module
import json
import logging
import re
import urllib.error
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional, Tuple

from app.models.product_link import ProductVariant
from app.services.link_reader.html_parse import PriceEngine, ProductPageParser
from app.services.link_reader.models import ScraperConfig, _position

logger = logging.getLogger("product_scraper")


class JSONLDExtractor:
    @classmethod
    def extract(cls, scripts: List[str]) -> Dict[str, Any]:
        for script in scripts:
            for item in cls._iter_json_objects(script):
                product = cls._find_product_object(item)
                if product and isinstance(product, dict):
                    return cls._parse_product(product)
        return {}

    @classmethod
    def breadcrumb(cls, scripts: List[str]) -> List[str]:
        """Names in the page's schema.org BreadcrumbList, outermost first ("Kadın", "Giyim", "Elbise")."""
        for script in scripts:
            for item in cls._iter_json_objects(script):
                found = cls._find_typed(item, "BreadcrumbList")
                if not found:
                    continue
                elements = found.get("itemListElement") or []
                elements = elements if isinstance(elements, list) else [elements]
                names = []
                for element in sorted((e for e in elements if isinstance(e, dict)), key=lambda e: _position(e.get("position"))):
                    inner = element.get("item")
                    name = element.get("name") or (inner.get("name") if isinstance(inner, dict) else None)
                    if isinstance(name, str) and name.strip():
                        names.append(name.strip())
                if names:
                    return names
        return []

    @classmethod
    def _find_typed(cls, data: Any, wanted: str) -> Optional[Dict[str, Any]]:
        if isinstance(data, list):
            for item in data:
                found = cls._find_typed(item, wanted)
                if found:
                    return found
        elif isinstance(data, dict):
            type_value = data.get("@type")
            types = type_value if isinstance(type_value, list) else [type_value]
            if wanted in types:
                return data
            for value in data.values():
                if isinstance(value, (dict, list)):
                    found = cls._find_typed(value, wanted)
                    if found:
                        return found
        return None

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
                for item in data:
                    collect_urls(item)
            elif isinstance(data, str):
                if data.startswith(("http", "//")):
                    images.append(data)
            elif isinstance(data, dict):
                # Trendyol style: {"contentUrl": [...]} or {"url": "..."}
                url = data.get("contentUrl") or data.get("url")
                if url:
                    collect_urls(url)

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
        result.update(parse_rating(product.get("aggregateRating")))

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


def parse_rating(rating: Any) -> Dict[str, Any]:
    """Store rating (out of 5) and number of ratings from a schema.org AggregateRating; {} if absent or odd."""
    if not isinstance(rating, dict):
        return {}

    def number(value: Any) -> Optional[float]:
        try:
            return float(str(value).replace(",", "."))
        except (TypeError, ValueError):
            return None

    out: Dict[str, Any] = {}
    value, best = number(rating.get("ratingValue")), number(rating.get("bestRating")) or 5.0
    if value is not None and 0 < best and 0 <= value <= best:
        out["rating"] = round(value / best * 5, 2)
    count = number(rating.get("reviewCount") or rating.get("ratingCount"))
    if count is not None and count >= 0:
        out["review_count"] = int(count)
    return out


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

        props = parser.itemprops
        result.update(parse_rating({
            "ratingValue": props.get("ratingvalue"),
            "bestRating": props.get("bestrating"),
            "reviewCount": props.get("reviewcount") or props.get("ratingcount"),
        }))

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
