import copy
import os
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("GEMINI_API_KEY", "")
os.environ.setdefault("SERPER_API_KEY", "")

VALID_REQUEST = {
    "category": "tisort",
    "purchaseMotivation": "stil_begeni",
    "productName": "Basic Pamuklu Tisort",
    "price": 349.9,
    "description": "Yuzde yuz pamuk, nefes alan kumas, regular kesim, gunluk kullanim icin basic tisort.",
    "targetAudience": {"ageRange": "18-34", "gender": "unisex", "incomeLevel": "middle"},
    "features": {"fabric": "pamuk", "colors": ["siyah", "beyaz"]},
    "commerce": {"shippingDays": 2, "returnAvailable": True, "warranty": False},
    "images": [],
}


@pytest.fixture(autouse=True)
def _temp_history_db(tmp_path, monkeypatch):
    # Every /api/simulate call persists a row; never touch the real database from tests.
    monkeypatch.setenv("HISTORY_DB_PATH", str(tmp_path / "history.db"))


@pytest.fixture(autouse=True)
def _reset_rate_limits():
    from app.security import RateLimit

    RateLimit.reset_all()


@pytest.fixture(autouse=True)
def _reset_ai_budget():
    from app.services import llm_client

    llm_client._cache.clear()
    llm_client._quota.clear()


@pytest.fixture
def payload():
    return copy.deepcopy(VALID_REQUEST)


@pytest.fixture
def client(monkeypatch):
    from fastapi.testclient import TestClient

    from app import main
    from app.api import simulate
    from app.services.simulation_service import run_simulation

    # Deterministic core only: no LLM / Serper calls in tests.
    monkeypatch.setattr(simulate, "run_agentic_simulation", run_simulation)
    return TestClient(main.create_app())
