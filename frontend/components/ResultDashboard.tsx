"use client";

import { useEffect, useState } from "react";
import { SimulationResponse } from "@/types";
import OverallScoreCard from "./OverallScoreCard";
import TopPersonaCards from "./TopPersonaCards";
import WeaknessList from "./WeaknessList";
import AiFeedbackPanel from "./AiFeedbackPanel";
import ProductTypeInsight from "./ProductTypeInsight";
import ChannelRecommendation from "./ChannelRecommendation";
import NormalizedScoresPanel from "./NormalizedScoresPanel";
import { DebateLogs } from "./DebateLogs";
import confetti from "canvas-confetti";
import { Zap, LayoutDashboard, MessageSquare } from "lucide-react";


import { motion, AnimatePresence, type Variants } from "framer-motion";

interface ResultDashboardProps {
  data: SimulationResponse | null;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function ResultDashboard({ data }: ResultDashboardProps) {
  const [activeTab, setActiveTab] = useState<"analysis" | "debate">("analysis");

  useEffect(() => {
    if (data) {
      const duration = 3 * 1000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#3b82f6', '#8b5cf6', '#ec4899']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#3b82f6', '#8b5cf6', '#ec4899']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [data]);

  if (!data) return null;

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 glass p-6 rounded-2xl border border-border/50">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
            Simülasyon <span className="text-gradient">Sonuçları</span>
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Yapay zeka ajanları ürününüzü pazar gerçekliğiyle test etti.</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-primary-foreground bg-primary/20 text-primary border border-primary/30 px-4 py-2 rounded-full shadow-[0_0_15px_rgba(var(--primary),0.3)]">
            {String(data.simulatedConsumers)} Tüketici Analiz Edildi
          </span>
        </div>
      </motion.div>

      {/* Tab Switcher */}
      <motion.div variants={itemVariants} className="flex p-1 bg-muted/30 dark:bg-black/40 backdrop-blur-xl border border-border/50 dark:border-white/10 rounded-2xl w-full max-w-md mx-auto shadow-sm">
        <button
          onClick={() => setActiveTab("analysis")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
            activeTab === "analysis" 
              ? "bg-primary text-white shadow-lg shadow-primary/20" 
              : "text-muted-foreground dark:text-white/50 hover:text-foreground dark:hover:text-white hover:bg-white/5"
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Pazar Analizi
        </button>
        <button
          onClick={() => setActiveTab("debate")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
            activeTab === "debate" 
              ? "bg-primary text-white shadow-lg shadow-primary/20" 
              : "text-muted-foreground dark:text-white/50 hover:text-foreground dark:hover:text-white hover:bg-white/5"
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Ajan Tartışması
          {data.debateLogs && (
            <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          )}
        </button>
      </motion.div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="min-h-[400px]"
        >
          {activeTab === "analysis" ? (
            <div className="space-y-6">
              {/* Image Gallery */}
              {data.images && data.images.length > 0 && (
                <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-4 glass rounded-2xl border border-border/30">
                  {data.images.map((url, idx) => (
                    <motion.div 
                      key={idx}
                      whileHover={{ scale: 1.05 }}
                      className="aspect-square rounded-xl overflow-hidden border border-border/50 shadow-md bg-background group relative"
                    >
                      <img src={url} alt={`Urun ${idx}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                  ))}
                </motion.div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-1 md:col-span-3">
                  <OverallScoreCard data={data} />
                </div>

                <div className="col-span-1 md:col-span-3">
                  <NormalizedScoresPanel product={data.normalizedProduct} />
                </div>

                {data.benchmarkAnalysis && (
                  <div className="col-span-1 md:col-span-3 p-6 glass rounded-2xl border border-blue-500/20 bg-blue-500/5">
                    <h3 className="text-lg font-bold text-blue-500 dark:text-blue-400 mb-3 flex items-center gap-2">
                      <Zap className="w-5 h-5" /> Pazar Rekabet Analizi (Benchmark)
                    </h3>
                    <div className="text-foreground/80 dark:text-white/80 whitespace-pre-wrap leading-relaxed italic">
                      {String(data.benchmarkAnalysis)}
                    </div>
                  </div>
                )}

                <ProductTypeInsight insight={data.aiInsights.productTypeInsight} />
                <ChannelRecommendation channels={data.aiInsights.channelRecommendation} />
                <WeaknessList weaknesses={data.weaknesses} />

                <div className="col-span-1 md:col-span-3">
                  <TopPersonaCards personas={data.topPersonas} allPersonas={data.allPersonas} insights={data.aiInsights} />
                </div>

                <div className="col-span-1 md:col-span-3">
                  <AiFeedbackPanel insights={data.aiInsights} />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {data.debateLogs && data.debateLogs.length > 0 ? (
                <div className="col-span-1 md:col-span-3">
                   <div className="mb-4 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm italic">
                    Ajanlar ürününüzün pazar başarısını, fiyatını ve potansiyelini kendi aralarında tartışıyor.
                  </div>
                  <DebateLogs logs={data.debateLogs} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-20 glass rounded-3xl border border-dashed border-white/10 text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                  <p>Bu simülasyon için henüz bir tartışma kaydı bulunamadı.</p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}
