"use client";

import { useState } from "react";
import ProductForm from "@/components/ProductForm";
import SimulationLogs from "@/components/SimulationLogs";
import ResultDashboard from "@/components/ResultDashboard";
import { PurchaseMotivation, SimulationRequest, SimulationResponse } from "@/types";
import { analyzeProductInput, simulateProduct } from "@/lib/api";
import { Beaker } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ModeToggle";
import { motion, AnimatePresence } from "framer-motion";
import AnalysisWarning from "@/components/AnalysisWarning";
import { InputAnalysisResponse } from "@/types";

export default function Home() {
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
        setSimulationState("idle"); // Keep it idle so form is still visible behind if needed, or just pause
        return;
      }

      await executeSimulation(data, inputAnalysis);
    } catch (error) {
      console.error("Simülasyon hatası:", error);
      alert("Simülasyon çalıştırılırken bir hata oluştu. Lütfen tekrar deneyin.");
      setSimulationState("idle");
    }
  };

  const executeSimulation = async (data: SimulationRequest, inputAnalysis: InputAnalysisResponse) => {
    setSimulationState("loading");
    setResultData(null);
    try {
      const response = await simulateProduct({ ...data, inputAnalysis });
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
    <main className="min-h-screen relative overflow-hidden bg-background">
      {/* Dynamic Backgrounds */}
      <div className="absolute inset-0 bg-grid-black/[0.02] dark:bg-grid-white/[0.02]" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="relative max-w-6xl mx-auto p-4 md:p-8 space-y-8 z-10">
        
        {/* Header */}
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col md:flex-row items-center justify-between gap-4 glass p-6 rounded-2xl shadow-lg border border-border"
        >
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 p-3 rounded-xl border border-primary/20 relative group">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <Beaker className="w-8 h-8 text-primary relative z-10" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-foreground">
                PazarLab <span className="text-gradient">AI</span>
              </h1>
              <p className="text-sm text-muted-foreground font-medium">Sentetik Tüketici Simülasyon Platformu</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <ModeToggle />
            <AnimatePresence>
              {simulationState === "result" && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                >
                  <Button variant="outline" onClick={resetSimulation} className="border-primary/20 hover:bg-primary/10 transition-colors">
                    Yeni Simülasyon
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.header>

        {/* Content Area */}
        <div className="w-full relative">
          <AnimatePresence mode="wait">
            {simulationState === "idle" && (
              <motion.div 
                key="idle"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="max-w-4xl mx-auto"
              >
                <ProductForm onSubmit={handleSimulate} isLoading={false} />
              </motion.div>
            )}

            {simulationState === "loading" && (
              <motion.div 
                key="loading"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.4 }}
                className="py-10 flex justify-center"
              >
                <SimulationLogs motivation={currentMotivation} />
              </motion.div>
            )}

            {simulationState === "result" && resultData && (
              <motion.div 
                key="result"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <ResultDashboard data={resultData} />
              </motion.div>
            )}
          </AnimatePresence>
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
    </main>
  );
}
