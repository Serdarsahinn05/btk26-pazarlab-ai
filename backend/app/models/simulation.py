from typing import Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.input_analysis import InputAnalysisResponse


class PersonaResult(BaseModel):
    name: str
    purchase_probability: float = Field(alias="purchaseProbability", ge=0, le=1)
    reason: str
    advice: str

    model_config = ConfigDict(populate_by_name=True)


class NormalizedProduct(BaseModel):
    price_fit: float = Field(alias="priceFit", ge=0, le=1)
    price_risk: float = Field(alias="priceRisk", ge=0, le=1)
    quality_score: float = Field(alias="qualityScore", ge=0, le=1)
    trend_fit: float = Field(alias="trendFit", ge=0, le=1)
    brand_trust: float = Field(alias="brandTrust", ge=0, le=1)
    description_completeness: float = Field(alias="descriptionCompleteness", ge=0, le=1)
    visual_appeal: float = Field(alias="visualAppeal", ge=0, le=1)
    season_fit: float = Field(alias="seasonFit", ge=0, le=1)
    shipping_return_score: float = Field(alias="shippingReturnScore", ge=0, le=1)
    target_audience_fit: float = Field(alias="targetAudienceFit", ge=0, le=1)
    differentiation_score: float = Field(alias="differentiationScore", ge=0, le=1)

    model_config = ConfigDict(populate_by_name=True)


class AiInsights(BaseModel):
    summary: str
    product_type_insight: str = Field(alias="productTypeInsight")
    sales_recipe: list[str] = Field(alias="salesRecipe")
    marketing_advice: str = Field(alias="marketingAdvice")
    description_advice: str = Field(alias="descriptionAdvice")
    pricing_advice: str = Field(alias="pricingAdvice")
    season_advice: str = Field(alias="seasonAdvice")
    channel_recommendation: list[str] = Field(alias="channelRecommendation")
    improved_description: str = Field(alias="improvedDescription")

    model_config = ConfigDict(populate_by_name=True)


class SimulationResponse(BaseModel):
    overall_score: int = Field(alias="overallScore", ge=0, le=100)
    market_breadth_score: int = Field(alias="marketBreadthScore", ge=0, le=100)
    intent_conversion_score: int = Field(alias="intentConversionScore", ge=0, le=100)
    problem_solution_fit: int = Field(alias="problemSolutionFit", ge=0, le=100)
    simulated_consumers: int = Field(alias="simulatedConsumers", ge=0)
    estimated_buyers: int = Field(alias="estimatedBuyers", ge=0)
    top_personas: list[PersonaResult] = Field(alias="topPersonas")
    weaknesses: list[str]
    weakness_signals: list[str] = Field(default_factory=list, alias="weaknessSignals")
    normalized_product: NormalizedProduct = Field(alias="normalizedProduct")
    ai_insights: AiInsights = Field(alias="aiInsights")
    images: list[str] = Field(default_factory=list)
    input_analysis: Optional[InputAnalysisResponse] = Field(default=None, alias="inputAnalysis")

    model_config = ConfigDict(populate_by_name=True)
