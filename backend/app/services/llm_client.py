"""Single Gemini client for every AI call in the backend.

- Model: ``GEMINI_MODEL`` if set, otherwise the best text model the key can use,
  discovered from the API and cached for 5 minutes.
- Every call has a timeout, an output-token cap and tries at most
  ``MAX_MODELS_PER_CALL`` models; failures are logged, never swallowed silently.
- Instructions go in ``systemInstruction``; user and third-party data is sent
  separately inside a ``<data>`` block (see prompt_safety).
- Budget (Faz 10a): identical one-shot calls are answered from a TTL cache, and each
  client IP gets a daily number of real model calls. Cache hits cost no quota.
"""

import contextlib
import contextvars
import copy
import hashlib
import json
import logging
import os
import re
import threading
import time
import urllib.error
import urllib.request
from collections import OrderedDict
from typing import Any, Callable, Iterator, Optional

from app.observability import client_ip_var
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


class AIQuotaExceeded(LLMUnavailable):
    """This client used up today's AI calls; callers fall back to rule-based output like any other outage."""


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except ValueError:
        return default


class _TTLCache:
    """Small in-process LRU with expiry. Single worker, so no shared store is needed (see deployment.md)."""

    def __init__(self) -> None:
        self._items: "OrderedDict[str, tuple[float, Any]]" = OrderedDict()
        self._lock = threading.Lock()
        self.hits = 0
        self.misses = 0

    def get(self, key: str) -> Any:
        ttl = _env_int("AI_CACHE_TTL_SECONDS", 6 * 3600)
        with self._lock:
            item = self._items.get(key)
            if item is None or ttl <= 0 or time.time() - item[0] > ttl:
                self._items.pop(key, None)
                self.misses += 1
                return None
            self._items.move_to_end(key)
            self.hits += 1
            # Callers may mutate parsed JSON; never hand out the cached object itself.
            return copy.deepcopy(item[1])

    def put(self, key: str, value: Any) -> None:
        if _env_int("AI_CACHE_TTL_SECONDS", 6 * 3600) <= 0:
            return
        limit = max(_env_int("AI_CACHE_MAX_ENTRIES", 500), 1)
        with self._lock:
            self._items[key] = (time.time(), copy.deepcopy(value))
            self._items.move_to_end(key)
            while len(self._items) > limit:
                self._items.popitem(last=False)

    def stats(self) -> dict[str, int]:
        with self._lock:
            return {"entries": len(self._items), "hits": self.hits, "misses": self.misses}

    def clear(self) -> None:
        with self._lock:
            self._items.clear()
            self.hits = self.misses = 0


class _DailyQuota:
    """Real model calls per client IP per day (Turkey time). AI_DAILY_CALLS_PER_IP=0 turns it off."""

    def __init__(self) -> None:
        self._day = ""
        self._used: dict[str, int] = {}
        self._lock = threading.Lock()

    @staticmethod
    def limit() -> int:
        return _env_int("AI_DAILY_CALLS_PER_IP", 60)

    @staticmethod
    def _today() -> str:
        return time.strftime("%Y-%m-%d", time.gmtime(time.time() + 3 * 3600))  # Europe/Istanbul, no DST

    def consume(self) -> None:
        limit, ip = self.limit(), client_ip_var.get()
        if limit <= 0 or not ip:  # off, or not inside an HTTP request (scripts, tests of internals)
            return
        with self._lock:
            today = self._today()
            if today != self._day:  # new day: forget yesterday, which also bounds memory
                self._day, self._used = today, {}
            if self._used.get(ip, 0) >= limit:
                raise AIQuotaExceeded(f"daily AI quota of {limit} calls reached")
            self._used[ip] = self._used.get(ip, 0) + 1

    def clear(self) -> None:
        with self._lock:
            self._day, self._used = "", {}


_cache = _TTLCache()
_quota = _DailyQuota()


def _api_key() -> str:
    return os.getenv("GEMINI_API_KEY", "").strip()


# Set by callers that must not spend server-side AI, e.g. MCP tools where the user's own Claude does the reasoning.
_ai_disabled: contextvars.ContextVar[bool] = contextvars.ContextVar("ai_disabled", default=False)


@contextlib.contextmanager
def without_ai() -> Iterator[None]:
    """Inside this block every AI call behaves as if no key were set, so all rule-based fallbacks apply."""
    token = _ai_disabled.set(True)
    try:
        yield
    finally:
        _ai_disabled.reset(token)


def is_configured() -> bool:
    return bool(_api_key()) and not _ai_disabled.get()


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

# Outcome of the most recent AI call, for /api/health (in-memory, per process).
_last = {"okAt": None, "errorAt": None, "error": None}
_last_lock = threading.Lock()


def _note(error: Optional[Exception] = None) -> None:
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    with _last_lock:
        if error is None:
            _last["okAt"] = now
        else:
            _last["errorAt"] = now
            # Type and HTTP status only: never the message body, which may echo request data.
            code = getattr(error, "code", None)
            _last["error"] = f"HTTP {code}" if code else type(error).__name__


def status() -> dict[str, Any]:
    """AI status for /api/health. Never touches the network so health checks stay fast."""
    with _last_lock:
        last = dict(_last)
    return {
        "configured": is_configured(),
        "model": _pool.cached_model() if is_configured() else None,
        "lastSuccessAt": last["okAt"],
        "lastErrorAt": last["errorAt"],
        "lastError": last["error"],
        "cache": _cache.stats(),
        "dailyCallsPerIp": _quota.limit(),
    }


def _extract_text(response: dict, strip: bool = True) -> str:
    parts = (((response.get("candidates") or [{}])[0].get("content") or {}).get("parts")) or []
    text = "".join(str(p.get("text", "")) for p in parts if isinstance(p, dict) and not p.get("thought"))
    # Streamed chunks keep their edge whitespace, otherwise words at chunk borders glue together.
    return text.strip() if strip else text


def _generate(
    instructions: str, data: Any, *, temperature: float, json_mode: bool, max_tokens: int, timeout: float,
    images: tuple[tuple[str, str], ...] = (),
) -> str:
    if not is_configured():
        raise LLMUnavailable("GEMINI_API_KEY is not set")

    models = _pool.candidates()
    if not models:
        raise LLMUnavailable("no usable Gemini model")
    _quota.consume()

    generation_config: dict[str, Any] = {"temperature": temperature, "maxOutputTokens": max_tokens}
    if json_mode:
        generation_config["responseMimeType"] = "application/json"
    body = json.dumps({
        "systemInstruction": {"parts": [{"text": instructions + UNTRUSTED_DATA_RULE}]},
        # images: (mime type, base64) pairs sent as inline parts after the text (Faz 16 image analysis).
        "contents": [{"role": "user", "parts": [{"text": wrap_data(data)}]
                      + [{"inline_data": {"mime_type": mime, "data": b64}} for mime, b64 in images]}],
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
            _note()
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

    _note(last_error or LLMUnavailable("no model"))
    raise LLMUnavailable(f"all Gemini models failed: {last_error!r}")


def stream_chat(
    instructions: str,
    turns: list[dict[str, str]],
    *,
    temperature: float = 0.7,
    max_tokens: int = 1024,
    timeout: float = TIMEOUT_SECONDS,
) -> Iterator[str]:
    """Stream a multi-turn chat answer as text chunks (Gemini SSE).

    ``turns`` are ``{"role": "user" | "model", "text": ...}``; the system prompt
    carries the persona and product data. Only the first usable model is tried
    once streaming has started, so partial answers are never mixed.
    """
    if not is_configured():
        raise LLMUnavailable("GEMINI_API_KEY is not set")
    models = _pool.candidates()
    if not models:
        raise LLMUnavailable("no usable Gemini model")
    # Chats are never cached (each turn is new), but they do count against the daily quota.
    _quota.consume()

    body = json.dumps({
        "systemInstruction": {"parts": [{"text": instructions + UNTRUSTED_DATA_RULE}]},
        "contents": [{"role": t["role"], "parts": [{"text": t["text"]}]} for t in turns],
        "generationConfig": {"temperature": temperature, "maxOutputTokens": max_tokens},
    }).encode("utf-8")

    last_error: Optional[Exception] = None
    for model in models:
        req = urllib.request.Request(
            f"{API_BASE}/models/{model}:streamGenerateContent?alt=sse",
            data=body,
            headers={"Content-Type": "application/json", "x-goog-api-key": _api_key()},
            method="POST",
        )
        try:
            resp = urllib.request.urlopen(req, timeout=timeout)
        except urllib.error.HTTPError as exc:
            last_error = exc
            if exc.code == 429 or exc.code >= 500:
                _pool.cool_down(model, 120)
                logger.warning("Gemini %s stream failed with HTTP %s", model, exc.code)
                continue
            _note(exc)
            raise LLMUnavailable(f"Gemini HTTP {exc.code}") from exc
        except Exception as exc:
            last_error = exc
            logger.warning("Gemini %s stream failed: %r", model, exc)
            break

        with resp:
            for raw in resp:
                line = raw.decode("utf-8").strip()
                if not line.startswith("data:"):
                    continue
                try:
                    chunk = _extract_text(json.loads(line[5:].strip()), strip=False)
                except json.JSONDecodeError:
                    continue
                if chunk:
                    yield chunk
        _note()
        return

    _note(last_error or LLMUnavailable("no model"))
    raise LLMUnavailable(f"all Gemini models failed: {last_error!r}")


def _cached(kind: str, instructions: str, data: Any, temperature: float, max_tokens: int, produce: Callable[[], Any]) -> Any:
    """Same prompt + data + settings → same answer for AI_CACHE_TTL_SECONDS. Only successful results are stored."""
    if not is_configured():  # checked before the cache, so `without_ai()` never returns an earlier AI answer
        raise LLMUnavailable("AI disabled or GEMINI_API_KEY not set")
    material = json.dumps([kind, instructions, data, temperature, max_tokens], ensure_ascii=False, sort_keys=True, default=str)
    key = hashlib.sha256(material.encode("utf-8")).hexdigest()
    hit = _cache.get(key)
    if hit is not None:
        return hit
    value = produce()
    _cache.put(key, value)
    return value


def generate_text(
    instructions: str, data: Any, *, temperature: float = 0.4, max_tokens: int = MAX_OUTPUT_TOKENS, timeout: float = TIMEOUT_SECONDS
) -> str:
    return _cached("text", instructions, data, temperature, max_tokens, lambda: _generate(
        instructions, data, temperature=temperature, json_mode=False, max_tokens=max_tokens, timeout=timeout
    ))


def generate_json(
    instructions: str, data: Any, *, temperature: float = 0.4, max_tokens: int = MAX_OUTPUT_TOKENS, timeout: float = TIMEOUT_SECONDS,
    images: tuple[tuple[str, str], ...] = (),
) -> Any:
    def produce() -> Any:
        text = _generate(instructions, data, temperature=temperature, json_mode=True, max_tokens=max_tokens, timeout=timeout, images=images)
        text = text.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        try:
            return json.loads(text)
        except json.JSONDecodeError as exc:
            logger.warning("Gemini returned invalid/truncated JSON (%d chars): %s", len(text), exc)
            raise

    # Parsed before caching, so a truncated answer is retried next time instead of repeated.
    # Images join the cache key as a digest, not as megabytes of base64.
    keyed = [data, hashlib.sha256("".join(b64 for _, b64 in images).encode()).hexdigest()] if images else data
    return _cached("json", instructions, keyed, temperature, max_tokens, produce)
