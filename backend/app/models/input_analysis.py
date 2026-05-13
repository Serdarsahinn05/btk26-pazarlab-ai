from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class InputQualitySignals(BaseModel):
    plausibility: float = Field(default=0.65, ge=0, le=1)
    category_fit: float = Field(default=0.65, alias="categoryFit", ge=0, le=1)
    brand_trust: float = Field(default=0.45, alias="brandTrust", ge=0, le=1)
    description_completeness: float = Field(default=0.45, alias="descriptionCompleteness", ge=0, le=1)
    spec_completeness: float = Field(default=0.45, alias="specCompleteness", ge=0, le=1)
    quality_signal: float = Field(default=0.45, alias="qualitySignal", ge=0, le=1)
    visual_appeal_signal: float = Field(default=0.45, alias="visualAppealSignal", ge=0, le=1)
    target_fit_signal: float = Field(default=0.45, alias="targetFitSignal", ge=0, le=1)

    model_config = ConfigDict(populate_by_name=True)


class InputAnalysisResponse(BaseModel):
    ai_used: bool = Field(default=False, alias="aiUsed")
    should_warn: bool = Field(default=False, alias="shouldWarn")
    confidence: float = Field(default=0.55, ge=0, le=1)
    warnings: List[str] = Field(default_factory=list)
    suggestions: List[str] = Field(default_factory=list)
    suspected_category: Optional[str] = Field(default=None, alias="suspectedCategory")
    corrected_product_name: Optional[str] = Field(default=None, alias="correctedProductName")
    signals: InputQualitySignals = Field(default_factory=InputQualitySignals)

    model_config = ConfigDict(populate_by_name=True)
