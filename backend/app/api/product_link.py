from fastapi import APIRouter, Depends, HTTPException

from app.models.product_link import ProductLinkReadResponse, ProductLinkRequest
from app.security import RateLimit
from app.services.product_link_service import PUBLIC_URL_ERROR, URLValidationError, read_product_link

router = APIRouter(prefix="/api", tags=["product-link"])


@router.post(
    "/read-product-link",
    response_model=ProductLinkReadResponse,
    dependencies=[Depends(RateLimit("RATE_LIMIT_LINK_PER_MIN", 10))],
)
def read_product_link_endpoint(payload: ProductLinkRequest) -> ProductLinkReadResponse:
    try:
        return read_product_link(payload.url)
    except URLValidationError as exc:
        raise HTTPException(status_code=400, detail=PUBLIC_URL_ERROR) from exc
