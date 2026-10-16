import pytest

from app.services import history_store

# HISTORY_DB_PATH points at a temp file for every test (see conftest.py).

def test_simulate_saves_and_result_can_be_reopened(client, payload):
    payload["images"] = ["https://cdn.example.com/a.jpg", "data:image/jpeg;base64,AAAA"]
    sim = client.post("/api/simulate", json=payload).json()
    sim_id = sim["simulationId"]
    assert history_store.is_valid_id(sim_id)

    stored = client.get(f"/api/simulations/{sim_id}").json()
    assert stored["productName"] == payload["productName"]
    assert stored["response"]["overallScore"] == sim["overallScore"]
    assert stored["response"]["simulationId"] == sim_id
    # uploads are not persisted, plain URLs are
    assert stored["response"]["images"] == ["https://cdn.example.com/a.jpg"]


@pytest.mark.parametrize("bad_id", ["doesnotexist", "../../etc/passwd", "a" * 12, "x"])
def test_unknown_or_malformed_ids_return_404(client, bad_id):
    assert client.get(f"/api/simulations/{bad_id}").status_code == 404


def test_history_failure_does_not_break_simulation(client, payload, monkeypatch):
    def broken(*args, **kwargs):
        raise OSError("disk full")

    monkeypatch.setattr(history_store, "save", broken)
    res = client.post("/api/simulate", json=payload)
    assert res.status_code == 200
    assert res.json()["simulationId"] is None


def test_retention_keeps_newest_rows(client, payload, monkeypatch):
    monkeypatch.setattr(history_store, "MAX_ROWS", 2)
    ids = [client.post("/api/simulate", json=payload).json()["simulationId"] for _ in range(3)]
    assert client.get(f"/api/simulations/{ids[0]}").status_code == 404
    assert client.get(f"/api/simulations/{ids[2]}").status_code == 200


def test_history_can_be_disabled(client, payload, monkeypatch):
    monkeypatch.setenv("HISTORY_ENABLED", "false")
    assert client.post("/api/simulate", json=payload).json()["simulationId"] is None
