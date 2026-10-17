"""Live check of a half-filled product form (Faz 13b): estimated score and what each empty field would add.

No LLM, deterministic. Every variant runs on the same crowd (a seed fixed per category), so a gain is the
effect of that field alone, not crowd noise. Validation is looser than /api/simulate: the draft may still miss
its name or a long enough description.
"""

from typing import Any, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field

from app.models.category import Category
from app.models.product import CommerceInfo, ProductFeatures, PurchaseMotivation, SimulationRequest, TargetAudience
from app.security import RateLimit
from app.services import categories
from app.services.normalization_service import load_persona_data
from app.services.input_analysis_service import deterministic_analysis
from app.services.simulation_service import INPUT_CAPS, simulate_core
from app.utils.math_utils import stable_seed

router = APIRouter(prefix="/api", tags=["draft"])

# Words that saturate the description score (normalization: words / 80, capped at 0.34).
DESCRIPTION_WORDS_TARGET = 28
FILLER_WORD = "bilgi"
# Smaller gains are within what a reader would call "no change".
MIN_GAIN = 0.3
CAP_REASONS = {
    "implausible": "Ürün bilgileri tutarsız ya da çok eksik görünüyor.",
    "doubtful": "Girdi uyarı veriyor: açıklama zayıf ya da ürün kategoriyle tam uyuşmuyor.",
    "thin": "Açıklama ve teknik bilgiler henüz zayıf.",
}


class DraftRequest(BaseModel):
    category: Category
    purchase_motivation: Optional[PurchaseMotivation] = Field(default=None, alias="purchaseMotivation")
    product_name: str = Field(default="", alias="productName", max_length=120)
    price: Optional[float] = Field(default=None, gt=0, le=10_000_000, allow_inf_nan=False)
    market_price: Optional[float] = Field(default=None, alias="marketPrice", gt=0, le=10_000_000, allow_inf_nan=False)
    description: str = Field(default="", max_length=4000)
    target_audience: TargetAudience = Field(
        default_factory=lambda: TargetAudience(ageRange="genel", gender="unisex", incomeLevel="middle"), alias="targetAudience"
    )
    features: ProductFeatures = Field(default_factory=ProductFeatures)
    commerce: CommerceInfo = Field(default_factory=lambda: CommerceInfo(shippingDays=3, returnAvailable=False, warranty=False))

    model_config = ConfigDict(populate_by_name=True)


class Gain(BaseModel):
    field: str
    label: str
    delta: float  # score points, one decimal


class Cap(BaseModel):
    limit: int
    reason: str


class DraftResponse(BaseModel):
    score: Optional[int] = None
    buyers: Optional[int] = None
    description_words: int = Field(alias="descriptionWords")
    gains: list[Gain]
    # Weak input holds the score down whatever else is filled (simulation_service.INPUT_CAPS).
    cap: Optional[Cap] = None
    warnings: list[str] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


def _request(draft: DraftRequest, **changes: Any) -> SimulationRequest:
    data = draft.model_dump(by_alias=True, exclude_none=True)
    data.update(changes)
    data["purchaseMotivation"] = data.get("purchaseMotivation") or categories.rule_for(draft.category)["defaultMotivation"]
    name = data.get("productName", "").strip()
    data["productName"] = name if len(name) >= 4 else "Taslak ürün"
    # Spaces add no words, so padding to the minimum length leaves the description score as it is.
    data["description"] = data.get("description", "").ljust(40)
    return SimulationRequest.model_validate(data)


def _placeholder(field: dict[str, Any]) -> Any:
    if field.get("type") == "checkbox":
        return True
    if field["name"] == "season":
        return "all"  # neutral: a peak season would promise more than "fill this in" gives
    if field.get("type") == "select" and field.get("options"):
        return field["options"][0]["value"]
    return "var"


def _candidates(draft: DraftRequest) -> list[tuple[str, str, dict[str, Any]]]:
    """(field, label, request changes) for every empty input that could raise the score."""
    features = draft.features.model_dump(by_alias=True, exclude_none=True)
    out = []
    for field in categories.rule_for(draft.category)["form"]["fields"]:
        key = "colors" if field["name"] == "colorsText" else field["name"]
        if features.get(key):
            continue
        value = ["renk"] if key == "colors" else _placeholder(field)
        out.append((field["name"], field["label"], {"features": {**features, key: value}}))
    commerce = draft.commerce.model_dump(by_alias=True)
    if not commerce["warranty"]:
        out.append(("warranty", "Garanti / fatura", {"commerce": {**commerce, "warranty": True}}))
    if not commerce["returnAvailable"]:
        out.append(("returnAvailable", "İade imkânı", {"commerce": {**commerce, "returnAvailable": True}}))
    if commerce["shippingDays"] > 2:
        out.append(("shippingDays", "Kargoyu 2 güne indir", {"commerce": {**commerce, "shippingDays": 2}}))
    words = draft.description.split()
    if len(words) < DESCRIPTION_WORDS_TARGET:
        longer = " ".join(words + [FILLER_WORD] * (DESCRIPTION_WORDS_TARGET - len(words)))
        out.append(("description", f"Açıklamayı ~{DESCRIPTION_WORDS_TARGET} kelimeye çıkar", {"description": longer}))
    return out


@router.post(
    "/draft-check",
    response_model=DraftResponse,
    dependencies=[Depends(RateLimit("RATE_LIMIT_DRAFT_PER_MIN", 60))],
)
def draft_check(draft: DraftRequest) -> DraftResponse:
    words = len(draft.description.split())
    if not draft.price:
        return DraftResponse(score=None, buyers=None, descriptionWords=words, gains=[])
    draft = categories.anchored(draft)  # the same reference price for every variant
    seed = stable_seed({"draft": draft.category}, load_persona_data()["simulationConfig"]["seedSalt"])
    request = _request(draft)
    analysis = deterministic_analysis(request)
    base = simulate_core(request, analysis, seed=seed)
    gains = []
    for field, label, changes in _candidates(draft):
        variant = simulate_core(_request(draft, **changes), seed=seed)
        # Under a cap every field seems to add the same few points (up to the cap): only steps that lift it count.
        if base["score_cap"] and variant["score_cap"] == base["score_cap"]:
            continue
        delta = round(variant["score_exact"] - base["score_exact"], 1)
        if delta >= MIN_GAIN:
            gains.append(Gain(field=field, label=label, delta=delta))
    gains.sort(key=lambda g: g.delta, reverse=True)
    cap = base["score_cap"]
    return DraftResponse(
        score=base["overall_score"],
        buyers=base["estimated_buyers"],
        descriptionWords=words,
        gains=gains,
        cap=Cap(limit=INPUT_CAPS[cap][0], reason=CAP_REASONS[cap]) if cap else None,
        warnings=analysis.warnings,
    )
