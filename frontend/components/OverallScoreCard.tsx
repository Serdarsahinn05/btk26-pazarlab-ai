"use client";

import { Progress } from "@/components/ui/progress";

import { SimulationResponse } from "@/types";
import { Target, Users, Zap, Wrench } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface OverallScoreCardProps {
  data: SimulationResponse;
}

// Simple counter animation hook
function useCounter(end: number, duration: number = 2000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      
      // Easing function (easeOutExpo)
      const easePercentage = percentage === 1 ? 1 : 1 - Math.pow(2, -10 * percentage);
      
      setCount(Math.floor(end * easePercentage));
      
      if (percentage < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [end, duration]);

  return count;
}

export default function OverallScoreCard({ data }: OverallScoreCardProps) {
  const animatedScore = useCounter(data.overallScore, 2500);

  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-primary";
    if (score >= 50) return "text-amber-500";
    return "text-destructive";
  };

  const getGlowColor = (score: number) => {
    if (score >= 75) return "rgba(var(--primary), 0.5)";
    if (score >= 50) return "rgba(245, 158, 11, 0.5)";
    return "rgba(239, 68, 68, 0.5)";
  };

  const getProgressColorClass = (score: number) => {
    if (score >= 75) return "bg-primary";
    if (score >= 50) return "bg-amber-500";
    return "bg-destructive";
  };

  return (
    <div className="bento-card border-primary/20 glow-blue group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-primary/20 transition-colors duration-700" />
      
      <div className="pb-6">
        <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
          <Zap className="w-6 h-6 text-primary glow-blue" />
          PAZAR POTANSİYELİ ANALİZİ
        </h3>
      </div>
      
      <div className="flex flex-col md:flex-row items-center gap-12 py-4 relative z-10">
        {/* Büyük Ana Skor */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          className="flex-shrink-0 flex flex-col items-center justify-center p-6 bg-black/40 rounded-full border border-white/10 w-52 h-52 relative"
        >
          <motion.div 
            animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.1, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 rounded-full -z-10 blur-2xl"
            style={{ backgroundColor: getGlowColor(data.overallScore) }}
          />
          
          <span className="text-[10px] font-bold text-muted-foreground mb-1 tracking-widest uppercase">Genel Puan</span>
          <div className={`text-8xl font-black tracking-tighter ${getScoreColor(data.overallScore)}`} style={{ textShadow: `0 0 30px ${getGlowColor(data.overallScore)}` }}>
            {animatedScore}
          </div>
          <span className="text-xs font-bold text-muted-foreground/60 mt-1 uppercase tracking-widest">/ 100 Skor</span>
        </motion.div>

        {/* Yan Skorlar */}
        <div className="flex-grow grid grid-cols-1 sm:grid-cols-3 gap-6 w-full">
          <motion.div whileHover={{ y: -5 }} className="space-y-4 p-5 bg-white/5 rounded-2xl border border-white/5 shadow-xl backdrop-blur-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-500" />
                Pazar Genişliği
              </span>
              <span className={`text-lg font-black ${getScoreColor(data.marketBreadthScore)}`}>
                {data.marketBreadthScore}
              </span>
            </div>
            <Progress value={data.marketBreadthScore} className="h-1.5 bg-white/5" indicatorColor={getProgressColorClass(data.marketBreadthScore)} />
            <p className="text-[10px] text-muted-foreground leading-tight">Erişilebilir toplam talep skoru.</p>
          </motion.div>

          <motion.div whileHover={{ y: -5 }} className="space-y-4 p-5 bg-white/5 rounded-2xl border border-white/5 shadow-xl backdrop-blur-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-500" />
                Satın Alma Niyeti
              </span>
              <span className={`text-lg font-black ${getScoreColor(data.intentConversionScore)}`}>
                {data.intentConversionScore}
              </span>
            </div>
            <Progress value={data.intentConversionScore} className="h-1.5 bg-white/5" indicatorColor={getProgressColorClass(data.intentConversionScore)} />
            <p className="text-[10px] text-muted-foreground leading-tight">Üretilen psikolojik satın alma niyeti.</p>
          </motion.div>

          <motion.div whileHover={{ y: -5 }} className="space-y-4 p-5 bg-white/5 rounded-2xl border border-white/5 shadow-xl backdrop-blur-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-500" />
                İhtiyaç Uyumu
              </span>
              <span className={`text-lg font-black ${getScoreColor(data.problemSolutionFit)}`}>
                {data.problemSolutionFit}
              </span>
            </div>
            <Progress value={data.problemSolutionFit} className="h-1.5 bg-white/5" indicatorColor={getProgressColorClass(data.problemSolutionFit)} />
            <p className="text-[10px] text-muted-foreground leading-tight">Problem-çözüm eşleşme kalitesi.</p>
          </motion.div>
        </div>
      </div>
    </div>

  );
}
