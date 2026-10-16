"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ProductForm from "@/components/ProductForm";
import SimulationLogs from "@/components/SimulationLogs";
import ResultDashboard from "@/components/ResultDashboard";
import PersonaLab from "@/components/PersonaLab";
import AnalysisWarning from "@/components/AnalysisWarning";
import StatusToast, { ToastState } from "@/components/StatusToast";
import RecentSimulations from "@/components/RecentSimulations";
import { addToHistory, findInHistory, storableRequest } from "@/lib/history";
import { DASHBOARD_VIEWS, DashboardView } from "@/components/TopBar";
import personasData from "@/data/personas.json";
import { analyzeProductInput, apiErrorMessage, getSimulation, simulateProduct } from "@/lib/api";
import { CATEGORIES, InputAnalysisResponse, PurchaseMotivation, SimulationRequest, SimulationResponse } from "@/types";

const PERSONA_COUNT = personasData.personaTypes.length;
const BOT_COUNT = personasData.personaTypes.reduce((sum, p: { count?: number }) => sum + (p.count || 0), 0);

function DashboardContent() {
  const router = useRouter();
  const params = useSearchParams();
  const requested = params.get("view");
  const resultParam = params.get("r");
  const view: DashboardView = DASHBOARD_VIEWS.some((v) => v.id === requested) ? (requested as DashboardView) : "analysis";

  const [state, setState] = useState<"idle" | "loading" | "result">("idle");
  const [motivation, setMotivation] = useState<PurchaseMotivation | null>(null);
  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [pending, setPending] = useState<{ data: SimulationRequest; analysis: InputAnalysisResponse } | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [productName, setProductName] = useState("");
  const [resultId, setResultId] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<SimulationRequest | null>(null);

  // Open a saved/shared result from ?r=<id>: this browser's history first, then the server.
  useEffect(() => {
    if (!resultParam || resultParam === resultId) return;
    const local = findInHistory(resultParam);
    if (local) {
      showResult(local.response, local.productName, local.id, local.request ?? null);
      return;
    }
    let cancelled = false;
    setState("loading");
    getSimulation(resultParam)
      .then((stored) => {
        if (cancelled) return;
        showResult(stored.response, stored.productName, stored.id, stored.request ?? null);
        addToHistory({
          request: stored.request ?? null,
          id: stored.id,
          createdAt: stored.createdAt * 1000,
          productName: stored.productName,
          category: stored.category,
          overallScore: stored.response.overallScore,
          response: stored.response,
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setState("idle");
        setToast({ tone: "error", message: apiErrorMessage(error) });
        router.replace("/dashboard");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react only to the URL parameter
  }, [resultParam]);

  const showResult = (response: SimulationResponse, name: string, id: string, request: SimulationRequest | null) => {
    setResult(response);
    setLastRequest(request);
    setProductName(name);
    setResultId(id);
    setState("result");
  };

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
      const id = response.simulationId ?? `local-${Date.now()}`;
      const request = storableRequest({ ...data, inputAnalysis: inputAnalysis ?? response.inputAnalysis });
      addToHistory({
        request,
        id,
        createdAt: Date.now(),
        productName: data.productName,
        category: data.category,
        overallScore: response.overallScore,
        response,
      });
      showResult(response, data.productName, id, request);
      // Put the result in the URL so refresh, back and "copy link" all keep it.
      router.replace(`/dashboard?view=${view}&r=${encodeURIComponent(id)}`, { scroll: false });
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
    setResultId(null);
    setMotivation(null);
    router.replace("/dashboard", { scroll: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const hasResult = state === "result" && result !== null;

  return (
    <div className="space-y-8">
      {view === "personas" && <PersonaLab />}

      {view !== "personas" && hasResult && result && <ResultDashboard data={result} view={view} productName={productName} request={lastRequest} onReset={reset} />}

      {view !== "personas" && view !== "analysis" && !hasResult && (
        <p className="rounded-wobble border-2 border-dashed border-border p-10 text-center text-muted-foreground">
          {view === "benchmark" ? "Rakip analizi" : "Persona tartışması"} bir simülasyon çalıştırıldıktan sonra burada görünür.
        </p>
      )}

      {/* The form stays mounted (only hidden) so switching tabs, a failed run or a cancelled warning keeps the typed input. */}
      <div hidden={view !== "analysis" || hasResult} className="space-y-8">
        <header className="space-y-2">
          <h1 className="text-[clamp(32px,5vw,52px)] font-extrabold leading-[1.02] tracking-tight">Ürününü test et</h1>
          <p className="text-foreground-2">
            {BOT_COUNT} sentetik tüketici · {PERSONA_COUNT} persona · {CATEGORIES.length} kategori{" "}
            <span className="ml-1 inline-block -rotate-2 font-hand text-xl text-muted-foreground">satmadan önce dene</span>
          </p>
        </header>
        {state === "loading" && (resultParam && !resultId ? (
          <p className="text-muted-foreground">Kayıtlı sonuç açılıyor…</p>
        ) : (
          <SimulationLogs motivation={motivation} />
        ))}
        <div hidden={state === "loading"}>
          <ProductForm onSubmit={handleSimulate} isLoading={state === "loading"} />
        </div>
        {state !== "loading" && <RecentSimulations />}
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
