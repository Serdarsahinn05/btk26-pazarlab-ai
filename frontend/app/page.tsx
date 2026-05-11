"use client";

import { useState } from "react";
import ProductForm from "@/components/ProductForm";
import SimulationLogs from "@/components/SimulationLogs";
import ResultDashboard from "@/components/ResultDashboard";
import { PurchaseMotivation, SimulationRequest, SimulationResponse } from "@/types";
import { simulateProduct } from "@/lib/api";
import { Beaker } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ModeToggle";

export default function Home() {
  const [simulationState, setSimulationState] = useState<"idle" | "loading" | "result">("idle");
  const [currentMotivation, setCurrentMotivation] = useState<PurchaseMotivation | null>(null);
  const [resultData, setResultData] = useState<SimulationResponse | null>(null);

  const handleSimulate = async (data: SimulationRequest) => {
    setCurrentMotivation(data.purchaseMotivation);
    setSimulationState("loading");
    setResultData(null);
    
    try {
      const response = await simulateProduct(data);
      setResultData(response);
      setSimulationState("result");
    } catch (error) {
      console.error("Simülasyon hatası:", error);
      alert("Simülasyon çalıştırılırken bir hata oluştu. Lütfen tekrar deneyin.");
      setSimulationState("idle");
    }
  };

  const resetSimulation = () => {
    setSimulationState("idle");
    setResultData(null);
    setCurrentMotivation(null);
  };

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-3 rounded-xl">
              <Beaker className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">PazarLab AI</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Sentetik Tüketici Simülasyon Platformu</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <ModeToggle />
            {simulationState === "result" && (
              <Button variant="outline" onClick={resetSimulation}>
                Yeni Simülasyon
              </Button>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="w-full">
          {simulationState === "idle" && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
              <ProductForm onSubmit={handleSimulate} isLoading={false} />
            </div>
          )}

          {simulationState === "loading" && (
            <div className="py-20 animate-in fade-in zoom-in-95 duration-300 flex justify-center">
              <SimulationLogs motivation={currentMotivation} />
            </div>
          )}

          {simulationState === "result" && resultData && (
            <ResultDashboard data={resultData} />
          )}
        </div>
        
      </div>
    </main>
  );
}
