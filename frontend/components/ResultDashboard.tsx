"use client";

import { useEffect } from "react";
import { SimulationResponse } from "@/types";
import OverallScoreCard from "./OverallScoreCard";
import TopPersonaCards from "./TopPersonaCards";
import WeaknessList from "./WeaknessList";
import AiFeedbackPanel from "./AiFeedbackPanel";
import ProductTypeInsight from "./ProductTypeInsight";
import ChannelRecommendation from "./ChannelRecommendation";
import confetti from "canvas-confetti";
import { motion, type Variants } from "framer-motion";

interface ResultDashboardProps {
  data: SimulationResponse | null;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function ResultDashboard({ data }: ResultDashboardProps) {
  useEffect(() => {
    if (data) {
      // Fire confetti when results load
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
      <motion.div variants={itemVariants} className="flex items-center justify-between glass p-4 rounded-xl border border-border/50">
        <h2 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-2">
          Simülasyon <span className="text-gradient">Sonuçları</span>
        </h2>
        <span className="text-sm text-primary-foreground font-medium bg-primary px-4 py-2 rounded-full shadow-[0_0_15px_rgba(var(--primary),0.5)]">
          {data.simulatedConsumers} Tüketici Analiz Edildi
        </span>
      </motion.div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* En üst skorlar */}
        <motion.div variants={itemVariants} className="col-span-1 md:col-span-3">
          <OverallScoreCard data={data} />
        </motion.div>
        
        {/* Karakteristik ve Kanallar (Yeni Küçük Kartlar) */}
        <motion.div variants={itemVariants}>
          <ProductTypeInsight insight={data.aiInsights.productTypeInsight} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <ChannelRecommendation channels={data.aiInsights.channelRecommendation} />
        </motion.div>
        <motion.div variants={itemVariants} className="col-span-1">
          <WeaknessList weaknesses={data.weaknesses} />
        </motion.div>

        {/* Personalar */}
        <motion.div variants={itemVariants} className="col-span-1 md:col-span-3">
          <TopPersonaCards personas={data.topPersonas} />
        </motion.div>

        {/* AI Reçetesi */}
        <motion.div variants={itemVariants} className="col-span-1 md:col-span-3">
          <AiFeedbackPanel insights={data.aiInsights} />
        </motion.div>
      </div>
    </motion.div>
  );
}
