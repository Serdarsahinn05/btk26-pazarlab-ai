"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ProductForm from "@/components/ProductForm";
import SimulationLogs from "@/components/SimulationLogs";
import ResultDashboard from "@/components/ResultDashboard";
import PersonaLab from "@/components/PersonaLab";
import personasData from "../../data/personas.json";
import { PurchaseMotivation, SimulationRequest, SimulationResponse, InputAnalysisResponse } from "@/types";


import { analyzeProductInput, simulateProduct } from "@/lib/api";
import { Sparkles, BrainCircuit, Activity, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import AnalysisWarning from "@/components/AnalysisWarning";
import { cn } from "@/lib/utils";

function DashboardContent() {
  const personaCount = personasData.personaTypes.length;
  const agentCount = personasData.personaTypes.reduce((acc, p: any) => acc + p.count, 0);
  const categoryCount = 10;

  const searchParams = useSearchParams();

  const currentView = (searchParams.get("view") || "analysis") as "analysis" | "debate" | "personas" | "benchmark";

  const [simulationState, setSimulationState] = useState<"idle" | "loading" | "result">("idle");


  const [currentMotivation, setCurrentMotivation] = useState<PurchaseMotivation | null>(null);
  const [resultData, setResultData] = useState<SimulationResponse | null>(null);
  const [pendingAnalysis, setPendingAnalysis] = useState<{ data: SimulationRequest; analysis: InputAnalysisResponse } | null>(null);

  const handleSimulate = async (data: SimulationRequest) => {
    setCurrentMotivation(data.purchaseMotivation);
    setSimulationState("loading");
    setResultData(null);
    
    try {
      const inputAnalysis = await analyzeProductInput(data);
      if (inputAnalysis.shouldWarn) {
        setPendingAnalysis({ data, analysis: inputAnalysis });
        setSimulationState("idle");
        return;
      }

      await executeSimulation(data, inputAnalysis);
    } catch (error) {
      console.error("Simülasyon hatası:", error);
      setSimulationState("idle");
    }
  };

  const executeSimulation = async (data: SimulationRequest, inputAnalysis: InputAnalysisResponse) => {
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
    } catch (error) {
      console.error("Simülasyon hatası:", error);
      setSimulationState("idle");
    }
  };

  const resetSimulation = () => {
    setSimulationState("idle");
    setResultData(null);
    setCurrentMotivation(null);
  };

  const recommendations = resultData?.aiInsights ? [
    { label: "Özet", text: resultData.aiInsights.summary },
    { label: "Aksiyon Planı", text: resultData.aiInsights.salesRecipe.join(" ") },
    { label: "Pazarlama", text: resultData.aiInsights.marketingAdvice },
    { label: "Fiyatlama", text: resultData.aiInsights.pricingAdvice },
    { label: "Sezon Analizi", text: resultData.aiInsights.seasonAdvice },
    { label: "Önerilen Açıklama", text: resultData.aiInsights.improvedDescription }
  ] : [];



  return (
    <div className="p-8 h-full flex flex-col gap-8">
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
        <div className="flex-1 lg:flex-[1.2] xl:flex-[1.5] min-w-0 flex flex-col gap-6">

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
                    {simulationState === "loading" ? (
                      <SimulationLogs motivation={currentMotivation} />
                    ) : (
                      <ProductForm onSubmit={handleSimulate} isLoading={false} />
                    )}
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
        <div className="w-full lg:w-64 xl:w-80 flex flex-col gap-6 shrink-0">
          <div className="bento-card border-accent/20 flex-shrink-0">



            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-5 h-5 text-accent" />
              <h3 className="font-bold tracking-tight">Analiz Durumu</h3>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-secondary/50 rounded-xl border border-border flex items-center gap-4">
                <div className={cn("w-3 h-3 rounded-full animate-pulse", simulationState === "loading" ? "bg-accent" : "bg-primary")} />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider">
                    {simulationState === "loading" ? "Analiz Ediliyor..." : simulationState === "result" ? "Analiz Tamamlandı" : "Hazır"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">PazarLab AI modelleri veriyi işliyor.</p>
                </div>
              </div>

              <div className="p-4 bg-secondary/30 rounded-xl border border-border border-dashed">
                <div className="flex items-center gap-2 mb-2 text-primary">
                  <Info className="w-4 h-4" />
                  <span className="text-xs font-bold">Neden Simülasyon?</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Gerçek pazar lansmanı öncesi, 500 farklı tüketici personasının tepkisini ölçmek riskinizi %65 oranında azaltır.
                </p>
              </div>
            </div>
          </div>

          <div className="bento-card flex-1 overflow-hidden flex flex-col">
             <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold tracking-tight">Akıllı Tavsiyeler</h3>
                <Sparkles className="w-4 h-4 text-primary" />
             </div>
             
             <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                {recommendations.length > 0 ? (
                  recommendations.map((rec, i) => (
                    <div key={i} className="p-3 bg-secondary/30 rounded-xl border border-border group hover:border-primary/30 transition-all">
                      <span className="text-[9px] font-black uppercase text-primary tracking-widest">{rec.label}</span>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{rec.text}</p>
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
