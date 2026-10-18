"""Competitor choice (Faz 21): the seller's product against 1–3 rivals on the same town."""

from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field

MAX_COMPETITORS = 3


class CompetitorInput(BaseModel):
    """A rival as read from its page (or typed in). Every field left empty is taken from the seller's own
    product and reported as an assumption, so an unknown never counts for or against the rival."""

    name: str = Field(min_length=4, max_length=120)
    price: float = Field(gt=0, le=10_000_000, allow_inf_nan=False)
    url: Optional[str] = Field(default=None, max_length=2048)
    description: Optional[str] = Field(default=None, max_length=4000)
    # Same keys as the product form (camelCase); unknown keys are dropped.
    features: dict[str, Any] = Field(default_factory=dict, max_length=60)
    rating: Optional[float] = Field(default=None, ge=0, le=5, allow_inf_nan=False)
    review_count: Optional[int] = Field(default=None, alias="reviewCount", ge=0, le=100_000_000)
    shipping_days: Optional[int] = Field(default=None, alias="shippingDays", ge=0, le=60)
    return_available: Optional[bool] = Field(default=None, alias="returnAvailable")
    warranty: Optional[bool] = None

    model_config = ConfigDict(populate_by_name=True)


class CompetitorChoiceRequest(BaseModel):
    simulation_id: str = Field(alias="simulationId", min_length=1, max_length=32)
    competitors: list[CompetitorInput] = Field(min_length=1, max_length=MAX_COMPETITORS)

    model_config = ConfigDict(populate_by_name=True)
