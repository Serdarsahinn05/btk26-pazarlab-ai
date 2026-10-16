"""Logging setup: request ids on every log line, optional JSON output, one access line per request."""

import contextvars
import json
import logging
import os
import time

# Set by the request middleware (app/security.py). Starlette copies the context into the
# threadpool, so logs from sync handlers and LLM calls carry the id of their request.
request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")

access_logger = logging.getLogger("access")

_RESERVED = set(vars(logging.makeLogRecord({}))) | {"message", "asctime", "request_id"}


_base_factory = logging.getLogRecordFactory()


def _record_with_request_id(*args, **kwargs) -> logging.LogRecord:
    # Attached when the record is created, so every handler (and pytest's caplog) sees it.
    record = _base_factory(*args, **kwargs)
    record.request_id = request_id_var.get()
    return record


logging.setLogRecordFactory(_record_with_request_id)


class JsonFormatter(logging.Formatter):
    """One JSON object per line; `extra={...}` fields are included as top-level keys."""

    def format(self, record: logging.LogRecord) -> str:
        entry = {
            "ts": self.formatTime(record, "%Y-%m-%dT%H:%M:%S") + f".{int(record.msecs):03d}",
            "level": record.levelname,
            "logger": record.name,
            "requestId": getattr(record, "request_id", "-"),
            "message": record.getMessage(),
        }
        entry.update({k: v for k, v in vars(record).items() if k not in _RESERVED})
        if record.exc_info:
            entry["exc"] = self.formatException(record.exc_info)
        return json.dumps(entry, ensure_ascii=False, default=str)


def configure_logging() -> None:
    """LOG_LEVEL (default INFO) and LOG_FORMAT=text|json (default text)."""
    handler = logging.StreamHandler()
    if os.getenv("LOG_FORMAT", "text").strip().lower() == "json":
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(logging.Formatter("%(asctime)s | %(levelname)-8s | %(name)s | [%(request_id)s] %(message)s"))
    root = logging.getLogger()
    root.handlers[:] = [handler]
    root.setLevel(os.getenv("LOG_LEVEL", "INFO").upper())


def log_access(method: str, path: str, status: int, started: float) -> None:
    # Path only: query strings are never logged.
    duration_ms = round((time.perf_counter() - started) * 1000)
    # The Docker healthcheck polls every 30 s; successful checks only show at DEBUG.
    level = logging.DEBUG if path == "/api/health" and status == 200 else logging.INFO
    access_logger.log(
        level, "%s %s %s %dms", method, path, status, duration_ms,
        extra={"method": method, "path": path, "status": status, "durationMs": duration_ms},
    )
