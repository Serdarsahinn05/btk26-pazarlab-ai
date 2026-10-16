from fastapi import APIRouter, Depends

from app.models.input_analysis import InputAnalysisResponse
from app.models.product import SimulationRequest
from app.security import RateLimit
from app.services.input_analysis_service import analyze_input

router = APIRouter(prefix="/api", tags=["input-analysis"])

# Sync handler on purpose: FastAPI runs it in a threadpool, so the blocking
# Gemini call does not stall the event loop.
@router.post(
    "/analyze-input",
    response_model=InputAnalysisResponse,
    dependencies=[Depends(RateLimit("RATE_LIMIT_ANALYZE_PER_MIN", 10))],
)
def analyze_product_input(request: SimulationRequest) -> InputAnalysisResponse:
    return analyze_input(request)
