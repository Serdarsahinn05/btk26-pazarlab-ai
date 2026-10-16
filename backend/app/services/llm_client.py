"""Single Gemini client for every AI call in the backend.

- Model: ``GEMINI_MODEL`` if set, otherwise the best text model the key can use,
  discovered from the API and cached for 5 minutes.
- Every call has a timeout, an output-token cap and tries at most
  ``MAX_MODELS_PER_CALL`` models; failures are logged, never swallowed silently.
- Instructions go in ``systemInstruction``; user and third-party data is sent
  separately inside a ``<data>`` block (see prompt_safety).
"""

import json
import logging
import os
import re
import threading
import time
import urllib.error
import urllib.request
from typing import Any, Optional

from app.services.prompt_safety import UNTRUSTED_DATA_RULE, wrap_data

logger = logging.getLogger("llm_client")

API_BASE = "https://generativelanguage.googleapis.com/v1beta"
# Newest models often answer 503 under load; a third candidate keeps calls succeeding.
MAX_MODELS_PER_CALL = 3
TIMEOUT_SECONDS = 30
# Thinking models spend part of this budget on reasoning; 2048 truncated the insights JSON.
MAX_OUTPUT_TOKENS = 8192
MODEL_CACHE_SECONDS = 300
# Families that are text-capable but not what we want for structured analysis.
_SKIP_MARKERS = ("tts", "image", "audio", "embedding", "vision", "robotics", "computer-use", "live", "gemma", "learnlm")


class LLMUnavailable(RuntimeError):
    """No key, no usable model, or every attempted model failed."""


def _api_key() -> str:
    return os.getenv("GEMINI_API_KEY", "").strip()


def is_configured() -> bool:
    return bool(_api_key())


def _model_rank(name: str) -> tuple:
    """Lower sorts first: stable before preview, flash before lite before pro, newer first."""
    version = re.search(r"gemini-(\d+(?:\.\d+)?)", name)
    newest_first = -float(version.group(1)) if version else 0.0
    preview = 1 if ("preview" in name or "exp" in name) else 0
    if "flash" in name and "lite" not in name:
        tier = 0
    elif "flash-lite" in name:
        tier = 1
    elif "pro" in name:
        tier = 2
    else:
        tier = 3
    return (preview, tier, newest_first, name)


class _ModelPool:
    def __init__(self) -> None:
        self._models: list[str] = []
        self._fetched_at = 0.0
        self._cooldown: dict[str, float] = {}
        self._lock = threading.Lock()

    def _discover(self) -> list[str]:
        req = urllib.request.Request(f"{API_BASE}/models?pageSize=200", headers={"x-goog-api-key": _api_key()})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        names = []
        for model in data.get("models", []):
            name = model.get("name", "").split("/")[-1]
            if "generateContent" not in model.get("supportedGenerationMethods", []):
                continue
            if not name.startswith("gemini") or any(m in name for m in _SKIP_MARKERS):
                continue
            names.append(name)
        return sorted(set(names), key=_model_rank)

    def candidates(self) -> list[str]:
        configured = os.getenv("GEMINI_MODEL", "").strip()
        with self._lock:
            now = time.time()
            if not self._models or now - self._fetched_at > MODEL_CACHE_SECONDS:
                try:
                    self._models = self._discover()
                    self._fetched_at = now
                    logger.info("Gemini models available: %s", self._models[:6])
                except Exception as exc:  # network/key problems: fall back to the configured model only
                    logger.warning("Gemini model discovery failed: %r", exc)
            ordered = ([configured] if configured else []) + [m for m in self._models if m != configured]
            usable = [m for m in ordered if self._cooldown.get(m, 0) < now]
        return usable[:MAX_MODELS_PER_CALL]

    def cool_down(self, model: str, seconds: float) -> None:
        with self._lock:
            self._cooldown[model] = time.time() + seconds

    def cached_model(self) -> Optional[str]:
        """Best known model without any network call (may be None before the first AI request)."""
        configured = os.getenv("GEMINI_MODEL", "").strip()
        if configured:
            return configured
        now = time.time()
        with self._lock:
            return next((m for m in self._models if self._cooldown.get(m, 0) < now), None)


_pool = _ModelPool()


def status() -> dict[str, Any]:
    """AI status for /api/health. Never touches the network so health checks stay fast."""
    return {"configured": is_configured(), "model": _pool.cached_model() if is_configured() else None}


def _extract_text(response: dict) -> str:
    parts = (((response.get("candidates") or [{}])[0].get("content") or {}).get("parts")) or []
    return "".join(str(p.get("text", "")) for p in parts if isinstance(p, dict)).strip()


def _generate(instructions: str, data: Any, *, temperature: float, json_mode: bool, max_tokens: int, timeout: float) -> str:
    if not is_configured():
        raise LLMUnavailable("GEMINI_API_KEY is not set")

    models = _pool.candidates()
    if not models:
        raise LLMUnavailable("no usable Gemini model")

    generation_config: dict[str, Any] = {"temperature": temperature, "maxOutputTokens": max_tokens}
    if json_mode:
        generation_config["responseMimeType"] = "application/json"
    body = json.dumps({
        "systemInstruction": {"parts": [{"text": instructions + UNTRUSTED_DATA_RULE}]},
        "contents": [{"role": "user", "parts": [{"text": wrap_data(data)}]}],
        "generationConfig": generation_config,
    }).encode("utf-8")

    last_error: Optional[Exception] = None
    for model in models:
        req = urllib.request.Request(
            f"{API_BASE}/models/{model}:generateContent",
            data=body,
            headers={"Content-Type": "application/json", "x-goog-api-key": _api_key()},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                text = _extract_text(json.loads(resp.read().decode("utf-8")))
            if not text:
                raise ValueError("empty response")
            return text
        except urllib.error.HTTPError as exc:
            last_error = exc
            if exc.code == 429 or exc.code >= 500:  # quota or overloaded: let the next call use another model
                _pool.cool_down(model, 120)
            elif exc.code == 404:
                _pool.cool_down(model, 3600)
            logger.warning("Gemini %s failed with HTTP %s", model, exc.code)
            if exc.code in (400, 401, 403):  # bad request or bad key: other models will fail the same way
                break
        except TimeoutError as exc:
            # A slow answer is not a model problem; trying more models would only multiply the wait.
            last_error = exc
            logger.warning("Gemini %s timed out after %ss", model, timeout)
            break
        except Exception as exc:
            last_error = exc
            logger.warning("Gemini %s failed: %r", model, exc)

    raise LLMUnavailable(f"all Gemini models failed: {last_error!r}")


def generate_text(
    instructions: str, data: Any, *, temperature: float = 0.4, max_tokens: int = MAX_OUTPUT_TOKENS, timeout: float = TIMEOUT_SECONDS
) -> str:
    return _generate(instructions, data, temperature=temperature, json_mode=False, max_tokens=max_tokens, timeout=timeout)


def generate_json(
    instructions: str, data: Any, *, temperature: float = 0.4, max_tokens: int = MAX_OUTPUT_TOKENS, timeout: float = TIMEOUT_SECONDS
) -> Any:
    text = _generate(instructions, data, temperature=temperature, json_mode=True, max_tokens=max_tokens, timeout=timeout)
    text = text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        logger.warning("Gemini returned invalid/truncated JSON (%d chars): %s", len(text), exc)
        raise
