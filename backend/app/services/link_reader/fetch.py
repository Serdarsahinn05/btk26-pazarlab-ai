"""Fetching a product page safely (public addresses only)."""

from __future__ import annotations

import logging
import time
from typing import Any, List, Tuple

import requests

from app.services.safe_http import UnsafeURLError, get_following_redirects

try:
    import cloudscraper
except ImportError:
    cloudscraper = None

from app.services.link_reader.models import (
    FETCH_FAILED_MESSAGE,
    PUBLIC_URL_ERROR,
    BotProtectionError,
    ScraperConfig,
    ScrapingError,
    URLValidationError,
)

logger = logging.getLogger("product_scraper")


class HTTPFetcher:
    """Fetches a product page: cloudscraper first, plain requests as fallback.

    All traffic goes through ``safe_http`` (public IPs only, ports 80/443,
    re-validated redirects). Errors are logged in detail but surfaced to the
    caller only as a generic message, so the endpoint cannot be used to probe
    internal hosts or ports.
    """

    def __init__(self, config: ScraperConfig):
        self.config = config

    def fetch(self, url: str) -> Tuple[str, str, List[str]]:
        deadline = time.monotonic() + self.config.total_fetch_budget
        attempts = []
        if cloudscraper:
            attempts.append(("cloudscraper", cloudscraper.create_scraper, self.config.user_agent_bot))
        attempts.append(("requests", requests.Session, self.config.user_agent_browser))

        blocked = False
        for source, make_session, user_agent in attempts:
            remaining = deadline - time.monotonic()
            if remaining <= 1:
                break
            try:
                return self._get(make_session(), url, user_agent, min(remaining, self.config.request_timeout)), source, []
            except BotProtectionError:
                blocked = True
            except UnsafeURLError as exc:
                logger.warning("Blocked unsafe fetch target: %s", exc)
                raise URLValidationError(PUBLIC_URL_ERROR) from exc
            except Exception as exc:
                logger.warning("%s fetch failed: %r", source, exc)

        if blocked:
            raise BotProtectionError("Site bot korumasi nedeniyle sayfayi paylasmadi.")
        raise ScrapingError(FETCH_FAILED_MESSAGE)

    def _get(self, session: Any, url: str, user_agent: str, timeout: float) -> str:
        headers = {
            "User-Agent": user_agent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
        }
        with session:
            response = get_following_redirects(session, url, timeout=timeout, headers=headers)
        if response.status_code == 403:
            raise BotProtectionError("403")
        response.raise_for_status()
        return response.text[: self.config.max_html_bytes]
