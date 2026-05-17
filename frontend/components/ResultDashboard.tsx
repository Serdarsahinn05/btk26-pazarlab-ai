"use client";

import { useEffect } from "react";
import { SimulationResponse } from "@/types";
import OverallScoreCard from "./OverallScoreCard";
import TopPersonaCards from "./TopPersonaCards";
import WeaknessList from "./WeaknessList";
import ProductTypeInsight from "./ProductTypeInsight";
import ChannelRecommendation from "./ChannelRecommendation";
import NormalizedScoresPanel from "./NormalizedScoresPanel";
import { DebateLogs } from "./DebateLogs";
import DecisionDistributionChart from "./DecisionDistributionChart";
import confetti from "canvas-confetti";
import { Zap, MessageSquare, Search } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { motion, AnimatePresence, type Variants } from "framer-motion";

interface ResultDashboardProps {
  data: SimulationResponse | null;
  view: "analysis" | "debate" | "benchmark";
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

export default function ResultDashboard({ data, view }: ResultDashboardProps) {

  useEffect(() => {
    if (data && view === "analysis") {
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
  }, [data, view]);

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

      {/* Image Gallery - Moved outside AnimatePresence to stay visible */}
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

      {/* Content Section */}
      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="min-h-[400px]"
        >
          {view === "analysis" ? (
            <div className="space-y-6">


              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="col-span-1 md:col-span-3">
                  <OverallScoreCard data={data} />
                </div>

                <div className="col-span-1 md:col-span-3">
                  <DecisionDistributionChart distribution={data.decisionDistribution} total={data.simulatedConsumers} />
                </div>

                <div className="col-span-1 md:col-span-3">
                  <NormalizedScoresPanel product={data.normalizedProduct} />
                </div>



                <ProductTypeInsight insight={data.aiInsights.productTypeInsight} />
                <ChannelRecommendation channels={data.aiInsights.channelRecommendation} />
                <WeaknessList weaknesses={data.weaknesses} />

                <div className="col-span-1 md:col-span-3">
                  <TopPersonaCards personas={data.topPersonas} allPersonas={data.allPersonas} insights={data.aiInsights} />
                </div>
              </div>
            </div>

          ) : view === "benchmark" ? (
            <div className="space-y-6">
              {data.benchmarkAnalysis ? (
                <div className="bento-card border-blue-500/20 bg-blue-500/5 p-8">
                  <div className="flex items-center gap-3 mb-8 pb-4 border-b border-blue-500/10">
                    <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 shadow-lg shadow-blue-500/10">
                      <Zap className="w-6 h-6 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black tracking-tighter text-blue-500">PAZAR REKABET ANALİZİ</h3>
                      <p className="text-[10px] uppercase font-bold tracking-widest text-blue-400/70">AI Benchmark Engine v1.0</p>
                    </div>
                  </div>
                  
                  <div className="prose prose-invert prose-blue max-w-none 
                    prose-p:text-sm prose-p:leading-relaxed prose-p:text-foreground/90
                    prose-strong:text-blue-400 prose-strong:font-black
                    prose-ul:text-sm prose-li:my-1
                    prose-hr:border-blue-500/20
                  ">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {data.benchmarkAnalysis}
                    </ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-20 glass rounded-3xl border border-dashed border-white/10 text-muted-foreground">
                   <Search className="w-12 h-12 mb-4 opacity-20" />
                   <p>Bu ürün için henüz pazar rekabet verisi toplanmadı.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">

              {data.debateLogs && data.debateLogs.length > 0 ? (
                <div className="col-span-1 md:col-span-3">
                   <div className="mb-4 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm italic">
                    Ajanlar ürününüzün pazar başarısını, fiyatını ve potansiyelini kendi aralarında tartışıyor.
                  </div>
                  <DebateLogs logs={data.debateLogs} personas={data.allPersonas?.length ? data.allPersonas : data.topPersonas} />
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
