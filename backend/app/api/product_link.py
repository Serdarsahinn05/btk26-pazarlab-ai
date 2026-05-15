from fastapi import APIRouter, HTTPException

from app.models.product_link import ProductLinkReadResponse, ProductLinkRequest
from app.services.product_link_service import ScrapingError, read_product_link

router = APIRouter(prefix="/api", tags=["product-link"])


@router.post("/read-product-link", response_model=ProductLinkReadResponse)
async def read_product_link_endpoint(payload: ProductLinkRequest) -> ProductLinkReadResponse:
    try:
        return read_product_link(payload.url)
    except (ValueError, ScrapingError) as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
