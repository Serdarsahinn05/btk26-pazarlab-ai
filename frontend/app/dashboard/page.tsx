"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ProductForm from "@/components/ProductForm";
import SimulationLogs from "@/components/SimulationLogs";
import ResultDashboard from "@/components/ResultDashboard";
import PersonaLab from "@/components/PersonaLab";
import personasData from "../../data/personas.json";
import { CATEGORIES, PurchaseMotivation, SimulationRequest, SimulationResponse, InputAnalysisResponse } from "@/types";


import { analyzeProductInput, apiErrorMessage, simulateProduct } from "@/lib/api";
import StatusToast, { ToastState } from "@/components/StatusToast";
import { Sparkles, BrainCircuit, Activity, Info, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import AnalysisWarning from "@/components/AnalysisWarning";
import { cn } from "@/lib/utils";

type SmartRecommendation = {
  label: string;
  text?: string;
  items?: string[];
  tone?: "primary" | "warning" | "success";
};

function buildSmartRecommendations(resultData: SimulationResponse | null): SmartRecommendation[] {
  if (!resultData?.aiInsights) return [];

  const distribution = resultData.decisionDistribution;
  const topPersona = resultData.topPersonas?.[0];
  const topPersonaAction = resultData.aiInsights.personaFeedback?.find((item) => item.name === topPersona?.name)?.action || topPersona?.advice;
  const buyRate = resultData.simulatedConsumers
    ? Math.round((resultData.estimatedBuyers / resultData.simulatedConsumers) * 100)
    : resultData.overallScore;

  const decisionText = distribution
    ? `${distribution.buy} bot aldı, ${distribution.watch} bot kararsız kaldı, ${distribution.skip} bot almadı. Bu sonuç yaklaşık %${buyRate} satın alma eğilimi gösteriyor; bunu gerçek site dönüşüm oranı gibi değil, talep sinyali gibi okumak gerekir.`
    : resultData.aiInsights.summary;

  const criticalRisk = resultData.weaknesses?.[0] || resultData.aiInsights.descriptionAdvice;

  const recommendations: SmartRecommendation[] = [
    {
      label: "Kısa Karar",
      text: decisionText,
      tone: buyRate >= 60 ? "success" : buyRate >= 40 ? "warning" : "primary",
    },
    {
      label: "İlk 3 Aksiyon",
      items: resultData.aiInsights.salesRecipe.slice(0, 3),
      tone: "primary",
    },
    {
      label: "Kritik Risk",
      text: criticalRisk,
      tone: "warning",
    },
    {
      label: "Hedef Persona",
      text: topPersona
        ? `${topPersona.name}: ${topPersonaAction || topPersona.reason}`
        : resultData.aiInsights.marketingAdvice,
      tone: "success",
    },
    {
      label: "Test Önerisi",
      items: [resultData.aiInsights.pricingAdvice, resultData.aiInsights.marketingAdvice].filter(Boolean),
      tone: "primary",
    },
  ];

  return recommendations.filter((item) => item.text || item.items?.length);
}

function getRecommendationClasses(tone?: SmartRecommendation["tone"]) {
  if (tone === "success") return "border-emerald-500/20 bg-emerald-500/5";
  if (tone === "warning") return "border-amber-500/20 bg-amber-500/5";
  return "border-primary/20 bg-primary/5";
}

function DashboardContent() {
  const personaCount = personasData.personaTypes.length;
  const agentCount = personasData.personaTypes.reduce((acc, p: { count?: number }) => acc + (p.count || 0), 0);
  const categoryCount = CATEGORIES.length;

  const searchParams = useSearchParams();

  const currentView = (searchParams.get("view") || "analysis") as "analysis" | "debate" | "personas" | "benchmark";

  const [simulationState, setSimulationState] = useState<"idle" | "loading" | "result">("idle");


  const [currentMotivation, setCurrentMotivation] = useState<PurchaseMotivation | null>(null);
  const [resultData, setResultData] = useState<SimulationResponse | null>(null);
  const [pendingAnalysis, setPendingAnalysis] = useState<{ data: SimulationRequest; analysis: InputAnalysisResponse } | null>(null);
  const [smartPanelExpanded, setSmartPanelExpanded] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const handleSimulate = async (data: SimulationRequest) => {
    setCurrentMotivation(data.purchaseMotivation);
    setSimulationState("loading");
    setResultData(null);
    setSmartPanelExpanded(false);
    setToast(null);

    let inputAnalysis: InputAnalysisResponse | undefined;
    try {
      inputAnalysis = await analyzeProductInput(data);
    } catch (error) {
      // The quality check is advisory: if it fails, the backend runs it itself during /simulate.
      console.warn("Girdi analizi atlandı:", apiErrorMessage(error));
    }
    if (inputAnalysis?.shouldWarn) {
      setPendingAnalysis({ data, analysis: inputAnalysis });
      setSimulationState("idle");
      return;
    }
    await executeSimulation(data, inputAnalysis);
  };

  const executeSimulation = async (data: SimulationRequest, inputAnalysis?: InputAnalysisResponse) => {
    setSimulationState("loading");
    setResultData(null);
    const minDelay = new Promise(resolve => setTimeout(resolve, 2500));

    try {
      const [response] = await Promise.all([
        simulateProduct({ ...data, inputAnalysis }),
        minDelay
      ]);

      setResultData(response);
      setSimulationState("result");
      if (response.aiInsights && response.aiInsights.aiGenerated === false) {
        setToast({ tone: "info", message: "AI şu anda kullanılamadı; tavsiyeler kural tabanlı üretildi." });
      }
    } catch (error) {
      setSimulationState("idle");
      setToast({
        tone: "error",
        message: apiErrorMessage(error),
        onRetry: () => executeSimulation(data, inputAnalysis),
      });
    }
  };

  const resetSimulation = () => {
    setSimulationState("idle");
    setResultData(null);
    setCurrentMotivation(null);
    setSmartPanelExpanded(false);
  };

  const recommendations = buildSmartRecommendations(resultData);
  const isSmartPanelExpanded = simulationState === "result" && smartPanelExpanded;



  return (
    <div className="h-full flex flex-col gap-8">
      {/* Top Header Section */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-black tracking-tighter flex items-center gap-3">
            <Sparkles className="text-primary w-8 h-8 glow-blue" />
            TASK INTELLIGENCE
          </h2>
          <p className="text-muted-foreground text-xs md:text-sm font-medium">Ürününüzü detaylandırın, PazarLab pazar uyumunu saniyeler içinde analiz etsin.</p>
        </div>

        <div className="flex flex-wrap gap-4 w-full md:w-auto">
          <div className="flex-1 md:flex-none glass px-4 md:px-6 py-2 md:py-3 rounded-2xl flex flex-col items-center border-primary/20 glow-blue">
            <span className="text-[9px] md:text-[10px] font-bold text-primary tracking-widest uppercase">Toplam Bot</span>
            <span className="text-lg md:text-xl font-black">{agentCount.toLocaleString()}</span>
          </div>
          <div className="flex-1 md:flex-none glass px-4 md:px-6 py-2 md:py-3 rounded-2xl flex flex-col items-center border-accent/20 glow-purple">
            <span className="text-[9px] md:text-[10px] font-bold text-accent tracking-widest uppercase">Ürün Kategorisi</span>
            <span className="text-lg md:text-xl font-black">{categoryCount}</span>
          </div>
          <div className="flex-1 md:flex-none glass px-4 md:px-6 py-2 md:py-3 rounded-2xl flex flex-col items-center border-indigo-500/20 glow-blue">
            <span className="text-[9px] md:text-[10px] font-bold text-indigo-400 tracking-widest uppercase">Müşteri Personası</span>
            <span className="text-lg md:text-xl font-black">{personaCount}</span>
          </div>
        </div>

      </header>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Main Content Pane */}
        <div className={cn(
          "flex-1 min-w-0 flex flex-col gap-6 transition-all duration-300",
          isSmartPanelExpanded ? "lg:flex-[0.85] xl:flex-[0.9]" : "lg:flex-[1.2] xl:flex-[1.5]"
        )}>

          <AnimatePresence mode="wait">
            {currentView === "personas" ? (
              <motion.div
                key="personas-pane"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex-1 overflow-y-auto"
              >
                <PersonaLab />
              </motion.div>
            ) : simulationState !== "result" ? (
              <motion.div
                key="form-pane"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col gap-6"
              >
                <div className="bento-card border-primary/20 flex-1 flex flex-col">
                  <div className="flex items-center gap-3 mb-6">
                    <BrainCircuit className="w-6 h-6 text-primary" />
                    <h3 className="font-bold tracking-tight">Ürün Detayları & Analiz</h3>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {simulationState === "loading" && <SimulationLogs motivation={currentMotivation} />}
                    {/* Hidden, not unmounted: a failed run or a cancelled warning keeps the typed input. */}
                    <div hidden={simulationState === "loading"}>
                      <ProductForm onSubmit={handleSimulate} isLoading={simulationState === "loading"} />
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="result-pane"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 overflow-y-auto"
              >
                {resultData && <ResultDashboard data={resultData} view={currentView} />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Side Info Pane */}
        <div className={cn(
          "w-full flex flex-col gap-6 shrink-0 min-h-0 transition-all duration-300",
          isSmartPanelExpanded ? "lg:w-[520px] xl:w-[640px] 2xl:w-[720px]" : "lg:w-72 xl:w-96"
        )}>
          <div className={cn("bento-card border-accent/20 flex-shrink-0", simulationState === "result" && "p-4", isSmartPanelExpanded && "hidden")}>



            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-5 h-5 text-accent" />
              <h3 className="font-bold tracking-tight">Analiz Durumu</h3>
            </div>

            <div className="space-y-4">
              <div className={cn("bg-secondary/50 rounded-xl border border-border flex items-center gap-4", simulationState === "result" ? "p-3" : "p-4")}>
                <div className={cn("w-3 h-3 rounded-full animate-pulse", simulationState === "loading" ? "bg-accent" : "bg-primary")} />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider">
                    {simulationState === "loading" ? "Analiz Ediliyor..." : simulationState === "result" ? "Analiz Tamamlandı" : "Hazır"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">PazarLab AI modelleri veriyi işliyor.</p>
                </div>
              </div>

              {simulationState !== "result" && (
              <div className="p-4 bg-secondary/30 rounded-xl border border-border border-dashed">
                <div className="flex items-center gap-2 mb-2 text-primary">
                  <Info className="w-4 h-4" />
                  <span className="text-xs font-bold">Neden Simülasyon?</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Gerçek pazar lansmanı öncesi, 500 sentetik tüketicinin {personaCount} persona tipi altında verdiği tepkileri ölçmek riskinizi azaltır.
                </p>
              </div>
              )}
            </div>
          </div>

          <div className={cn(
            "bento-card flex-1 overflow-hidden flex flex-col transition-all duration-300",
            isSmartPanelExpanded ? "min-h-[70vh]" : "min-h-[420px] lg:min-h-0"
          )}>
             <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold tracking-tight">Akıllı Tavsiyeler</h3>
                {recommendations.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setSmartPanelExpanded((expanded) => !expanded)}
                    className="inline-flex h-9 items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 text-[10px] font-black uppercase tracking-widest text-primary transition hover:bg-primary/20"
                    aria-label={isSmartPanelExpanded ? "Akıllı tavsiyeleri küçült" : "Akıllı tavsiyeleri genişlet"}
                  >
                    {isSmartPanelExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                    <span>{isSmartPanelExpanded ? "Küçült" : "Genişlet"}</span>
                  </button>
                ) : (
                  <Sparkles className="w-4 h-4 text-primary" />
                )}
             </div>
             {recommendations.length > 0 && (
              <p className="mb-4 text-[11px] text-muted-foreground leading-relaxed">
                Simülasyon sonucundan çıkarılan en yakın uygulanabilir adımlar.
              </p>
             )}

             <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto pr-3 custom-scrollbar">
                {recommendations.length > 0 ? (
                  recommendations.map((rec, i) => (
                    <div key={i} className={cn("p-3 rounded-xl border group hover:border-primary/30 transition-all", getRecommendationClasses(rec.tone))}>
                      <span className="text-[9px] font-black uppercase text-primary tracking-widest">{rec.label}</span>
                      {rec.items ? (
                        <ol className="mt-2 space-y-1.5">
                          {rec.items.map((item, itemIndex) => (
                            <li key={`${rec.label}-${itemIndex}`} className="flex gap-2 text-xs text-muted-foreground leading-relaxed">
                              <span className="font-black text-primary/80">{itemIndex + 1}</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{rec.text}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
                    <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center border border-primary/10">
                      <BrainCircuit className="w-8 h-8 text-primary opacity-50" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground">Veri Bekleniyor</p>
                      <p className="text-[10px] text-muted-foreground px-4">Simülasyon tamamlandığında yapay zeka buraya ürününüz için kritik tavsiyeler bırakacak.</p>
                    </div>
                  </div>
                )}
             </div>
          </div>

          {simulationState === "result" && (
            <Button
              onClick={resetSimulation}
              className="w-full py-6 rounded-2xl font-black tracking-widest uppercase bg-primary hover:bg-primary/90 glow-blue"
            >
              YENİ SİMÜLASYON BAŞLAT
            </Button>
          )}
        </div>
      </div>

      <StatusToast toast={toast} onClose={() => setToast(null)} />

      {/* Analysis Warning Modal */}
      <AnimatePresence>
        {pendingAnalysis && (
          <AnalysisWarning
            analysis={pendingAnalysis.analysis}
            onConfirm={() => {
              const { data, analysis } = pendingAnalysis;
              setPendingAnalysis(null);
              executeSimulation(data, analysis);
            }}
            onCancel={() => setPendingAnalysis(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="p-8">Yükleniyor...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
