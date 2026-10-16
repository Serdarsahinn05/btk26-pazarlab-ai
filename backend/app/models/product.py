from enum import Enum
from typing import Annotated, Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

from app.models.input_analysis import InputAnalysisResponse


Category = Literal[
    "tisort", "pantolon", "mont", "elbise", "etek",
    "telefon", "laptop", "kulaklik", "tablet", "akilli_saat",
]

ShortText = Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)]
Label = Annotated[str, StringConstraints(strip_whitespace=True, max_length=40)]
# An image is either a URL or a base64 data URL (up to ~1.1 MB of image data).
ImageRef = Annotated[str, StringConstraints(max_length=1_500_000)]


class PurchaseMotivation(str, Enum):
    STYLE = "stil_begeni"
    NEED = "ihtiyac"
    PROBLEM_SOLVING = "problem_cozme"
    SPARE_PART_REPAIR = "yedek_parca_tamir"
    GIFT = "hediye"
    TREND = "trend"
    PROFESSIONAL_USE = "profesyonel_kullanim"


class TargetAudience(BaseModel):
    age_range: Label = Field(alias="ageRange")
    gender: Label
    income_level: Label = Field(alias="incomeLevel")

    model_config = ConfigDict(populate_by_name=True)


class ProductFeatures(BaseModel):
    fabric: Optional[ShortText] = None
    inner_filling: Optional[ShortText] = Field(default=None, alias="innerFilling")
    waterproof: Optional[bool] = None
    windproof: Optional[bool] = None
    season: Optional[ShortText] = None
    colors: Optional[Annotated[list[ShortText], Field(max_length=20)]] = None
    sizes: Optional[Annotated[list[ShortText], Field(max_length=20)]] = None
    size_range: Optional[ShortText] = Field(default=None, alias="sizeRange")
    print_type: Optional[ShortText] = Field(default=None, alias="printType")
    collar_type: Optional[ShortText] = Field(default=None, alias="collarType")
    sleeve_length: Optional[ShortText] = Field(default=None, alias="sleeveLength")
    waist_type: Optional[ShortText] = Field(default=None, alias="waistType")
    leg_type: Optional[ShortText] = Field(default=None, alias="legType")
    stretch: Optional[bool] = None
    hood: Optional[bool] = None
    pocket_count: Optional[ShortText] = Field(default=None, alias="pocketCount")
    brand: Optional[ShortText] = None
    ram: Optional[ShortText] = None
    storage: Optional[ShortText] = None
    processor: Optional[ShortText] = None
    camera: Optional[ShortText] = None
    battery: Optional[ShortText] = None
    refresh_rate: Optional[ShortText] = Field(default=None, alias="refreshRate")
    screen_size: Optional[ShortText] = Field(default=None, alias="screenSize")
    display_type: Optional[ShortText] = Field(default=None, alias="displayType")
    gpu: Optional[ShortText] = None
    weight: Optional[ShortText] = None
    operating_system: Optional[ShortText] = Field(default=None, alias="operatingSystem")
    connectivity: Optional[ShortText] = None
    sensors: Optional[ShortText] = None
    connection_type: Optional[ShortText] = Field(default=None, alias="connectionType")
    noise_cancellation: Optional[bool] = Field(default=None, alias="noiseCancellation")
    microphone: Optional[ShortText] = None
    water_resistance: Optional[ShortText] = Field(default=None, alias="waterResistance")
    latency: Optional[ShortText] = None
    material: Optional[ShortText] = None
    style: Optional[ShortText] = None
    fit: Optional[ShortText] = None
    use_case: Optional[ShortText] = Field(default=None, alias="useCase")
    upholstery: Optional[ShortText] = None
    frame_material: Optional[ShortText] = Field(default=None, alias="frameMaterial")
    load_capacity: Optional[ShortText] = Field(default=None, alias="loadCapacity")
    compatible_model: Optional[ShortText] = Field(default=None, alias="compatibleModel")
    dimensions: Optional[ShortText] = None
    installation_ease: Optional[ShortText] = Field(default=None, alias="installationEase")

    model_config = ConfigDict(populate_by_name=True, extra="ignore")


class CommerceInfo(BaseModel):
    shipping_days: int = Field(alias="shippingDays", ge=0, le=60)
    return_available: bool = Field(alias="returnAvailable")
    warranty: bool
    warranty_months: Optional[int] = Field(default=None, alias="warrantyMonths", ge=0, le=120)

    model_config = ConfigDict(populate_by_name=True)


class SimulationRequest(BaseModel):
    category: Category
    purchase_motivation: PurchaseMotivation = Field(alias="purchaseMotivation")
    product_name: str = Field(alias="productName", min_length=4, max_length=120)
    product_url: Optional[str] = Field(default=None, alias="productUrl", max_length=2048)
    price: float = Field(gt=0, le=10_000_000, allow_inf_nan=False)
    description: str = Field(min_length=40, max_length=4000)
    target_audience: TargetAudience = Field(alias="targetAudience")
    features: ProductFeatures = Field(default_factory=ProductFeatures)
    commerce: CommerceInfo
    images: list[ImageRef] = Field(default_factory=list, max_length=6)
    input_analysis: Optional[InputAnalysisResponse] = Field(default=None, alias="inputAnalysis")

    model_config = ConfigDict(populate_by_name=True)

    def raw_features(self) -> dict[str, Any]:
        return self.features.model_dump(by_alias=True, exclude_none=True)
