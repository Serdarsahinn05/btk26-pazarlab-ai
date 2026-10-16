"""Faz 10b: persona chat answers from simulation data when the AI is down or the quota is used up."""

import pytest

from app.services import llm_client
from app.services.persona_offline import rule_based_reply, topic_of
from tests.test_stream import parse_sse


@pytest.fixture
def stored_id(client, payload):
    return client.post("/api/simulate", json=payload).json()["simulationId"]


def _chat(client, stored_id, text, persona="Trend Takipcisi"):
    res = client.post("/api/persona-chat", json={"simulationId": stored_id, "persona": persona, "messages": [{"role": "user", "text": text}]})
    assert res.status_code == 200
    events = parse_sse(res.text)
    answer = "".join(data["text"] for kind, data in events if kind == "delta")
    return answer, events[-1]


def test_no_ai_gives_a_rule_based_answer(client, stored_id, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "")
    answer, (kind, data) = _chat(client, stored_id, "Neden almadın?")
    assert kind == "done" and data == {"ruleBased": True, "reason": "unavailable"}
    assert "alma ihtimalim %" in answer and answer.strip().endswith(".")


def test_quota_is_reported_as_the_reason(client, stored_id, monkeypatch):
    def over_quota(*args, **kwargs):
        raise llm_client.AIQuotaExceeded("daily AI quota")
        yield  # pragma: no cover - makes this a generator like the real one

    monkeypatch.setattr(llm_client, "stream_chat", over_quota)
    _, (kind, data) = _chat(client, stored_id, "Fiyat ne olsa alırdın?")
    assert kind == "done" and data["reason"] == "quota"


def test_half_written_ai_answer_is_not_completed_with_a_template(client, stored_id, monkeypatch):
    def breaks_midway(*args, **kwargs):
        yield "Bence "
        raise llm_client.LLMUnavailable("connection dropped")

    monkeypatch.setattr(llm_client, "stream_chat", breaks_midway)
    answer, (kind, _) = _chat(client, stored_id, "Ne düşünüyorsun?")
    assert answer == "Bence " and kind == "error"


@pytest.mark.parametrize(("question", "topic"), [
    ("Fiyat ne olsa alırdın?", "price"),
    ("300 TL'ye düşersem?", "price"),
    ("Kargo 5 gün sürse olur mu?", "shipping"),
    ("İade yoksa ne yaparsın?", "shipping"),
    ("Garantiye güvenir misin?", "trust"),
    ("Açıklamada neyi eksik buldun?", "listing"),
    ("Seni ikna etmek için ne yapmalıyım?", "advice"),
    ("Neden almadın?", "why"),
    ("Merhaba", "general"),
])
def test_topic_detection(question, topic):
    assert topic_of(question) == topic


PERSONA = {"name": "Fiyat Hassas Alici", "reason": "Fiyat uygunluğu önemli.", "advice": "Fiyat avantajını öne çıkar.",
           "ranges": {"brandTrustNeed": [0.8, 0.9]},
           "personalityTraits": {"biggestFear": "Gereğinden fazla para ödemek.", "values": "Tasarruf ve dayanıklılık."}}


def _response(label="ALMADI"):
    return {"allPersonas": [{"name": "Fiyat Hassas Alici", "purchaseProbability": 0.31, "decisionLabel": label,
                             "reason": "Fiyat hassas kullanıcılar için fiyat riskli algılanıyor.", "advice": "Kupon dene."}],
            "weaknesses": ["Garanti bilgisi eksik."]}


@pytest.mark.parametrize(("price", "feeling"), [(1200, "pahalı"), (450, "uygun"), (120, "ucuz")])
def test_price_answer_compares_with_the_category_average(price, feeling):
    request = {"category": "tisort", "price": price, "commerce": {}}
    reply = rule_based_reply(PERSONA, request, _response(), "Fiyat nasıl?")
    assert feeling in reply and "450 TL" in reply and "almazdım (alma ihtimalim %31)" in reply


def test_answers_use_the_product_data():
    request = {"category": "tisort", "price": 300, "commerce": {"shippingDays": 6, "returnAvailable": False, "warranty": False}}
    assert "İade seçeneği görmüyorum" in rule_based_reply(PERSONA, request, _response(), "Kargo?")
    trust = rule_based_reply(PERSONA, request, _response(), "Garanti var mı?")
    assert "Garanti bilgisi görmedim" in trust and "gereğinden fazla para ödemek" in trust
    assert "garanti bilgisi eksik" in rule_based_reply(PERSONA, request, _response(), "Seni nasıl ikna ederim?")
    assert "Kargo 6 gün sürüyor, bu bana uzun geliyor." in rule_based_reply(PERSONA, request, _response(), "Kargo?")
    assert "tasarruf ve dayanıklılık" in rule_based_reply(PERSONA, request, _response(), "Neden?")


def test_fear_only_for_trust_minded_personas():
    request = {"category": "tisort", "price": 300, "commerce": {"warranty": False}}
    relaxed = {**PERSONA, "ranges": {"brandTrustNeed": [0.3, 0.5]}}
    assert "korkum" not in rule_based_reply(relaxed, request, _response(), "Garanti var mı?")
