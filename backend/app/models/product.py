from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.input_analysis import InputAnalysisResponse


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
    fabric: Optional[str] = None
    inner_filling: Optional[str] = Field(default=None, alias="innerFilling")
    waterproof: Optional[bool] = None
    windproof: Optional[bool] = None
    season: Optional[str] = None
    colors: Optional[list[str]] = None
    sizes: Optional[list[str]] = None
    size_range: Optional[str] = Field(default=None, alias="sizeRange")
    print_type: Optional[str] = Field(default=None, alias="printType")
    collar_type: Optional[str] = Field(default=None, alias="collarType")
    sleeve_length: Optional[str] = Field(default=None, alias="sleeveLength")
    waist_type: Optional[str] = Field(default=None, alias="waistType")
    leg_type: Optional[str] = Field(default=None, alias="legType")
    stretch: Optional[bool] = None
    hood: Optional[bool] = None
    pocket_count: Optional[str] = Field(default=None, alias="pocketCount")
    brand: Optional[str] = None
    ram: Optional[str] = None
    storage: Optional[str] = None
    processor: Optional[str] = None
    camera: Optional[str] = None
    battery: Optional[str] = None
    refresh_rate: Optional[str] = Field(default=None, alias="refreshRate")
    screen_size: Optional[str] = Field(default=None, alias="screenSize")
    gpu: Optional[str] = None
    weight: Optional[str] = None
    connection_type: Optional[str] = Field(default=None, alias="connectionType")
    noise_cancellation: Optional[bool] = Field(default=None, alias="noiseCancellation")
    microphone: Optional[str] = None
    water_resistance: Optional[str] = Field(default=None, alias="waterResistance")
    latency: Optional[str] = None
    material: Optional[str] = None
    style: Optional[str] = None
    fit: Optional[str] = None
    use_case: Optional[str] = Field(default=None, alias="useCase")
    upholstery: Optional[str] = None
    frame_material: Optional[str] = Field(default=None, alias="frameMaterial")
    load_capacity: Optional[str] = Field(default=None, alias="loadCapacity")
    compatible_model: Optional[str] = Field(default=None, alias="compatibleModel")
    dimensions: Optional[str] = None
    installation_ease: Optional[str] = Field(default=None, alias="installationEase")

    model_config = ConfigDict(populate_by_name=True, extra="allow")


class CommerceInfo(BaseModel):
    shipping_days: int = Field(alias="shippingDays", ge=0, le=60)
    return_available: bool = Field(alias="returnAvailable")
    warranty: bool
    warranty_months: Optional[int] = Field(default=None, alias="warrantyMonths", ge=0, le=120)

    model_config = ConfigDict(populate_by_name=True)


class SimulationRequest(BaseModel):
    category: str = Field(min_length=1)
    purchase_motivation: PurchaseMotivation = Field(alias="purchaseMotivation")
    product_name: str = Field(alias="productName", min_length=4)
    price: float = Field(gt=0)
    description: str = Field(min_length=40)
    target_audience: TargetAudience = Field(alias="targetAudience")
    features: ProductFeatures = Field(default_factory=ProductFeatures)
    commerce: CommerceInfo
    input_analysis: Optional[InputAnalysisResponse] = Field(default=None, alias="inputAnalysis")

    model_config = ConfigDict(populate_by_name=True)

    def raw_features(self) -> dict[str, Any]:
        return self.features.model_dump(by_alias=True, exclude_none=True)
