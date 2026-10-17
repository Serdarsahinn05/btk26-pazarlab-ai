"""What-if analysis on the deterministic core (no LLM calls, milliseconds per run)."""

from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field

from app.models.product import SimulationRequest
from app.models.simulation import DecisionDistribution
from app.security import RateLimit
from app.services import categories
from app.services.simulation_service import simulate_core

router = APIRouter(prefix="/api", tags=["what-if"])

# Price as a share of the entered price: 60% … 140% in 10% steps.
SWEEP_FACTORS = [0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4]


class CoreMetrics(BaseModel):
    price: float
    overall_score: int = Field(alias="overallScore")
    estimated_buyers: int = Field(alias="estimatedBuyers")
    simulated_consumers: int = Field(alias="simulatedConsumers")
    decision_distribution: DecisionDistribution = Field(alias="decisionDistribution")
    market_breadth_score: int = Field(alias="marketBreadthScore")
    intent_conversion_score: int = Field(alias="intentConversionScore")
    problem_solution_fit: int = Field(alias="problemSolutionFit")
    top_persona: Optional[str] = Field(default=None, alias="topPersona")
    weaknesses: list[str] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


class SweepPoint(BaseModel):
    factor: float
    price: float
    estimated_buyers: int = Field(alias="estimatedBuyers")
    buy_rate: float = Field(alias="buyRate")
    overall_score: int = Field(alias="overallScore")
    revenue: float

    model_config = ConfigDict(populate_by_name=True)


class SweepResponse(BaseModel):
    points: list[SweepPoint]
    best_revenue: SweepPoint = Field(alias="bestRevenue")
    best_buyers: SweepPoint = Field(alias="bestBuyers")

    model_config = ConfigDict(populate_by_name=True)


class CompareRequest(BaseModel):
    base: SimulationRequest
    variant: SimulationRequest


class CompareResponse(BaseModel):
    base: CoreMetrics
    variant: CoreMetrics


def _metrics(request: SimulationRequest) -> CoreMetrics:
    core = simulate_core(request)
    top = core["all_personas"][0].name if core["all_personas"] else None
    return CoreMetrics(
        price=request.price,
        overallScore=core["overall_score"],
        estimatedBuyers=core["estimated_buyers"],
        simulatedConsumers=core["simulated_consumers"],
        decisionDistribution=DecisionDistribution(**core["decision_counts"]),
        marketBreadthScore=core["market_breadth"],
        intentConversionScore=core["intent_conversion"],
        problemSolutionFit=core["problem_solution"],
        topPersona=top,
        weaknesses=core["weaknesses"],
    )


@router.post(
    "/price-sweep",
    response_model=SweepResponse,
    dependencies=[Depends(RateLimit("RATE_LIMIT_WHATIF_PER_MIN", 20))],
)
def price_sweep(request: SimulationRequest) -> SweepResponse:
    points: list[SweepPoint] = []
    request = categories.anchored(request)
    for factor in SWEEP_FACTORS:
        price = round(request.price * factor, 2)
        m = _metrics(request.model_copy(update={"price": price}))
        points.append(
            SweepPoint(
                factor=factor,
                price=price,
                estimatedBuyers=m.estimated_buyers,
                buyRate=round(m.estimated_buyers / m.simulated_consumers, 4) if m.simulated_consumers else 0.0,
                overallScore=m.overall_score,
                revenue=round(price * m.estimated_buyers, 2),
            )
        )
    return SweepResponse(
        points=points,
        bestRevenue=max(points, key=lambda p: (p.revenue, -abs(p.factor - 1))),
        bestBuyers=max(points, key=lambda p: (p.estimated_buyers, -abs(p.factor - 1))),
    )


@router.post(
    "/compare",
    response_model=CompareResponse,
    dependencies=[Depends(RateLimit("RATE_LIMIT_WHATIF_PER_MIN", 20))],
)
def compare(payload: CompareRequest) -> CompareResponse:
    base = categories.anchored(payload.base)
    return CompareResponse(base=_metrics(base), variant=_metrics(categories.anchored(payload.variant, base)))
