"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SimulationResponse } from "@/types";
import { Target, Users, Zap, Wrench } from "lucide-react";

interface OverallScoreCardProps {
  data: SimulationResponse;
}

export default function OverallScoreCard({ data }: OverallScoreCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 75) return "text-green-500";
    if (score >= 50) return "text-amber-500";
    return "text-red-500";
  };

  const getProgressColorClass = (score: number) => {
    if (score >= 75) return "bg-green-500";
    if (score >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <Card className="col-span-1 md:col-span-3 border-primary/20 shadow-md bg-gradient-to-br from-card to-muted/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center gap-2">
          <Zap className="w-6 h-6 text-primary" />
          Pazar Potansiyeli Analizi
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center gap-8 py-4">
          
          {/* Büyük Ana Skor */}
          <div className="flex-shrink-0 flex flex-col items-center justify-center p-6 bg-background rounded-full border-4 border-primary/20 w-48 h-48 shadow-inner">
            <span className="text-sm font-medium text-muted-foreground mb-1 text-center">Genel Satış Potansiyeli</span>
            <div className={`text-6xl font-black tracking-tighter ${getScoreColor(data.overallScore)}`}>
              {data.overallScore}
            </div>
            <span className="text-sm font-bold text-muted-foreground mt-1">/ 100</span>
          </div>

          {/* Yan Skorlar */}
          <div className="flex-grow grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
            
            <div className="space-y-3 p-4 bg-background rounded-xl border border-border/50 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-500" />
                  Pazar Genişliği
                </span>
                <span className={`font-bold ${getScoreColor(data.marketBreadthScore)}`}>
                  {data.marketBreadthScore}%
                </span>
              </div>
              <Progress value={data.marketBreadthScore} className={`h-2`} indicatorColor={getProgressColorClass(data.marketBreadthScore)} />
              <p className="text-xs text-muted-foreground">Kategorideki toplam potansiyel alıcı havuzu.</p>
            </div>

            <div className="space-y-3 p-4 bg-background rounded-xl border border-border/50 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-500" />
                  Niyetli Alıcı Dönüşümü
                </span>
                <span className={`font-bold ${getScoreColor(data.intentConversionScore)}`}>
                  {data.intentConversionScore}%
                </span>
              </div>
              <Progress value={data.intentConversionScore} className="h-2" indicatorColor={getProgressColorClass(data.intentConversionScore)} />
              <p className="text-xs text-muted-foreground">Ürün sayfasına girenlerin alma eğilimi.</p>
            </div>

            <div className="space-y-3 p-4 bg-background rounded-xl border border-border/50 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-500" />
                  Problem Çözüm Uyumu
                </span>
                <span className={`font-bold ${getScoreColor(data.problemSolutionFit)}`}>
                  {data.problemSolutionFit}%
                </span>
              </div>
              <Progress value={data.problemSolutionFit} className="h-2" indicatorColor={getProgressColorClass(data.problemSolutionFit)} />
              <p className="text-xs text-muted-foreground">İhtiyacı olan kullanıcının sorununu çözme skoru.</p>
            </div>

          </div>
        </div>
      </CardContent>
    </Card>
  );
}
