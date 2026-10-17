"""PazarLab as a remote MCP server (Faz 11), so people can use it from their own Claude as a connector.

The tools run the deterministic simulation core and never call the server's AI (`llm_client.without_ai`):
the user's Claude does the reasoning and the role-play on the user's own plan, PazarLab only does the numbers.

Mounted into the FastAPI app at /mcp (Streamable HTTP, stateless, JSON responses). Protection:
- MCP_ACCESS_KEY: when set, every request needs ?key=<value> (access logs never contain query strings).
- MCP_ALLOWED_HOSTS: Host header allowlist (DNS-rebinding protection); defaults to localhost only.
- MCP_RATE_LIMIT_PER_MIN: one shared limit for all MCP calls. Claude connects from Anthropic's servers,
  so per-IP limits would lump every Claude user together.
"""

from __future__ import annotations

import hmac
import logging
import os
import threading
import time
from collections import deque
from typing import Any, Optional
from urllib.parse import parse_qs

from mcp.server.mcpserver import MCPServer
from mcp.server.mcpserver.exceptions import ToolError
from mcp.server.transport_security import TransportSecuritySettings
from mcp.types import ToolAnnotations
from pydantic import BaseModel, ConfigDict, Field

from app.api.simulate import _history_enabled
from app.api.whatif import _metrics, price_sweep
from app.models.category import Category
from app.models.product import CommerceInfo, ProductFeatures, PurchaseMotivation, SimulationRequest, TargetAudience
from app.services import history_store, llm_client
from app.services.labels import MOTIVATION_LABELS, persona_label
from app.services import categories
from app.services.categories import load_category_rules
from app.services.normalization_service import load_persona_data
from app.services.link_reader import URLValidationError, read_product_link
from app.services.simulation_service import run_simulation

INSTRUCTIONS = """PazarLab AI, bir ürünü pazara çıkmadan önce 500 sentetik tüketiciyle (12 alışveriş personası) test eder.
Sayılar deterministik bir modelden gelir; gerçek dönüşüm oranı değil, göreli talep sinyalidir. Bunu kullanıcıya söyle.

Önerilen akış:
1. Kullanıcı bir ürün linki verdiyse `read_product_link` ile bilgileri al; vermediyse `list_categories` ile kategoriyi ve
   o kategorinin önemli alanlarını öğren, eksikleri kullanıcıya sor.
2. `simulate_product` ile simülasyonu çalıştır. Sonucu yorumla: genel skor, alıcı sayısı, hangi personalar alıyor/almıyor,
   zayıflıklar ve kural tabanlı öneriler. `siteUrl` varsa kullanıcıya sitede açabileceğini söyle.
3. Fiyat sorusu varsa `price_sweep`; iki sürümü kıyaslamak için `compare_variants` kullan.
4. Kullanıcı bir personayla konuşmak isterse `list_personas` ile karakteri al ve o persona olarak, simülasyon sonucuyla
   tutarlı şekilde birinci tekil şahısla cevap ver.
Kullanıcıya Türkçe, Türkçe karakterlerle cevap ver."""

PUBLIC_SITE_URL_ENV = "PUBLIC_SITE_URL"
logger = logging.getLogger("mcp")


class ProductInput(BaseModel):
    """What the simulation needs. Text limits match the website form."""

    category: Category = Field(description="Kategori kimliği; list_categories ile alınır. Alt tür bilinmiyorsa aile kimliği, hiçbiri uymuyorsa 'diger'.")
    purchase_motivation: PurchaseMotivation = Field(
        alias="purchaseMotivation",
        description="Satın alma motivasyonu: " + ", ".join(f"{k} ({v})" for k, v in MOTIVATION_LABELS.items()),
    )
    product_name: str = Field(alias="productName", min_length=4, max_length=120)
    price: float = Field(gt=0, le=10_000_000, description="TL")
    market_price: Optional[float] = Field(
        default=None, alias="marketPrice", gt=0, le=10_000_000,
        description="Benzer ürünlerin ortalama fiyatı (TL). 'diger' kategorisinde verilmesi önerilir; diğerlerinde kategori ortalamasını ezer.",
    )
    description: str = Field(min_length=40, max_length=4000, description="Ürün açıklaması; en az 40 karakter.")
    rating: Optional[float] = Field(default=None, ge=0, le=5, description="Mağaza puanı (5 üzerinden), satıştaki ürünler için; read_product_link döndürür.")
    review_count: Optional[int] = Field(default=None, alias="reviewCount", ge=0, description="Değerlendirme sayısı; puanın güvene etkisini büyütür.")
    target_audience: TargetAudience = Field(
        alias="targetAudience",
        description='ageRange ("18-34", "genel"…), gender ("unisex", "kadin", "erkek"), incomeLevel ("low", "middle", "high")',
    )
    features: ProductFeatures = Field(default_factory=ProductFeatures, description="Kategoriye özel alanlar; list_categories'deki anahtarlar.")
    commerce: CommerceInfo = Field(description="shippingDays (gün), returnAvailable, warranty")

    model_config = ConfigDict(populate_by_name=True)

    def to_request(self) -> SimulationRequest:
        return SimulationRequest.model_validate(self.model_dump(by_alias=True, exclude_none=True))


class _SharedRateLimit:
    def __init__(self) -> None:
        self._hits: deque[float] = deque()
        self._lock = threading.Lock()

    def check(self) -> None:
        limit = int(os.getenv("MCP_RATE_LIMIT_PER_MIN", "60") or 0)
        if limit <= 0:
            return
        now = time.monotonic()
        with self._lock:
            while self._hits and now - self._hits[0] > 60:
                self._hits.popleft()
            if len(self._hits) >= limit:
                raise ToolError("PazarLab şu anda çok yoğun; bir dakika sonra tekrar deneyin.")
            self._hits.append(now)

    def clear(self) -> None:
        with self._lock:
            self._hits.clear()


rate_limit = _SharedRateLimit()
READ_ONLY = ToolAnnotations(readOnlyHint=True, openWorldHint=False)

mcp = MCPServer(
    "PazarLab AI",
    title="PazarLab AI",
    description="Ürününü 500 sentetik tüketiciyle pazara çıkmadan test et.",
    instructions=INSTRUCTIONS,
)


def _site_url(simulation_id: Optional[str]) -> Optional[str]:
    base = os.getenv(PUBLIC_SITE_URL_ENV, "").strip().rstrip("/")
    return f"{base}/dashboard?r={simulation_id}" if base and simulation_id else None


@mcp.tool(title="Kategoriler", annotations=READ_ONLY)
def list_categories() -> dict[str, Any]:
    """Kategori ailelerini ve alt türlerini; her biri için ortalama fiyatı ve skoru etkileyen alanları döndürür."""
    rate_limit.check()
    data = load_category_rules()

    def entry(cid: str) -> dict[str, Any]:
        rule = categories.rule_for(cid)
        return {
            "id": cid,
            "label": rule["label"],
            "averagePrice": rule.get("averagePrice"),
            "defaultMotivation": rule["defaultMotivation"],
            "fields": [{"key": "colors" if f["name"] == "colorsText" else f["name"], "label": f["label"]} for f in rule["form"]["fields"]],
        }

    return {
        "families": [
            {**entry(fid), "subtypes": [entry(cid) for cid, cat in data["categories"].items() if cat["family"] == fid]}
            for fid in data["families"]
        ],
        "note": ("Kategori olarak alt tür kimliğini ver; alt tür bilinmiyorsa aile kimliğini. 'diger' ailesinin ortalama fiyatı yoktur; "
                 "marketPrice (benzer ürünlerin ortalama fiyatı) verilmezse fiyat nötr kabul edilir."),
        "motivations": MOTIVATION_LABELS,
    }


@mcp.tool(title="Personalar", annotations=READ_ONLY)
def list_personas() -> dict[str, Any]:
    """12 alışveriş personasını karakterleriyle döndürür (rol yapmak için)."""
    rate_limit.check()
    return {
        "personas": [
            {
                "id": p["name"],
                "name": p.get("displayName", p["name"]),
                "shareOfConsumers": p["count"],
                "reason": p["reason"],
                "advice": p["advice"],
                "personalityType": p.get("personalityType"),
                "traits": p.get("personalityTraits", {}),
                "rolePrompt": p.get("aiRoleplayPrompt", ""),
            }
            for p in load_persona_data()["personaTypes"]
        ]
    }


@mcp.tool(name="read_product_link", title="Ürün linkini oku", annotations=ToolAnnotations(readOnlyHint=True, openWorldHint=True))
def read_link(url: str) -> dict[str, Any]:
    """Herkese açık bir ürün sayfasından başlık, fiyat, açıklama, kategori ve özellikleri okur."""
    rate_limit.check()
    try:
        with llm_client.without_ai():
            result = read_product_link(url)
    except URLValidationError as exc:
        raise ToolError(str(exc)) from exc
    return result.model_dump(by_alias=True, exclude_none=True, exclude={"images", "image"})


@mcp.tool(title="Simülasyonu çalıştır", annotations=ToolAnnotations(readOnlyHint=False, idempotentHint=True, openWorldHint=False))
def simulate_product(product: ProductInput) -> dict[str, Any]:
    """500 sentetik tüketiciyle simülasyon çalıştırır; skorlar, persona kararları, zayıflıklar ve öneriler döner.

    Sonuç paylaşılabilsin diye kaydedilir (`simulationId`)."""
    rate_limit.check()
    request = product.to_request()
    with llm_client.without_ai():
        response = run_simulation(request)
    simulation_id = None
    if _history_enabled():
        try:
            simulation_id = history_store.save(request, response)
        except Exception:  # a full disk must not cost the user the result (same rule as /api/simulate)
            logger.exception("Could not save MCP simulation")
    insights = response.ai_insights
    return {
        "simulationId": simulation_id,
        "siteUrl": _site_url(simulation_id),
        "overallScore": response.overall_score,
        "estimatedBuyers": response.estimated_buyers,
        "estimatedBuyersRange": response.buyers_range.model_dump() if response.buyers_range else None,
        "simulatedConsumers": response.simulated_consumers,
        "decisionDistribution": response.decision_distribution.model_dump(),
        "marketBreadthScore": response.market_breadth_score,
        "intentConversionScore": response.intent_conversion_score,
        "problemSolutionFit": response.problem_solution_fit,
        "personas": [
            {
                "name": persona_label(p.name),
                "buyProbability": round(p.purchase_probability, 2),
                "decision": p.decision_label,
                "reason": p.reason,
                "advice": p.advice,
            }
            for p in response.all_personas
        ],
        "weaknesses": response.weaknesses,
        "adoptionCurveByWeek": response.adoption_curve,
        "bestImprovements": [i.model_dump(by_alias=True) for i in response.improvements],
        "segments": {k: [s.model_dump(by_alias=True) for s in v] for k, v in response.segments.items()},
        "townRepresentatives": [r.model_dump(by_alias=True) for r in response.representatives],
        "inputWarnings": response.input_analysis.warnings if response.input_analysis else [],
        "ruleBasedAdvice": {
            "summary": insights.summary,
            "salesRecipe": insights.sales_recipe,
            "pricing": insights.pricing_advice,
            "description": insights.description_advice,
            "channels": insights.channel_recommendation,
        },
        "note": "Göreli talep sinyali; gerçek dönüşüm oranı değildir.",
    }


@mcp.tool(name="price_sweep", title="Fiyat duyarlılığı", annotations=READ_ONLY)
def price_sweep_tool(product: ProductInput) -> dict[str, Any]:
    """Fiyatın %60'ı ile %140'ı arasında 9 noktada alıcı sayısı, skor ve ciroyu hesaplar."""
    rate_limit.check()
    return price_sweep(product.to_request()).model_dump(by_alias=True)


@mcp.tool(title="İki sürümü karşılaştır", annotations=READ_ONLY)
def compare_variants(base: ProductInput, variant: ProductInput) -> dict[str, Any]:
    """Aynı ürünün iki sürümünü (fiyat, açıklama, kargo, iade, garanti…) aynı sentetik kalabalıkla karşılaştırır."""
    rate_limit.check()
    result = {}
    for key, product in (("base", base), ("variant", variant)):
        metrics = _metrics(product.to_request()).model_dump(by_alias=True)
        metrics["topPersona"] = persona_label(metrics["topPersona"]) if metrics.get("topPersona") else None
        result[key] = metrics
    return result


@mcp.tool(title="Kayıtlı sonucu getir", annotations=READ_ONLY)
def get_simulation(simulation_id: str) -> dict[str, Any]:
    """Daha önce kaydedilmiş bir simülasyonu (sitedeki paylaşım linkindeki kimlik) getirir."""
    rate_limit.check()
    record = history_store.get(simulation_id) if history_store.is_valid_id(simulation_id) else None
    if record is None:
        raise ToolError("Bu kimlikle kayıtlı bir sonuç yok ya da süresi doldu.")
    response = record["response"]
    return {
        "simulationId": simulation_id,
        "siteUrl": _site_url(simulation_id),
        "productName": record["productName"],
        "category": record["category"],
        "overallScore": response.get("overallScore"),
        "estimatedBuyers": response.get("estimatedBuyers"),
        "decisionDistribution": response.get("decisionDistribution"),
        "personas": [
            {"name": persona_label(p["name"]), "buyProbability": p.get("purchaseProbability"), "decision": p.get("decisionLabel")}
            for p in response.get("allPersonas", [])
        ],
        "weaknesses": response.get("weaknesses", []),
    }


def _transport_security() -> TransportSecuritySettings:
    configured = [h.strip() for h in os.getenv("MCP_ALLOWED_HOSTS", "").split(",") if h.strip()]
    hosts = configured or ["127.0.0.1:*", "localhost:*", "[::1]:*"]
    return TransportSecuritySettings(
        enable_dns_rebinding_protection=True,
        allowed_hosts=hosts,
        allowed_origins=[f"https://{h}" for h in configured] + ["http://127.0.0.1:*", "http://localhost:*"],
    )


class _AccessKey:
    """ASGI guard: with MCP_ACCESS_KEY set, requests need ?key=<value> (claude.ai connectors accept a URL, not headers)."""

    def __init__(self, app: Any) -> None:
        self.app = app

    async def __call__(self, scope: dict, receive: Any, send: Any) -> None:
        expected = os.getenv("MCP_ACCESS_KEY", "")
        if scope["type"] == "http" and expected:
            given = parse_qs(scope.get("query_string", b"").decode()).get("key", [""])[0]
            if not hmac.compare_digest(given.encode(), expected.encode()):
                await send({"type": "http.response.start", "status": 401, "headers": [(b"content-type", b"application/json")]})
                await send({"type": "http.response.body", "body": b'{"detail": "MCP erisim anahtari gecersiz."}'})
                return
        await self.app(scope, receive, send)


def create_mcp_app() -> Any:
    """Starlette app serving MCP at /mcp. Its session manager must run in the host app's lifespan (see main.py)."""
    app = mcp.streamable_http_app(stateless_http=True, json_response=True, transport_security=_transport_security())
    return _AccessKey(app)
