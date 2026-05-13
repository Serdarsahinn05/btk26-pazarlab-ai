from typing import List, Optional

from pydantic import BaseModel, Field


class ProductLinkRequest(BaseModel):
    url: str = Field(min_length=8, max_length=2048)


class ProductLinkReadResponse(BaseModel):
    url: str
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    currency: Optional[str] = None
    image: Optional[str] = None
    brand: Optional[str] = None
    source: str = "fallback"
    warnings: List[str] = Field(default_factory=list)
