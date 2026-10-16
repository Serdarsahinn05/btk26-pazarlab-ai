"""Cross-cutting HTTP protections: request ids, body size limit, rate limiting, safe errors."""

# No `from __future__ import annotations` here: FastAPI must resolve the
# `Request` annotation on RateLimit.__call__ at runtime.
import logging
import os
import threading
import time
import uuid
from collections import defaultdict, deque

import weakref

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.observability import client_ip_var, log_access, request_id_var

logger = logging.getLogger("security")

MAX_BODY_BYTES = int(os.getenv("MAX_BODY_BYTES", str(10 * 1024 * 1024)))


def install(app: FastAPI) -> None:
    @app.middleware("http")
    async def request_guard(request: Request, call_next):
        request_id = uuid.uuid4().hex[:12]
        request.state.request_id = request_id
        request_id_var.set(request_id)
        client_ip_var.set(request.client.host if request.client else "unknown")
        started = time.perf_counter()
        method, path = request.method, request.url.path

        if method in {"POST", "PUT", "PATCH"}:
            length = request.headers.get("content-length")
            if length is None:
                log_access(method, path, 411, started)
                return _error(411, "Content-Length gerekli.", request_id)
            if not length.isdigit() or int(length) > MAX_BODY_BYTES:
                log_access(method, path, 413, started)
                return _error(413, "İstek gövdesi çok büyük.", request_id)

        try:
            response = await call_next(request)
        except Exception:
            log_access(method, path, 500, started)
            raise
        response.headers["X-Request-ID"] = request_id
        # For SSE this is time to first byte, not the length of the stream.
        log_access(method, path, response.status_code, started)
        return response

    @app.exception_handler(RequestValidationError)
    async def invalid_request(request: Request, exc: RequestValidationError):
        # Never echo the submitted input back: it can be huge (base64 images)
        # or not JSON-serialisable at all (inf/nan).
        errors = [
            {"loc": list(err.get("loc", [])), "msg": err.get("msg", ""), "type": err.get("type", "")}
            for err in exc.errors()
        ]
        request_id = getattr(request.state, "request_id", "-")
        return JSONResponse(
            status_code=422,
            content={"detail": errors, "requestId": request_id},
            headers={"X-Request-ID": request_id},
        )

    @app.exception_handler(Exception)
    async def unhandled(request: Request, exc: Exception):
        request_id = getattr(request.state, "request_id", "-")
        logger.exception("Unhandled error [%s] %s %s", request_id, request.method, request.url.path)
        return _error(500, "Beklenmeyen bir hata oluştu.", request_id)


def _error(status: int, detail: str, request_id: str) -> JSONResponse:
    return JSONResponse(
        status_code=status,
        content={"detail": detail, "requestId": request_id},
        headers={"X-Request-ID": request_id},
    )


class RateLimit:
    """In-memory sliding-window limit per client IP, used as a FastAPI dependency.

    Good enough for a single-process deployment; use a shared store (Redis)
    if the API is ever scaled to several workers.
    """

    _instances: "weakref.WeakSet[RateLimit]" = weakref.WeakSet()

    def __init__(self, env_name: str, default_per_minute: int):
        self.limit = int(os.getenv(env_name, str(default_per_minute)))
        self.window = 60.0
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()
        RateLimit._instances.add(self)

    @classmethod
    def reset_all(cls) -> None:
        for limiter in list(cls._instances):
            with limiter._lock:
                limiter._hits.clear()

    def __call__(self, request: Request) -> None:
        if self.limit <= 0:
            return
        client = request.client.host if request.client else "unknown"
        now = time.monotonic()
        with self._lock:
            hits = self._hits[client]
            while hits and now - hits[0] > self.window:
                hits.popleft()
            if len(hits) >= self.limit:
                retry_after = int(self.window - (now - hits[0])) + 1
                raise HTTPException(
                    status_code=429,
                    detail="Çok fazla istek. Lütfen biraz sonra tekrar deneyin.",
                    headers={"Retry-After": str(retry_after)},
                )
            hits.append(now)
