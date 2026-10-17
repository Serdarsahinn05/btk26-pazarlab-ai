"""Constants, config, source types and errors of the product link reader."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict


logger = logging.getLogger("product_scraper")


PUBLIC_URL_ERROR = "Bu link okunamadı. Herkese açık bir http/https ürün sayfası girin."


FETCH_FAILED_MESSAGE = "Ürün sayfası şu anda okunamadı. Bilgileri elle girebilirsiniz."


def _position(value: Any) -> float:
    """BreadcrumbList positions may be numbers or strings; unknown ones go last."""
    try:
        return float(value)
    except (TypeError, ValueError):
        return float("inf")


@dataclass(frozen=True)
class ScraperConfig:
    max_html_bytes: int = 5_000_000
    ai_html_max_bytes: int = 300_000
    request_timeout: float = 10.0
    total_fetch_budget: float = 15.0
    user_agent_bot: str = (
        "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
    )
    user_agent_browser: str = (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    )
    domain_currency_hints: Dict[str, str] = field(default_factory=lambda: {
        ".tr": "TRY", ".com.tr": "TRY", ".de": "EUR", ".fr": "EUR",
        ".co.uk": "GBP", ".uk": "GBP", ".com": "USD", ".jp": "JPY",
    })


class SourceType(str, Enum):
    METADATA = "metadata"
    JSON_LD = "json_ld"
    AI_ENHANCED = "ai_enhanced"
    FALLBACK = "fallback"
    HYBRID = "hybrid"


class ScrapingError(Exception):
    pass


class URLValidationError(ScrapingError):
    pass


class BotProtectionError(ScrapingError):
    pass
