import os
import json
import logging
import re
import time
import urllib.request
from typing import Any, Dict, List, TypedDict, Optional, Set

from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, END

from app.models.product import SimulationRequest
from app.models.simulation import SimulationResponse
from app.services.simulation_service import run_simulation

logger = logging.getLogger("graph_service")

# ---------------------------------------------------------------------------
# API-Driven Model Manager (No Hardcoded Priority)
# ---------------------------------------------------------------------------
class GeminiModelManager:
    """
    Fully dynamic model management.
    Fetches live model list from Google API, filters by capability and quota.
    No hardcoded priority list - uses whatever the API allows.
    """
    
    # Models known to be completely deprecated/broken
    BLOCKED_MODELS = {
        "gemini-1.0-pro", "gemini-pro", "gemini-ultra",
        "gemini-1.5-flash", "gemini-1.5-pro",  # EOL, 404 veriyor
        "gemini-1.5-flash-latest", "gemini-1.5-pro-latest",
    }
    
    def __init__(self):
        self._available_models: Optional[List[str]] = None
        self._quota_exhausted: Set[str] = set()
        self._last_refresh = 0
        self._refresh_interval = 300  # 5 minutes
    
    def _fetch_live_models(self) -> List[str]:
        """Fetch ALL models from Google API that support generateContent."""
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            logger.error("No GEMINI_API_KEY found!")
            return []
        
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
            with urllib.request.urlopen(url, timeout=10) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            
            models = []
            for m in data.get("models", []):
                name = m.get("name", "").split("/")[-1]
                methods = m.get("supportedGenerationMethods", [])
                
                # Only text generation models (skip vision-only, embedding, etc.)
                if "generateContent" not in methods:
                    continue
                
                # Skip blocked/deprecated models
                if name in self.BLOCKED_MODELS:
                    continue
                
                # Skip vision-only variants (usually have "vision" in name)
                if "vision" in name.lower():
                    continue
                
                # Skip TTS and other non-text models
                if any(x in name.lower() for x in ["tts", "embedding", "image", "audio"]):
                    continue
                
                models.append(name)
            
            logger.info(f"API returned {len(models)} usable models: {models}")
            return models
            
        except Exception as e:
            logger.error(f"Failed to fetch model list from API: {e}")
            return []
    
    def get_available_models(self, force_refresh: bool = False) -> List[str]:
        """
        Returns models from API, excluding quota-exhausted ones.
        No hardcoded priority - API decides what's available.
        """
        now = time.time()
        
        if force_refresh or self._available_models is None or (now - self._last_refresh) > self._refresh_interval:
            self._available_models = self._fetch_live_models()
            self._last_refresh = now
            
            if not self._available_models:
                logger.error("API returned NO usable models! Check API key and quota.")
        
        # Filter out quota-exhausted
        usable = [m for m in (self._available_models or []) if m not in self._quota_exhausted]
        
        if not usable and self._available_models:
            logger.warning("All models quota exhausted! Clearing cache and retrying...")
            self._quota_exhausted.clear()
            usable = self._available_models.copy()
        
        logger.info(f"Models available for use (quota-aware): {usable}")
        return usable
    
    def mark_quota_exhausted(self, model_name: str):
        """Mark a model as quota-exhausted."""
        self._quota_exhausted.add(model_name)
        remaining = [m for m in (self._available_models or []) if m not in self._quota_exhausted]
        logger.warning(f"Model '{model_name}' quota exhausted. Remaining: {remaining}")


# Global singleton
_model_manager = GeminiModelManager()


def get_safe_model_name() -> str:
    """Returns first available model from API, or empty string if none."""
    models = _model_manager.get_available_models()
    return models[0] if models else ""


# ---------------------------------------------------------------------------
# Robust LLM Caller with API-Driven Fallback
# ---------------------------------------------------------------------------
def invoke_llm_with_retry(
    prompt: str,
    temperature: float = 0.2,
    max_retries: int = 3,
    base_delay: float = 1.0
) -> str:
    """
    Tries models in API-returned order.
    No hardcoded list - purely API-driven.
    """
    models_to_try = _model_manager.get_available_models()
    
    if not models_to_try:
        raise RuntimeError("No available Gemini models! API key invalid or all quotas exhausted.")

    last_exception = None

    for model_name in models_to_try:
        for attempt in range(max_retries):
            try:
                llm = ChatGoogleGenerativeAI(
                    model=model_name,
                    temperature=temperature,
                    max_retries=0,
                )
                response = llm.invoke(prompt)
                return response.content

            except Exception as e:
                error_str = str(e).lower()
                last_exception = e

                # Quota exhausted (429) - skip immediately
                if "429" in error_str or "quota" in error_str or "rate limit" in error_str:
                    _model_manager.mark_quota_exhausted(model_name)
                    break
                
                # Temporary unavailable (503) - retry with backoff
                elif "503" in error_str or "unavailable" in error_str:
                    delay = base_delay * (2 ** attempt)
                    logger.warning(f"Model '{model_name}' 503. Retry {attempt+1}/{max_retries} in {delay:.1f}s...")
                    time.sleep(delay)
                    continue
                
                # Model not found (404) - permanently remove
                elif "404" in error_str or "not found" in error_str:
                    logger.error(f"Model '{model_name}' 404. Removing from pool.")
                    _model_manager._quota_exhausted.add(model_name)
                    break
                
                # Auth/other error - don't retry this model
                else:
                    logger.error(f"Model '{model_name}' error: {e}")
                    break

        logger.info(f"Model '{model_name}' failed, trying next from API list...")

    # All models from API failed
    logger.error(f"All {len(models_to_try)} models failed. Last error: {last_exception}")
    raise last_exception if last_exception else RuntimeError("All LLM invocations failed")


# ---------------------------------------------------------------------------
# State Definition
# ---------------------------------------------------------------------------
class GraphState(TypedDict):
    request: SimulationRequest
    competitors: List[Dict[str, Any]]
    benchmark_analysis: str
    debate_logs: List[Dict[str, str]]
    simulation_response: SimulationResponse
    category: str
    product_name: str


# ---------------------------------------------------------------------------
# Nodes
# ---------------------------------------------------------------------------

def input_analysis_node(state: GraphState) -> Dict[str, Any]:
    logger.info("Analyzing input quality...")
    from app.services.input_analysis_service import analyze_input
    input_analysis = analyze_input(state["request"])
    state["request"].input_analysis = input_analysis
    return {"request": state["request"]}


def research_node(state: GraphState) -> Dict[str, Any]:
    logger.info("Researching competitors...")
    from app.services.product_link_service import SerperShoppingService
    serper = SerperShoppingService()
    results = serper.search(state["product_name"])
    competitors = serper.filter_competitors(results, state["product_name"])
    return {"competitors": competitors}


def benchmark_node(state: GraphState) -> Dict[str, Any]:
    logger.info("Analyzing benchmarks...")
    
    competitors = state["competitors"]
    if not competitors:
        return {"benchmark_analysis": "Yakın rakip verisi bulunamadı."}

    competitor_text = "\n".join([
        f"- {c['title']}: {c['price']} ({c['source']})" 
        for c in competitors
    ])
    
    prompt = f"""
    Sen bir pazar analiz uzmanısın. Ürün: {state['product_name']}
    Fiyat: {state['request'].price} | Kategori: {state['category']}
    
    Rakipler:
    {competitor_text}
    
    1. Fiyat rekabetçiliği 2. Teknik fark 3. Pazar avantajı
    Kısa ve öz, Türkçe.
    """
    
    try:
        content = invoke_llm_with_retry(prompt, temperature=0.2)
        return {"benchmark_analysis": content}
    except Exception as e:
        logger.error(f"Benchmark failed: {e}")
        return {"benchmark_analysis": "Pazar analizi yapılamadı."}


def simulation_node(state: GraphState) -> Dict[str, Any]:
    logger.info("Running simulation engine...")
    response = run_simulation(state["request"])
    return {"simulation_response": response}


GENERIC_DEBATE_NAMES = {
    "assistant",
    "assistant 1",
    "assistant 2",
    "assistant 3",
    "asistan",
    "asistan 1",
    "asistan 2",
    "asistan 3",
    "buyer",
    "seller",
    "alici",
    "alıcı",
    "satici",
    "satıcı",
    "user",
    "system",
    "bot",
    "ajan",
    "ajan 1",
    "ajan 2",
    "ajan 3",
}


def _is_generic_debate_name(name: str) -> bool:
    clean_name = re.sub(r"\s+", " ", name.strip().lower())
    return clean_name in GENERIC_DEBATE_NAMES or bool(
        re.fullmatch(r"(assistant|asistan|agent|ajan|persona|bot)\s*\d+", clean_name)
    )


def _persona_for_generic_name(name: str, personas: List[Any], index: int) -> str:
    if not personas:
        return "Sistem"

    match = re.search(r"(\d+)", name or "")
    if match:
        persona_index = int(match.group(1)) - 1
        if 0 <= persona_index < len(personas):
            return personas[persona_index].name

    return personas[index % len(personas)].name


def _extract_prefixed_persona(text: str, valid_names: Set[str]) -> tuple[Optional[str], str]:
    clean_text = str(text or "").strip()
    for persona_name in valid_names:
        pattern = rf"^\s*{re.escape(persona_name)}\s*[:\-–]\s*"
        if re.match(pattern, clean_text, flags=re.IGNORECASE):
            return persona_name, re.sub(pattern, "", clean_text, count=1, flags=re.IGNORECASE).strip()
    return None, clean_text


def _fallback_debate_logs(personas: List[Any]) -> List[Dict[str, str]]:
    if not personas:
        return [{"name": "Sistem", "text": "Persona tartismasi icin yeterli veri olusmadi."}]

    logs: List[Dict[str, str]] = []
    for persona in personas[:3]:
        decision = getattr(persona, "decision_label", "") or "KARARSIZ"
        reason = getattr(persona, "micro_feedback", "") or getattr(persona, "reason", "")
        probability = int(round(float(getattr(persona, "purchase_probability", 0) or 0) * 100))
        logs.append({
            "name": persona.name,
            "text": f"Benim kararim {decision.lower()}; egilim skorum %{probability}. {reason}",
        })
    return logs


def _sanitize_debate_logs(raw_logs: Any, personas: List[Any]) -> List[Dict[str, str]]:
    if not isinstance(raw_logs, list):
        return []

    valid_names = {persona.name for persona in personas}
    sanitized: List[Dict[str, str]] = []

    for index, log in enumerate(raw_logs[:8]):
        if not isinstance(log, dict):
            continue

        raw_name = str(log.get("name", "") or "").strip()
        raw_text = str(log.get("text", "") or "").strip()
        prefixed_name, text = _extract_prefixed_persona(raw_text, valid_names)
        name = prefixed_name or raw_name

        if name not in valid_names:
            if _is_generic_debate_name(name) or not name:
                name = _persona_for_generic_name(name, personas, index)
            else:
                name = _persona_for_generic_name(name, personas, index)

        if text:
            sanitized.append({"name": name[:50], "text": text[:500]})

    return sanitized


def debate_node(state: GraphState) -> Dict[str, Any]:
    logger.info("Generating A2A debate...")
    
    if not state.get("simulation_response"):
        return {"debate_logs": [{"name": "Sistem", "text": "Simülasyon verisi yok."}]}

    all_personas = state["simulation_response"].all_personas
    if not all_personas:
        return {"debate_logs": []}

    personas = [all_personas[0], all_personas[len(all_personas)//2], all_personas[-1]] if len(all_personas) >= 3 else all_personas
        
    persona_context = "\n".join([
        f"- {p.name} (%{int(p.purchase_probability*100)}): {p.reason}" 
        for p in personas
    ])
    
    prompt = f"""
    Ürün: {state['product_name']} | Fiyat: {state['request'].price}
    Pazar: {state['benchmark_analysis']}
    
    Personalar:
    {persona_context}
    
    Kurallar: A2A tartışma, 6-8 mesaj, Türkçe, satın alma ihtimaline göre tutum.
    Format: [{{"name":"...","text":"..."}}]
    """

    try:
        content = invoke_llm_with_retry(prompt, temperature=0.7)
        content = content.replace("```json", "").replace("```", "").strip()
        debate_logs = json.loads(content)
        
        validated = []
        for log in debate_logs:
            if isinstance(log, dict) and "name" in log and "text" in log:
                validated.append({"name": str(log["name"])[:50], "text": str(log["text"])[:500]})
        
        return {"debate_logs": validated}
        
    except json.JSONDecodeError:
        # Regex extract attempt
        try:
            start, end = content.find("["), content.rfind("]") + 1
            if start != -1 and end > start:
                logs = json.loads(content[start:end])
                return {"debate_logs": [{"name": str(l.get("name",""))[:50], "text": str(l.get("text",""))[:500]} for l in logs if isinstance(l, dict)]}
        except Exception:
            pass
        return {"debate_logs": [{"name": "Sistem", "text": "Format hatası."}]}
    except Exception as e:
        logger.error(f"Debate error: {e}")
        return {"debate_logs": [{"name": "Sistem", "text": "Tartışma oluşturulamadı."}]}


def debate_node_v2(state: GraphState) -> Dict[str, Any]:
    logger.info("Generating persona-only A2A debate...")

    if not state.get("simulation_response"):
        return {"debate_logs": [{"name": "Sistem", "text": "Simulasyon verisi yok."}]}

    response = state["simulation_response"]
    all_personas = response.all_personas
    if not all_personas:
        return {"debate_logs": []}

    personas = [all_personas[0], all_personas[len(all_personas) // 2], all_personas[-1]] if len(all_personas) >= 3 else all_personas
    allowed_names = ", ".join([p.name for p in personas])
    persona_context = "\n".join([
        (
            f"- {p.name} (%{int(p.purchase_probability * 100)}, karar: {p.decision_label}): "
            f"{p.reason} | karakter: {p.personality_type or p.ai_roleplay_prompt or 'persona'} | "
            f"kritik not: {p.micro_feedback}"
        )
        for p in personas
    ])

    prompt = f"""
    Urun: {state['product_name']} | Fiyat: {state['request'].price}
    Kategori: {state['category']}
    Genel skor: {response.overall_score}/100
    Pazar: {state['benchmark_analysis']}

    Personalar:
    {persona_context}

    Gorev: Bu 3 persona kendi aralarinda urunu tartissin. Satici, musteri temsilcisi,
    moderator, buyer/seller veya assistant rolu yazma.

    Kurallar:
    - 6-8 mesaj uret.
    - name alani SADECE su isimlerden biri olabilir: {allowed_names}
    - Her persona kendi karar ihtimaline gore konussun; hepsi ayni fikirde olmasin.
    - Mesajlar kisa, dogal ve somut olsun: fiyat, guven, ozellik, aciklama veya kanal riskine deginsin.
    - "Ben bir asistan olarak", "assistant 1", "alici", "satici" gibi ifadeler yasak.
    - Son mesaj mutlaka bir personanin saticiya net bir iyilestirme onerisiyle bitsin.
    - Cevabi SADECE JSON array olarak dondur.

    Format: [{{"name":"{personas[0].name}","text":"..."}}]
    """

    try:
        content = invoke_llm_with_retry(prompt, temperature=0.7)
        content = content.replace("```json", "").replace("```", "").strip()
        debate_logs = json.loads(content)
        validated = _sanitize_debate_logs(debate_logs, personas)
        return {"debate_logs": validated or _fallback_debate_logs(personas)}
    except json.JSONDecodeError:
        try:
            start, end = content.find("["), content.rfind("]") + 1
            if start != -1 and end > start:
                logs = json.loads(content[start:end])
                validated = _sanitize_debate_logs(logs, personas)
                return {"debate_logs": validated or _fallback_debate_logs(personas)}
        except Exception:
            pass
        return {"debate_logs": _fallback_debate_logs(personas)}
    except Exception as e:
        logger.error(f"Persona debate error: {e}")
        return {"debate_logs": _fallback_debate_logs(personas)}


# ---------------------------------------------------------------------------
# Graph Construction
# ---------------------------------------------------------------------------

def create_simulation_graph():
    workflow = StateGraph(GraphState)
    
    for name, func in [
        ("input_analysis", input_analysis_node),
        ("research", research_node),
        ("benchmark", benchmark_node),
        ("simulate", simulation_node),
        ("debate", debate_node_v2),
    ]:
        workflow.add_node(name, func)
    
    workflow.set_entry_point("input_analysis")
    workflow.add_edge("input_analysis", "research")
    workflow.add_edge("research", "benchmark")
    workflow.add_edge("benchmark", "simulate")
    workflow.add_edge("simulate", "debate")
    workflow.add_edge("debate", END)
    
    return workflow.compile()


def run_agentic_simulation(request: SimulationRequest) -> SimulationResponse:
    graph = create_simulation_graph()
    
    initial_state = {
        "request": request,
        "product_name": request.product_name,
        "category": request.category,
        "competitors": [],
        "benchmark_analysis": "",
        "debate_logs": [],
        "simulation_response": None
    }
    
    try:
        final_state = graph.invoke(initial_state)
        
        response = final_state.get("simulation_response")
        if not response:
            raise ValueError("Simülasyon sonuç üretemedi.")

        raw_logs = final_state.get("debate_logs", [])
        if not isinstance(raw_logs, list):
            raw_logs = []
        
        validated_logs = []
        for log in raw_logs:
            if isinstance(log, dict) and log.get("name") is not None:
                validated_logs.append({
                    "name": str(log.get("name", "Bilinmiyor")),
                    "text": str(log.get("text", ""))
                })
            else:
                validated_logs.append({"name": "Sistem", "text": str(log) if log else "Geçersiz veri."})
        
        response.debate_logs = validated_logs or [{"name": "Sistem", "text": "Tartışma kurgulanamadı."}]
        debate_personas = [response.all_personas[0], response.all_personas[len(response.all_personas) // 2], response.all_personas[-1]] if len(response.all_personas) >= 3 else response.all_personas
        response.debate_logs = _sanitize_debate_logs(raw_logs, debate_personas) or _fallback_debate_logs(debate_personas)
        response.benchmark_analysis = final_state.get("benchmark_analysis", "")
             
        return response
        
    except Exception as e:
        logger.error(f"Agentic simulation failed: {e}")
        fallback_response = run_simulation(request)
        fallback_response.debate_logs = [
            {"name": "Sistem", "text": f"Ajanlar meşgul: {str(e)[:50]}..."},
            {"name": "Sistem", "text": "Standart simülasyon sonuçları hazırlandı."}
        ]
        return fallback_response
