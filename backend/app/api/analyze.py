from fastapi import APIRouter

from app.models.input_analysis import InputAnalysisResponse
from app.models.product import SimulationRequest
from app.services.input_analysis_service import analyze_input

router = APIRouter(prefix="/api", tags=["input-analysis"])


@router.post("/analyze-input", response_model=InputAnalysisResponse)
async def analyze_product_input(request: SimulationRequest) -> InputAnalysisResponse:
    return analyze_input(request)
