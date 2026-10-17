from typing import Any, Dict, List, Optional
 
from pydantic import BaseModel, Field
 
 
class ProductLinkRequest(BaseModel):
    url: str = Field(min_length=8, max_length=2048)
 
 
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
    # How the category was found: high = the page's own category path, medium = title or AI, low = not found ("diger").
    category_confidence: Optional[str] = None
    category_source: Optional[str] = None
