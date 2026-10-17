from typing import Any, Dict, List, Optional
 
from pydantic import BaseModel, Field, model_validator
 
 
class ProductLinkRequest(BaseModel):
    url: str = Field(min_length=8, max_length=2048)


class ProductPageRequest(BaseModel):
    """A page the browser already has (Faz 14): its HTML (extension, saved page) or its copied text."""

    html: Optional[str] = Field(default=None, max_length=3_000_000)
    text: Optional[str] = Field(default=None, max_length=200_000)
    # Only labels the result (currency, links); it is never fetched.
    url: str = Field(default="", max_length=2048)

    @model_validator(mode="after")
    def _one_source(self) -> "ProductPageRequest":
        if bool((self.html or "").strip()) == bool((self.text or "").strip()):
            raise ValueError("Ya sayfanın HTML'ini ya da metnini gönder (ikisinden biri).")
        if self.url and not self.url.startswith(("http://", "https://")):
            self.url = ""
        return self
 
 
class ProductVariant(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    size: Optional[str] = None
    material: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    availability: Optional[str] = None
    sku: Optional[str] = None

class ProductLinkReadResponse(BaseModel):
    url: str
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    original_price: Optional[float] = None
    currency: Optional[str] = None
    image: Optional[str] = None
    images: List[str] = Field(default_factory=list)
    brand: Optional[str] = None
    category: Optional[str] = None
    features: Dict[str, Any] = Field(default_factory=dict)
    availability: Optional[str] = None
    sku: Optional[str] = None
    mpn: Optional[str] = None
    gtin: Optional[str] = None
    variants: List[ProductVariant] = Field(default_factory=list)
    source: str = "fallback"
    warnings: List[str] = Field(default_factory=list)
    # Store rating out of 5 and how many ratings it is based on (schema.org AggregateRating / microdata).
    rating: Optional[float] = None
    review_count: Optional[int] = None
    # How the category was found: high = the page's own category path, medium = title or AI, low = not found ("diger").
    category_confidence: Optional[str] = None
    category_source: Optional[str] = None
