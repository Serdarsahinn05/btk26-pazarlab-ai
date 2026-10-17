"""AI look at the product photos (Faz 16): what a buyer sees first, and what to fix. Optional; needs Gemini.

Uploaded photos arrive as data URLs; photos from a product link are fetched through safe_http (public hosts only).
"""

from __future__ import annotations

import base64
import binascii
import logging
import re
from typing import Any, Optional

import requests

from app.services import llm_client
from app.services.labels import category_label
from app.services.safe_http import UnsafeURLError, get_following_redirects

logger = logging.getLogger("image_analysis")

MAX_IMAGES = 4
MAX_IMAGE_BYTES = 1_500_000
MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
_DATA_URL = re.compile(r"^data:(image/[a-z+]+);base64,(.+)$", re.DOTALL)

PROMPT = """Sen bir e-ticaret görsel editörüsün. Türkiye'deki pazar yerlerinde satılan bir ürünün fotoğraflarına bakıyorsun.
Alıcının ilk bakışta gördüğünü değerlendir: ürün net mi, arka plan sade mi, ışık ve renk doğru mu, ölçü/kullanım fikri veriyor mu,
farklı açılar var mı, metin/filigran/kolaj kalabalığı var mı. Yalnızca görselde gördüğüne dayan; uydurma.
Sadece şu JSON'u döndür (Türkçe, Türkçe karakterlerle):
{"score": 0-100 arası tam sayı, "strengths": ["en fazla 3 kısa madde"], "issues": ["en fazla 3 kısa madde"],
 "suggestions": ["en fazla 3 uygulanabilir öneri"], "missingShots": ["eksik çekim türleri, ör. arka yüz, yakın plan, kullanım anı; en fazla 3"]}"""


def _decode(ref: str) -> Optional[tuple[str, str]]:
    """(mime type, base64) for a data URL or a public http(s) image; None if unusable."""
    match = _DATA_URL.match(ref.strip())
    if match:
        mime, b64 = match.group(1), re.sub(r"\s", "", match.group(2))
        try:
            size = len(base64.b64decode(b64, validate=True))
        except (binascii.Error, ValueError):
            return None
        return (mime, b64) if mime in MIME_TYPES and size <= MAX_IMAGE_BYTES else None
    if ref.startswith(("http://", "https://")):
        try:
            with requests.Session() as session:
                response = get_following_redirects(session, ref, timeout=8)
            mime = response.headers.get("Content-Type", "").split(";")[0].strip().lower()
            if response.status_code != 200 or mime not in MIME_TYPES or len(response.content) > MAX_IMAGE_BYTES:
                return None
            return mime, base64.b64encode(response.content).decode("ascii")
        except (UnsafeURLError, requests.RequestException) as exc:
            logger.info("Image not fetched: %r", exc)
            return None
    return None


def _clean_list(value: Any) -> list[str]:
    return [str(item).strip()[:200] for item in value if str(item).strip()][:3] if isinstance(value, list) else []


def analyze_images(images: list[str], category: str, product_name: str) -> Optional[dict[str, Any]]:
    """Score and notes for up to 4 photos; None when no photo is usable. Raises LLMUnavailable without AI."""
    parts = tuple(p for p in (_decode(ref) for ref in images[:MAX_IMAGES]) if p)
    if not parts:
        return None
    result = llm_client.generate_json(
        PROMPT, {"urun": product_name[:120], "kategori": category_label(category), "gorselSayisi": len(parts)},
        temperature=0.2, images=parts,
    )
    if not isinstance(result, dict):
        raise ValueError("image analysis is not a JSON object")
    try:
        score = max(0, min(100, int(result.get("score", 0))))
    except (TypeError, ValueError):
        score = 0
    return {
        "score": score,
        "strengths": _clean_list(result.get("strengths")),
        "issues": _clean_list(result.get("issues")),
        "suggestions": _clean_list(result.get("suggestions")),
        "missingShots": _clean_list(result.get("missingShots")),
        "imagesUsed": len(parts),
    }
