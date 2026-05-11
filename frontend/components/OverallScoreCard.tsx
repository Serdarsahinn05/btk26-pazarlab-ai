"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="col-span-1 md:col-span-3 border-border/50 dark:border-white/10 shadow-2xl glass bg-card/60 backdrop-blur-xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[100px] pointer-events-none group-hover:bg-primary/20 transition-colors duration-700" />
      
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center gap-2">
          <Zap className="w-6 h-6 text-primary" />
          Pazar Potansiyeli Analizi
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center gap-8 py-4 relative z-10">
          
          {/* Büyük Ana Skor */}
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="flex-shrink-0 flex flex-col items-center justify-center p-6 bg-black/5 dark:bg-black/40 rounded-full border border-border/50 dark:border-white/10 w-48 h-48 relative"
          >
            {/* Pulsing Glow behind the circle */}
            <motion.div 
              animate={{ opacity: [0.5, 0.8, 0.5], scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 rounded-full -z-10 blur-xl"
              style={{ backgroundColor: getGlowColor(data.overallScore) }}
            />
            
            <span className="text-sm font-medium text-muted-foreground mb-1 text-center">Genel Puan</span>
            <div className={`text-7xl font-black tracking-tighter ${getScoreColor(data.overallScore)}`} style={{ textShadow: `0 0 20px ${getGlowColor(data.overallScore)}` }}>
              {animatedScore}
            </div>
            <span className="text-sm font-bold text-muted-foreground mt-1">/ 100</span>
          </motion.div>

          {/* Yan Skorlar */}
          <div className="flex-grow grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
            
            <motion.div whileHover={{ y: -5 }} className="space-y-3 p-4 bg-black/5 dark:bg-black/40 rounded-xl border border-border/50 dark:border-white/5 shadow-lg backdrop-blur-md transition-all">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-500" />
                  Pazar Genişliği
                </span>
                <span className={`font-bold ${getScoreColor(data.marketBreadthScore)}`}>
                  {data.marketBreadthScore}%
                </span>
              </div>
              <Progress value={data.marketBreadthScore} className="h-2 bg-muted dark:bg-white/5" indicatorColor={getProgressColorClass(data.marketBreadthScore)} />
              <p className="text-xs text-muted-foreground">Kategorideki toplam potansiyel alıcı havuzu.</p>
            </motion.div>

            <motion.div whileHover={{ y: -5 }} className="space-y-3 p-4 bg-black/5 dark:bg-black/40 rounded-xl border border-border/50 dark:border-white/5 shadow-lg backdrop-blur-md transition-all">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-500" />
                  Niyetli Dönüşüm
                </span>
                <span className={`font-bold ${getScoreColor(data.intentConversionScore)}`}>
                  {data.intentConversionScore}%
                </span>
              </div>
              <Progress value={data.intentConversionScore} className="h-2 bg-muted dark:bg-white/5" indicatorColor={getProgressColorClass(data.intentConversionScore)} />
              <p className="text-xs text-muted-foreground">Ürün sayfasına girenlerin alma eğilimi.</p>
            </motion.div>

            <motion.div whileHover={{ y: -5 }} className="space-y-3 p-4 bg-black/5 dark:bg-black/40 rounded-xl border border-border/50 dark:border-white/5 shadow-lg backdrop-blur-md transition-all">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-500" />
                  Problem / Çözüm
                </span>
                <span className={`font-bold ${getScoreColor(data.problemSolutionFit)}`}>
                  {data.problemSolutionFit}%
                </span>
              </div>
              <Progress value={data.problemSolutionFit} className="h-2 bg-muted dark:bg-white/5" indicatorColor={getProgressColorClass(data.problemSolutionFit)} />
              <p className="text-xs text-muted-foreground">İhtiyacı olan kullanıcının sorununu çözme skoru.</p>
            </motion.div>

          </div>
        </div>
      </CardContent>
    </Card>
  );
}
