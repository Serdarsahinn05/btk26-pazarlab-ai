"""Stores finished simulations so a result can be reopened or shared by link.

Plain sqlite3 (stdlib). Ids are 12-char random tokens, so results are only
reachable by someone who has the link; there is intentionally no listing API.
Base64 images are dropped before saving to keep rows small and avoid storing
user uploads; image URLs are kept.
"""

import json
import os
import secrets
import sqlite3
import threading
import time
from pathlib import Path
from typing import Any, Optional

from app.models.simulation import SimulationResponse

_DEFAULT_PATH = Path(__file__).resolve().parents[2] / "data" / "pazarlab.db"
MAX_ROWS = int(os.getenv("HISTORY_MAX_ROWS", "5000"))
RETENTION_DAYS = int(os.getenv("HISTORY_RETENTION_DAYS", "90"))
ID_ALPHABET = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
ID_LENGTH = 12

_lock = threading.Lock()


def _db_path() -> Path:
    return Path(os.getenv("HISTORY_DB_PATH", str(_DEFAULT_PATH)))


def _connect() -> sqlite3.Connection:
    path = _db_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, timeout=5)
    conn.execute(
        """CREATE TABLE IF NOT EXISTS simulations (
               id TEXT PRIMARY KEY,
               created_at REAL NOT NULL,
               product_name TEXT NOT NULL,
               category TEXT NOT NULL,
               overall_score INTEGER NOT NULL,
               response_json TEXT NOT NULL
           )"""
    )
    return conn


def is_valid_id(value: str) -> bool:
    return len(value) == ID_LENGTH and all(ch in ID_ALPHABET for ch in value)


def _strip_data_urls(images: list[str]) -> list[str]:
    return [img for img in images if not img.startswith("data:")]


def save(product_name: str, category: str, response: SimulationResponse) -> str:
    """Persist a result and return its share id. Also prunes old/excess rows."""
    sim_id = "".join(secrets.choice(ID_ALPHABET) for _ in range(ID_LENGTH))
    stored = response.model_copy(update={"images": _strip_data_urls(response.images), "simulation_id": sim_id})
    payload = stored.model_dump_json(by_alias=True)
    now = time.time()
    with _lock, _connect() as conn:
        conn.execute(
            "INSERT INTO simulations (id, created_at, product_name, category, overall_score, response_json) VALUES (?, ?, ?, ?, ?, ?)",
            (sim_id, now, product_name[:120], category, response.overall_score, payload),
        )
        conn.execute("DELETE FROM simulations WHERE created_at < ?", (now - RETENTION_DAYS * 86400,))
        conn.execute(
            "DELETE FROM simulations WHERE id NOT IN (SELECT id FROM simulations ORDER BY created_at DESC LIMIT ?)",
            (MAX_ROWS,),
        )
    return sim_id


def get(sim_id: str) -> Optional[dict[str, Any]]:
    if not is_valid_id(sim_id):
        return None
    with _lock, _connect() as conn:
        row = conn.execute(
            "SELECT id, created_at, product_name, category, response_json FROM simulations WHERE id = ?", (sim_id,)
        ).fetchone()
    if row is None:
        return None
    return {
        "id": row[0],
        "createdAt": row[1],
        "productName": row[2],
        "category": row[3],
        "response": json.loads(row[4]),
    }
