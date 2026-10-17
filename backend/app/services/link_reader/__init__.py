"""Product link reader (Faz 14): page → title, price, description, category, features, images, rating.

Modules: fetch (safe HTTP), html_parse, structured (JSON-LD, meta, tables), images, ai (LLM fallback),
reader (URL, page HTML or pasted text → ProductLinkReadResponse).
"""

from app.services.link_reader.models import PUBLIC_URL_ERROR, URLValidationError
from app.services.link_reader.reader import ProductLinkReader, read_product_html, read_product_link, read_text

__all__ = ["PUBLIC_URL_ERROR", "ProductLinkReader", "URLValidationError", "read_product_html", "read_product_link", "read_text"]
