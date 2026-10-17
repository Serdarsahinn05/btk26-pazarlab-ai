"""POST /api/analyze-images (Faz 16): optional AI review of the product photos."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field

from app.models.category import Category
from app.models.product import ImageRef
from app.security import RateLimit
from app.services import llm_client
from app.services.image_analysis import analyze_images

router = APIRouter(prefix="/api", tags=["images"])


class ImageAnalysisRequest(BaseModel):
    images: list[ImageRef] = Field(min_length=1, max_length=6)
    category: Category
    product_name: str = Field(default="", alias="productName", max_length=120)

    model_config = ConfigDict(populate_by_name=True)


@router.post("/analyze-images", dependencies=[Depends(RateLimit("RATE_LIMIT_ANALYZE_PER_MIN", 10))])
def analyze_images_endpoint(payload: ImageAnalysisRequest) -> dict:
    """{"available": false, "reason": ...} without AI or usable photos, so the page can say why."""
    try:
        result = analyze_images(payload.images, payload.category, payload.product_name)
    except llm_client.AIQuotaExceeded:
        return {"available": False, "reason": "Bugünkü AI hakkın doldu; görsel analizi yarın tekrar denenebilir."}
    except llm_client.LLMUnavailable:
        return {"available": False, "reason": "Görsel analizi için AI şu an kullanılamıyor."}
    except ValueError:
        return {"available": False, "reason": "AI görsellerden okunabilir bir değerlendirme döndürmedi."}
    if result is None:
        return {"available": False, "reason": "Görseller okunamadı (JPEG, PNG ya da WebP, en fazla 1,5 MB)."}
    return {"available": True, **result}
