"""Chat with one town resident shown on a result: their story and own decision, with or without AI."""

import pytest

from app.services import llm_client
from app.services.town_insights import first_person
from tests.test_language import ASCII_TURKISH
from tests.test_stream import parse_sse

THIRD_PERSON = ("buluyor (", "verirdi)", "hoşuna", "onu tatmin", "şüpheleniyor.", "onun gibi", "kendisine hitap", "arkadaşlarının", "aradığı türden")


@pytest.fixture
def stored(client, payload):
    data = client.post("/api/simulate", json=payload).json()
    assert data["representatives"], "a v2 result shows town residents"
    return data


def _chat(client, simulation_id, resident, text="Neden bu kararı verdin?", **extra):
    body = {"simulationId": simulation_id, "resident": resident, "messages": [{"role": "user", "text": text}], **extra}
    res = client.post("/api/persona-chat", json=body)
    if res.status_code != 200:
        return res.status_code, None, None
    events = parse_sse(res.text)
    return 200, "".join(d["text"] for kind, d in events if kind == "delta"), events[-1]


def test_without_ai_the_resident_gives_their_own_reason_in_first_person(client, stored, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "")
    for shown in stored["representatives"]:
        status, answer, (kind, data) = _chat(client, stored["simulationId"], shown["id"])
        assert status == 200 and kind == "done" and data["ruleBased"] is True
        assert answer.startswith(first_person(shown["reason"]).rstrip(".")), (answer, shown["reason"])
        assert f"Alma ihtimalim %{round(shown['buyProbability'] * 100)}" in answer
        assert not any(marker in answer for marker in THIRD_PERSON), answer
        assert not ASCII_TURKISH.search(answer), answer


def test_ai_prompt_carries_the_residents_life_and_decision(client, stored, monkeypatch):
    seen = {}

    def fake_stream(instructions, turns):
        seen["instructions"] = instructions
        yield "Merhaba."

    monkeypatch.setattr(llm_client, "stream_chat", fake_stream)
    shown = stored["representatives"][0]
    status, answer, (kind, _) = _chat(client, stored["simulationId"], shown["id"])
    assert status == 200 and answer == "Merhaba." and kind == "done"
    prompt = seen["instructions"]
    assert shown["name"] in prompt and shown["city"] in prompt and shown["reason"][:30] in prompt
    assert "<data>" in prompt and "uydurma" in prompt


def test_only_residents_shown_on_this_result(client, stored):
    shown = {r["id"] for r in stored["representatives"]}
    other = next(f"r{i:03d}" for i in range(1, 501) if f"r{i:03d}" not in shown)
    assert _chat(client, stored["simulationId"], other)[0] == 404
    assert _chat(client, stored["simulationId"], "r9999")[0] == 422  # not an id
    res = client.post("/api/persona-chat", json={"simulationId": stored["simulationId"], "messages": [{"role": "user", "text": "Selam"}]})
    assert res.status_code == 422  # neither a persona nor a resident


@pytest.mark.parametrize("reason", [
    "Aldı: fiyat bütçesine uygun, en çok kalite hoşuna gidiyor.",
    "Almadı: fiyatı pahalı buluyor (en fazla 149 TL verirdi), ürünün kendisine hitap etmediğini düşünüyor.",
    "Sepete ekledi ama bekliyor: arkadaşlarının aldığını gördü, bu kadar ucuz olmasından şüpheleniyor.",
    "Aldı: ürün tam onun gibi biri için, aradığı türden bir ürün.",
    "Almadı: tasarım onu tatmin etmiyor.",
    "Aldı.",
])
def test_every_explain_phrase_has_a_first_person_form(reason):
    said = first_person(reason)
    assert said != reason and not any(marker in said for marker in THIRD_PERSON), said


def test_a_resident_who_finds_it_dear_names_their_own_limit(client, stored, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "")
    dear = [r for r in stored["representatives"] if "en fazla" in r["reason"]]
    assert dear, "the sample product has residents who find it too dear"
    limit = dear[0]["reason"].split("en fazla ")[1].split(" TL")[0]
    _, answer, _ = _chat(client, stored["simulationId"], dear[0]["id"], text="Fiyat ne olsa alırdın?")
    assert f"bana pahalı; en fazla {limit} TL verirdim" in answer and "uygun görünüyor" not in answer, answer
