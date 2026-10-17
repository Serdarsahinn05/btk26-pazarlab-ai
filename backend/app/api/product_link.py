from fastapi import APIRouter, Depends, HTTPException

from app.models.product_link import ProductLinkReadResponse, ProductLinkRequest, ProductPageRequest
from app.security import RateLimit
from app.services.link_reader import PUBLIC_URL_ERROR, URLValidationError, read_product_html, read_product_link, read_text

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


@router.post(
    "/read-product-page",
    response_model=ProductLinkReadResponse,
    dependencies=[Depends(RateLimit("RATE_LIMIT_LINK_PER_MIN", 10))],
)
def read_product_page_endpoint(payload: ProductPageRequest) -> ProductLinkReadResponse:
    """Same fields as /read-product-link, from HTML or text the client sends; the server fetches nothing."""
    if payload.html:
        return read_product_html(payload.html, payload.url)
    return read_text(payload.text or "", payload.url)
