"""Reading a product from a URL, from page HTML or from pasted page text."""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, List, Optional

from app.services import categories
from app.services.safe_http import UnsafeURLError, validate_url
from app.utils.text_utils import fold_text

from app.models.product_link import ProductLinkReadResponse, ProductVariant
from app.services.link_reader.ai import GeminiAIExtractor
from app.services.link_reader.fetch import HTTPFetcher
from app.services.link_reader.html_parse import (
    PriceEngine,
    ProductPageParser,
    TextCleaner,
)
from app.services.link_reader.images import ImageProcessor
from app.services.link_reader.models import (
    PUBLIC_URL_ERROR,
    ScraperConfig,
    ScrapingError,
    SourceType,
    URLValidationError,
)
from app.services.link_reader.structured import (
    JSONLDExtractor,
    MetadataExtractor,
    TableExtractor,
    parse_rating,
)

logger = logging.getLogger("product_scraper")


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
        except URLValidationError:
            raise
        except ScrapingError as e:
            return ProductLinkReadResponse(url=normalized_url, source=SourceType.FALLBACK.value, warnings=[str(e)])

        if not raw_html:
            return ProductLinkReadResponse(
                url=normalized_url,
                source=SourceType.FALLBACK.value,
                warnings=["Sayfa boş döndü; site bot koruması kullanıyor olabilir."],
            )
        return self.read_html(raw_html, normalized_url, warnings)

    def read_html(self, raw_html: str, normalized_url: str, warnings: Optional[List[str]] = None) -> ProductLinkReadResponse:
        """Everything after the download: the same path for a fetched page and for HTML a browser sent (Faz 14)."""
        warnings = list(warnings or [])
        raw_html = raw_html[: self.config.max_html_bytes]

        # Parse HTML
        parser = ProductPageParser()
        try:
            parser.feed(raw_html)
        except Exception as e:
            logger.error("HTML parsing failed: %r", e)
            warnings.append("Sayfanin bir kismi islenemedi.")

        # Extract from all sources
        metadata = self.metadata_extractor.extract(parser, normalized_url)
        structured = self.jsonld_extractor.extract(parser.json_ld)
        breadcrumb = self.jsonld_extractor.breadcrumb(parser.json_ld)
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
            except Exception as e:
                logger.error("AI extraction failed: %r", e)
                warnings.append("AI ile zenginlestirme yapilamadi; sayfadaki veriler kullanildi.")

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
        # SimulationRequest accepts at most 6 images.
        final_images = ImageProcessor.extract_product_images(html_img_sources, trusted_refs, max_images=6)
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
        page_category = next((c for c in (structured.get("category"), app_json_data.get("category"), metadata.get("category")) if isinstance(c, str)), None)
        detected = categories.detect(breadcrumb, page_category, merged.get("title"))
        if detected["source"] in ("title", "none") and isinstance(ai_data.get("category"), str):
            from_ai = categories.detect_from_text(ai_data["category"])
            if from_ai:
                detected = {"category": from_ai, "confidence": "medium", "source": "ai"}
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
            category=detected["category"],
            category_confidence=detected["confidence"],
            category_source=detected["source"],
            features=final_features,
            availability=TextCleaner.clean(merged.get("availability")),
            sku=TextCleaner.clean(merged.get("sku")),
            mpn=TextCleaner.clean(merged.get("mpn")),
            gtin=TextCleaner.clean(merged.get("gtin")),
            variants=final_variants,
            rating=merged.get("rating"),
            review_count=merged.get("review_count"),
            source=final_source,
            warnings=warnings,
        )

    @staticmethod
    def _validate_url(url: str) -> str:
        try:
            return validate_url(url)
        except UnsafeURLError as exc:
            logger.info("Rejected product link: %s", exc)
            raise URLValidationError(PUBLIC_URL_ERROR) from exc

    def _needs_ai_enhancement(self, data: Dict[str, Any]) -> bool:
        """Determines if we need AI to fill missing gaps."""
        # 1. Essential fields check
        essential_fields = ["price", "description", "image"]
        if any(not data.get(name) for name in essential_fields):
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
                for i in items:
                    safe_add(i)
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
        """Category id for a marketplace category text and/or title (see services/categories.detect)."""
        return categories.detect(None, raw_category, title)["category"]

    @staticmethod
    def _map_features(features: Dict[str, Any]) -> Dict[str, Any]:
        """Maps various marketplace feature keys to internal form field names."""
        mapping = {
            # Tech / Electronics
            "islemci": "processor", "cpu": "processor", "işlemci": "processor",
            "kamera": "camera", "arka_kamera": "camera", "ana_kamera": "camera", "camera": "camera", "kamera_cozunurlugu": "camera",
            "dahili_hafiza": "storage", "kapasite": "storage", "hafiza": "storage", "disk": "storage", "depolama": "storage",
            "bellek": "ram", "memory": "ram", "ram": "ram", "ram_kapasitesi": "ram",
            "batarya": "battery", "pil": "battery", "pil_gucu": "battery", "batarya_kapasitesi": "battery",
            "ekran": "screenSize", "ekran_boyutu": "screenSize", "ekran_tazeleme": "refreshRate", "ekran_yenileme_hizi": "refreshRate",
            "isletim_sistemi": "operatingSystem", "yazilim": "operatingSystem", "os": "operatingSystem",
            "baglanti": "connectivity", "connectivity": "connectivity",
            "su_dayanimi": "waterResistance", "su_gecirmezlik": "waterResistance",
            
            # Shoes, bags, cosmetics
            "taban": "soleMaterial", "taban_malzemesi": "soleMaterial", "topuk_boyu": "heelHeight", "topuk_yuksekligi": "heelHeight",
            "bolme": "compartments", "bolme_sayisi": "compartments", "aski": "strapType", "aski_tipi": "strapType",
            "cilt_tipi": "skinType", "sac_tipi": "skinType", "hacim": "volume", "icerik": "ingredients", "icindekiler": "ingredients",
            "olcu": "dimensions", "boyut": "dimensions", "ebat": "dimensions",
            # Appliances, accessories, baby (Faz 13a)
            "guc": "power", "motor_gucu": "power", "guc_watt": "power", "maksimum_guc": "power",
            "yas_grubu": "ageGroup", "yas_araligi": "ageGroup", "uyumlu_model": "compatibleModel", "uyumlu_marka": "compatibleModel",

            # Clothing
            "kumas": "fabric", "materyal": "fabric", "malzeme": "material", "malzeme_turu": "material", "kalip": "fit", "sezon": "season",
            "renk": "color", "beden": "size"
        }
        mapped = {}
        for k, v in (features or {}).items():
            k_norm = fold_text(str(k)).strip().replace(" ", "_")
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
                                    if img_url:
                                        images.append(img_url)
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
                            if isinstance(item, str):
                                images.append(item)
                            elif isinstance(item, dict):
                                url = item.get("url") or item.get("src") or item.get("image")
                                if url:
                                    images.append(url)
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


# Lines with these words carry other prices (shipping, instalments, coupons), not the product's own.
_NOT_THE_PRICE = re.compile(r"kargo|taksit|/\s*ay|aylık|kupon|puan|indirim kodu|sepette|x\s*\d", re.IGNORECASE)
_RATING = re.compile(r"(\d[.,]\d)\s*(?:/\s*5)?\D{0,20}?(\d{1,3}(?:[.]\d{3})*|\d+)\s*(?:değerlendirme|yorum|puan|rating)", re.IGNORECASE)


def read_text(text: str, url: str = "") -> ProductLinkReadResponse:
    """Product fields from page text the seller copied (Ctrl+A, Ctrl+C) when the link cannot be read.

    Rule-based and rough: the first lines name the product, the first plain TL price is the price, long lines
    describe it. With AI available, missing fields are filled the same way as for a page.
    """
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    warnings = ["Bilgiler sayfa metninden çıkarıldı; ad, fiyat ve açıklamayı kontrol et."]

    price, price_at = None, len(lines)
    for index, line in enumerate(lines):
        if ("tl" in line.lower() or "₺" in line) and not _NOT_THE_PRICE.search(line):
            price = PriceEngine.parse_price(line)[0]
            if price:
                price_at = index
                break

    def could_be_title(line: str) -> bool:
        return 3 <= len(line.split()) <= 18 and len(line) <= 120 and not PriceEngine.extract_currency(line) and not _RATING.search(line)

    # Marketplaces put the product name just above its price; menus and banners come earlier.
    before_price = [line for line in lines[max(0, price_at - 5):price_at] if could_be_title(line)]
    title = before_price[-1] if before_price else next((line for line in lines[:25] if could_be_title(line)), None)
    description = " ".join(line for line in lines if len(line) >= 80)[:4000] or None
    rating: Dict[str, Any] = {}
    match = _RATING.search(text)
    if match:
        rating = parse_rating({"ratingValue": match.group(1), "reviewCount": match.group(2).replace(".", "")})

    merged: Dict[str, Any] = {"title": title, "description": description, "price": price, **rating}
    reader = ProductLinkReader()
    if reader._needs_ai_enhancement(merged):
        try:
            ai_data = reader.ai_extractor.extract(text)
            if ai_data:
                merged = reader._merge_ai_data(merged, ai_data)
        except Exception as exc:  # the rule-based fields are still useful
            logger.warning("AI text extraction failed: %r", exc)
    detected = categories.detect(None, merged.get("category") if isinstance(merged.get("category"), str) else None, merged.get("title"))
    return ProductLinkReadResponse(
        url=url,
        title=TextCleaner.clean(merged.get("title")),
        description=TextCleaner.clean(merged.get("description")),
        price=PriceEngine.parse_price(merged.get("price"))[0],
        currency="TRY",
        brand=TextCleaner.clean(merged.get("brand")),
        category=detected["category"],
        category_confidence=detected["confidence"],
        category_source=detected["source"],
        features=ProductLinkReader._map_features(merged.get("features")),
        rating=merged.get("rating"),
        review_count=merged.get("review_count"),
        source="text",
        warnings=warnings,
    )


def read_product_html(html: str, url: str = "") -> ProductLinkReadResponse:
    """A product page a browser already has (extension, saved page): nothing is fetched, so no SSRF surface."""
    return ProductLinkReader().read_html(html, url)


def read_product_link(url: str) -> ProductLinkReadResponse:
    reader = ProductLinkReader()
    return reader.read(url)
