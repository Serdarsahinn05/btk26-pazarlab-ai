"""B.10: user-facing Turkish text keeps its letters; ids stay ASCII and stable."""

import json
import re

from app.services.ai_insight_service import _parse_persona_feedback
from app.services.graph import _sanitize_debate_logs
from app.services.normalization_service import load_persona_data
from app.utils.text_utils import fold_text

# ASCII spellings that only appear when Turkish letters were stripped.
# Case-sensitive on purpose: with re.IGNORECASE, Unicode matching treats "ı" like "i" and flags correct text.
ASCII_TURKISH = re.compile(
    r"\b([Ii]cin|[Uu]run\w*|[Aa]ciklama\w*|[Kk]ullanim\w*|[Gg]uven\w*|[Gg]orsel\w*|[Oo]zellik\w*|degil|[Cc]ok|dusuk|yuksek|[Ss]atin|[Oo]lcu\w*|gore|[Kk]isa|hizli)\b"
)

TURKISH_PAYLOAD = {
    "productName": "Basic Pamuklu Tişört",
    "description": "Yüzde yüz pamuk, nefes alan kumaş, regular kesim, günlük kullanıma uygun basic tişört.",
}


def _strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for k, v in value.items():
            if k != "name":  # persona ids are ASCII by design
                yield from _strings(v)
    elif isinstance(value, list):
        for v in value:
            yield from _strings(v)


def test_rule_based_output_has_no_stripped_turkish(client, payload):
    payload.update(TURKISH_PAYLOAD)
    data = client.post("/api/simulate", json=payload).json()
    texts = [
        *_strings(data["aiInsights"]),
        *_strings(data.get("weaknesses", [])),
        *_strings(data["inputAnalysis"].get("warnings", [])),
        *_strings(data["inputAnalysis"].get("suggestions", [])),
        *(p[k] for p in data["allPersonas"] for k in ("reason", "microFeedback", "advice") if p.get(k)),
        *(log["text"] for log in data.get("debateLogs", [])),
    ]
    offenders = sorted({m.group(0) for text in texts for m in ASCII_TURKISH.finditer(text)})
    assert texts and not offenders, offenders
    # Raw ids must not leak into prose either.
    prose = " ".join(texts)
    assert "stil_begeni" not in prose and "Trend Takipcisi" not in prose


def test_persona_display_names_fold_to_ids():
    for persona in load_persona_data()["personaTypes"]:
        assert fold_text(persona["displayName"]) == fold_text(persona["name"])
        assert not ASCII_TURKISH.search(persona["reason"] + " " + persona["advice"]), persona["name"]


class _P:
    def __init__(self, name, rank=1):
        self.name, self.rank = name, rank
        self.purchase_probability, self.decision, self.decision_label = 0.6, "buy", "ALDI"
        self.personality_type, self.micro_feedback, self.reason, self.advice = None, "", "", ""


def test_model_names_with_turkish_letters_map_to_the_right_persona():
    personas = [_P("Fiyat Hassas Alici", 1), _P("Trend Takipcisi", 2), _P("Durtusel Alici", 3)]
    logs = _sanitize_debate_logs([{"name": "Trend Takipçisi", "text": "Bence görseller güçlü."}], personas)
    assert logs == [{"name": "Trend Takipcisi", "text": "Bence görseller güçlü."}]

    feedback = _parse_persona_feedback([{"name": "Dürtüsel Alıcı", "feedback": "Hemen alırım.", "action": "Stok"}], personas)
    assert next(f for f in feedback if f.name == "Durtusel Alici").feedback == "Hemen alırım."


def test_api_errors_are_turkish(client, payload):
    big = json.dumps(payload).encode()
    res = client.post("/api/simulate", content=big, headers={"Content-Length": str(10**9), "Content-Type": "application/json"})
    assert res.json()["detail"] == "İstek gövdesi çok büyük."
