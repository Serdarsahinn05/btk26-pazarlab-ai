import logging
import re
from typing import Any, Dict, List, Optional, Set, TypedDict

from langgraph.graph import StateGraph, END

from app.models.product import SimulationRequest
from app.models.simulation import SimulationResponse
from app.services import llm_client
from app.services.prompt_safety import clip
from app.services.simulation_service import run_simulation

logger = logging.getLogger("graph_service")

# ---------------------------------------------------------------------------
# State Definition
# ---------------------------------------------------------------------------
class GraphState(TypedDict):
    request: SimulationRequest
    competitors: List[Dict[str, Any]]
    benchmark_analysis: str
    debate_logs: List[Dict[str, str]]
    simulation_response: Optional[SimulationResponse]
    category: str
    product_name: str


# ---------------------------------------------------------------------------
# Nodes
# ---------------------------------------------------------------------------

def input_analysis_node(state: GraphState) -> Dict[str, Any]:
    request = state["request"]
    if request.input_analysis is not None:
        # The dashboard already called /api/analyze-input; its result arrives
        # schema-validated with the request, so don't pay for a second LLM call.
        return {}
    logger.info("Analyzing input quality...")
    from app.services.input_analysis_service import analyze_input
    return {"request": request.model_copy(update={"input_analysis": analyze_input(request)})}


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

    instructions = (
        "Sen bir pazar analiz uzmanısın. Verilen ürünü rakipleriyle karşılaştır: "
        "1. Fiyat rekabetçiliği 2. Teknik fark 3. Pazar avantajı. "
        "Kısa ve öz, Türkçe, en fazla 250 kelime, Markdown."
    )
    data = {
        "urun": clip(state["product_name"], 120),
        "fiyat": state["request"].price,
        "kategori": clip(state["category"], 40),
        "rakipler": [
            {"baslik": clip(c.get("title"), 120), "fiyat": clip(c.get("price"), 30), "kaynak": clip(c.get("source"), 60)}
            for c in competitors[:5]
        ],
    }

    try:
        content = llm_client.generate_text(instructions, data, temperature=0.2, max_tokens=4096)
        return {"benchmark_analysis": clip(content, 4000)}
    except Exception as e:
        logger.warning("Benchmark unavailable: %r", e)
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
    instructions = f"""
    Gorev: Verideki 3 persona kendi aralarinda urunu tartissin. Satici, musteri temsilcisi,
    moderator, buyer/seller veya assistant rolu yazma.

    Kurallar:
    - 6-8 mesaj uret.
    - name alani SADECE su isimlerden biri olabilir: {allowed_names}
    - Her persona kendi karar ihtimaline ve karakterine gore konussun; hepsi ayni fikirde olmasin.
    - Mesajlar kisa, dogal ve somut olsun: fiyat, guven, ozellik, aciklama veya kanal riskine deginsin.
    - "Ben bir asistan olarak", "assistant 1", "alici", "satici" gibi ifadeler yasak.
    - Son mesaj mutlaka bir personanin saticiya net bir iyilestirme onerisiyle bitsin.
    - Cevabi SADECE JSON array olarak dondur.

    Format: [{{"name":"{personas[0].name}","text":"..."}}]
    """
    data = {
        "urun": clip(state["product_name"], 120),
        "fiyat": state["request"].price,
        "kategori": clip(state["category"], 40),
        "genelSkor": response.overall_score,
        "pazarAnalizi": clip(state["benchmark_analysis"], 1500),
        "personalar": [
            {
                "ad": p.name,
                "satinAlmaIhtimali": int(p.purchase_probability * 100),
                "karar": p.decision_label,
                "gerekce": clip(p.reason, 300),
                "karakter": clip(p.personality_type or p.ai_roleplay_prompt or "persona", 400),
                "kritikNot": clip(p.micro_feedback, 300),
            }
            for p in personas
        ],
    }

    try:
        logs = llm_client.generate_json(instructions, data, temperature=0.7)
        if isinstance(logs, dict):  # some models wrap the array: {"messages": [...]}
            logs = next((v for v in logs.values() if isinstance(v, list)), [])
        return {"debate_logs": _sanitize_debate_logs(logs, personas) or _fallback_debate_logs(personas)}
    except Exception as e:
        logger.warning("Persona debate unavailable: %r", e)
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


_GRAPH = create_simulation_graph()


def run_agentic_simulation(request: SimulationRequest) -> SimulationResponse:
    graph = _GRAPH

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

        # debate_node_v2 already sanitized the logs and filled in a fallback.
        response.debate_logs = final_state.get("debate_logs") or [{"name": "Sistem", "text": "Tartışma kurgulanamadı."}]
        response.benchmark_analysis = final_state.get("benchmark_analysis", "")
             
        return response
        
    except Exception:
        logger.exception("Agentic simulation failed")
        fallback_response = run_simulation(request)
        fallback_response.debate_logs = [
            {"name": "Sistem", "text": "AI ajanlarına şu anda ulaşılamadı."},
            {"name": "Sistem", "text": "Standart simülasyon sonuçları hazırlandı."}
        ]
        return fallback_response
