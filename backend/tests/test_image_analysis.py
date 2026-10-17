"""Image analysis (Faz 16): photos reach Gemini as inline parts; without AI the endpoint says why."""

import base64

from app.services import image_analysis, llm_client

PNG = "data:image/png;base64," + base64.b64encode(b"\x89PNG\r\n\x1a\n" + b"0" * 64).decode()


def test_without_ai_the_endpoint_explains(client):
    data = client.post("/api/analyze-images", json={"images": [PNG], "category": "tisort"}).json()
    assert data == {"available": False, "reason": "Görsel analizi için AI şu an kullanılamıyor."}


def test_photos_are_sent_inline_and_the_answer_is_cleaned(monkeypatch):
    seen = {}

    def fake_generate_json(prompt, data, **kwargs):
        seen.update(kwargs, data=data)
        return {"score": 140, "strengths": ["Net ürün"], "issues": ["Arka plan kalabalık", "", "x", "y"], "suggestions": "tek metin"}

    monkeypatch.setattr(llm_client, "generate_json", fake_generate_json)
    result = image_analysis.analyze_images([PNG, "data:image/gif;base64,R0lGOD", "ftp://x/y.png"], "tisort", "Basic Tişört")
    assert [mime for mime, _ in seen["images"]] == ["image/png"]  # gif and ftp are skipped
    assert seen["data"]["kategori"] == "Giyim / Tişört"
    assert result == {"score": 100, "strengths": ["Net ürün"], "issues": ["Arka plan kalabalık", "x", "y"],
                      "suggestions": [], "missingShots": [], "imagesUsed": 1}


def test_unusable_photos_give_none():
    assert image_analysis.analyze_images(["data:image/png;base64,not-base64!!"], "tisort", "x") is None


def test_private_hosts_are_not_fetched():
    assert image_analysis._decode("http://127.0.0.1/a.png") is None


def test_gemini_request_carries_the_photos(monkeypatch):
    import io
    import json

    captured = {}

    class Response(io.BytesIO):
        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

    def fake_urlopen(req, timeout):
        captured["body"] = json.loads(req.data)
        return Response(json.dumps({"candidates": [{"content": {"parts": [{"text": '{"score": 70}'}]}}]}).encode())

    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr(llm_client._pool, "candidates", lambda: ["gemini-test"])
    monkeypatch.setattr(llm_client.urllib.request, "urlopen", fake_urlopen)
    result = image_analysis.analyze_images([PNG], "tisort", "Basic Tişört")
    parts = captured["body"]["contents"][0]["parts"]
    assert parts[0]["text"] and parts[1]["inline_data"]["mime_type"] == "image/png"
    assert result["score"] == 70
