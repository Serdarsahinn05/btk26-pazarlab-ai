from typing import Any

from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["simulation"])


MOCK_SIMULATION_RESPONSE: dict[str, Any] = {
    "overallScore": 68,
    "marketBreadthScore": 74,
    "intentConversionScore": 63,
    "problemSolutionFit": 45,
    "simulatedConsumers": 500,
    "estimatedBuyers": 341,
    "topPersonas": [
        {
            "name": "Trend Takipcisi",
            "purchaseProbability": 0.82,
            "reason": "Oversize stil ve renk secenekleri bu persona icin guclu.",
            "advice": "TikTok ve Instagram Reels odakli kisa kombin videolari onerilir.",
        },
        {
            "name": "Pratik Cozum Arayan",
            "purchaseProbability": 0.74,
            "reason": "Su ve ruzgar gecirmezlik gunluk kullanim ihtiyacini karsiliyor.",
            "advice": "Reklamda koruma, konfor ve gunluk kullanim vurgulanmali.",
        },
        {
            "name": "Kalite Odakli Alici",
            "purchaseProbability": 0.69,
            "reason": "Fonksiyonel ozellikler guclu fakat kumas ve garanti bilgisi daha net olmali.",
            "advice": "Urun aciklamasina kumas, dikis, ic dolgu ve iade bilgisi eklenmeli.",
        },
    ],
    "weaknesses": [
        "Marka guveni dusuk.",
        "Garanti bilgisi eksik.",
        "Fiyat hassas kullanicilar icin fiyat biraz yuksek algilaniyor.",
    ],
    "weaknessSignals": [
        "brand_trust_low",
        "warranty_missing",
        "price_sensitive_users_rejected",
    ],
    "normalizedProduct": {
        "priceFit": 0.70,
        "priceRisk": 0.30,
        "qualityScore": 0.76,
        "trendFit": 0.81,
        "brandTrust": 0.42,
        "descriptionCompleteness": 0.73,
        "visualAppeal": 0.84,
        "seasonFit": 0.92,
        "shippingReturnScore": 0.66,
        "targetAudienceFit": 0.80,
        "differentiationScore": 0.58,
    },
    "aiInsights": {
        "summary": "Urun ozellikle genc ve trend odakli kullanicilar icin guclu potansiyel tasiyor.",
        "productTypeInsight": (
            "Bu urun trend odakli bir stil urunudur. Genis kitleye hitap eder, "
            "sosyal medya reklamlariyla yuksek erisim saglar."
        ),
        "salesRecipe": [
            "Urun basliginda su gecirmez ve oversize ifadeleri one cikarilmali.",
            "Aciklamaya kumas turu, beden kalibi ve iade bilgisi eklenmeli.",
        ],
        "marketingAdvice": "Instagram Reels ve TikTok odakli gorsel kampanya onerilir.",
        "descriptionAdvice": "Kumas, beden ve iade bilgisi aciklamaya eklenmeli.",
        "pricingAdvice": "1800TL premium algiyi koruyor ancak kampanya testi yapilabilir.",
        "seasonAdvice": "Kis sezonu icin yuksek uyum var.",
        "channelRecommendation": ["Instagram", "TikTok", "YouTube Shorts"],
        "improvedDescription": (
            "Su gecirmez dis yuzeyi ve oversize kesimiyle soguk ve yagisli havalarda "
            "gunluk kullanim icin tasarlanmis modern kislik mont."
        ),
    },
}


@router.post("/simulate")
async def simulate_product(_: dict[str, Any]) -> dict[str, Any]:
    return MOCK_SIMULATION_RESPONSE