from enum import Enum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class PurchaseMotivation(str, Enum):
    STYLE = "stil_begeni"
    NEED = "ihtiyac"
    PROBLEM_SOLVING = "problem_cozme"
    SPARE_PART_REPAIR = "yedek_parca_tamir"
    GIFT = "hediye"
    TREND = "trend"
    PROFESSIONAL_USE = "profesyonel_kullanim"


class TargetAudience(BaseModel):
    age_range: str = Field(alias="ageRange")
    gender: str
    income_level: str = Field(alias="incomeLevel")

    model_config = ConfigDict(populate_by_name=True)


class ProductFeatures(BaseModel):
    fabric: str | None = None
    inner_filling: str | None = Field(default=None, alias="innerFilling")
    waterproof: bool | None = None
    windproof: bool | None = None
    season: str | None = None
    colors: list[str] | None = None
    sizes: list[str] | None = None
    brand: str | None = None
    ram: str | None = None
    storage: str | None = None
    processor: str | None = None
    camera: str | None = None
    battery: str | None = None
    refresh_rate: str | None = Field(default=None, alias="refreshRate")
    material: str | None = None
    style: str | None = None
    fit: str | None = None
    use_case: str | None = Field(default=None, alias="useCase")
    compatible_model: str | None = Field(default=None, alias="compatibleModel")
    dimensions: str | None = None
    installation_ease: str | None = Field(default=None, alias="installationEase")

    model_config = ConfigDict(populate_by_name=True, extra="allow")


class CommerceInfo(BaseModel):
    shipping_days: int = Field(alias="shippingDays", ge=0, le=60)
    return_available: bool = Field(alias="returnAvailable")
    warranty: bool
    warranty_months: int | None = Field(default=None, alias="warrantyMonths", ge=0, le=120)

    model_config = ConfigDict(populate_by_name=True)


class SimulationRequest(BaseModel):
    category: str = Field(min_length=1)
    purchase_motivation: PurchaseMotivation = Field(alias="purchaseMotivation")
    product_name: str = Field(alias="productName", min_length=1)
    price: float = Field(gt=0)
    description: str = Field(min_length=1)
    target_audience: TargetAudience = Field(alias="targetAudience")
    features: ProductFeatures = Field(default_factory=ProductFeatures)
    commerce: CommerceInfo

    model_config = ConfigDict(populate_by_name=True)

    def raw_features(self) -> dict[str, Any]:
        return self.features.model_dump(by_alias=True, exclude_none=True)
