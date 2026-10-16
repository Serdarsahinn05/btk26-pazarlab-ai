"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ProductForm from "@/components/ProductForm";
import SimulationLogs from "@/components/SimulationLogs";
import ResultDashboard from "@/components/ResultDashboard";
import PersonaLab from "@/components/PersonaLab";
import AnalysisWarning from "@/components/AnalysisWarning";
import StatusToast, { ToastState } from "@/components/StatusToast";
import { DASHBOARD_VIEWS, DashboardView } from "@/components/TopBar";
import personasData from "@/data/personas.json";
import { analyzeProductInput, apiErrorMessage, simulateProduct } from "@/lib/api";
import { CATEGORIES, InputAnalysisResponse, PurchaseMotivation, SimulationRequest, SimulationResponse } from "@/types";

const PERSONA_COUNT = personasData.personaTypes.length;
const BOT_COUNT = personasData.personaTypes.reduce((sum, p: { count?: number }) => sum + (p.count || 0), 0);

function DashboardContent() {
  const requested = useSearchParams().get("view");
  const view: DashboardView = DASHBOARD_VIEWS.some((v) => v.id === requested) ? (requested as DashboardView) : "analysis";

  const [state, setState] = useState<"idle" | "loading" | "result">("idle");
  const [motivation, setMotivation] = useState<PurchaseMotivation | null>(null);
  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [pending, setPending] = useState<{ data: SimulationRequest; analysis: InputAnalysisResponse } | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const handleSimulate = async (data: SimulationRequest) => {
    setMotivation(data.purchaseMotivation);
    setState("loading");
    setResult(null);
    setToast(null);

    let inputAnalysis: InputAnalysisResponse | undefined;
    try {
      inputAnalysis = await analyzeProductInput(data);
    } catch (error) {
      // The quality check is advisory: if it fails, the backend runs it itself during /simulate.
      console.warn("Girdi analizi atlandı:", apiErrorMessage(error));
    }
    if (inputAnalysis?.shouldWarn) {
      setPending({ data, analysis: inputAnalysis });
      setState("idle");
      return;
    }
    await executeSimulation(data, inputAnalysis);
  };

  const executeSimulation = async (data: SimulationRequest, inputAnalysis?: InputAnalysisResponse) => {
    setState("loading");
    setResult(null);
    try {
      const response = await simulateProduct({ ...data, inputAnalysis });
      setResult(response);
      setState("result");
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (response.aiInsights?.aiGenerated === false) {
        setToast({ tone: "info", message: "AI şu anda kullanılamadı; tavsiyeler kural tabanlı üretildi." });
      }
    } catch (error) {
      setState("idle");
      setToast({ tone: "error", message: apiErrorMessage(error), onRetry: () => executeSimulation(data, inputAnalysis) });
    }
  };

  const reset = () => {
    setState("idle");
    setResult(null);
    setMotivation(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const showResult = state === "result" && result !== null;

  return (
    <div className="space-y-8">
      {view === "personas" && <PersonaLab />}

      {view !== "personas" && showResult && <ResultDashboard data={result} view={view} onReset={reset} />}

      {view !== "personas" && view !== "analysis" && !showResult && (
        <p className="rounded-wobble border-2 border-dashed border-border p-10 text-center text-muted-foreground">
          {view === "benchmark" ? "Rakip analizi" : "Persona tartışması"} bir simülasyon çalıştırıldıktan sonra burada görünür.
        </p>
      )}

      {/* The form stays mounted (only hidden) so switching tabs, a failed run or a cancelled warning keeps the typed input. */}
      <div hidden={view !== "analysis" || showResult} className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-[clamp(32px,5vw,52px)] font-extrabold leading-[1.02] tracking-tight">Ürününü test et</h1>
          <p className="text-foreground-2">
            {BOT_COUNT} sentetik tüketici · {PERSONA_COUNT} persona · {CATEGORIES.length} kategori{" "}
            <span className="ml-1 inline-block -rotate-2 font-hand text-xl text-muted-foreground">satmadan önce dene</span>
          </p>
        </header>
        {state === "loading" && <SimulationLogs motivation={motivation} />}
        <div hidden={state === "loading"}>
          <ProductForm onSubmit={handleSimulate} isLoading={state === "loading"} />
        </div>
      </div>

      <StatusToast toast={toast} onClose={() => setToast(null)} />

      {pending && (
        <AnalysisWarning
          analysis={pending.analysis}
          onConfirm={() => {
            const { data, analysis } = pending;
            setPending(null);
            executeSimulation(data, analysis);
          }}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Yükleniyor…</p>}>
      <DashboardContent />
    </Suspense>
  );
}
