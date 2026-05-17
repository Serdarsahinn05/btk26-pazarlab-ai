"use client";

import { DecisionDistribution } from "@/types";
import { BarChart3 } from "lucide-react";

interface DecisionDistributionChartProps {
  distribution?: DecisionDistribution;
  total: number;
}

const rows = [
  { key: "buy", label: "Aldı", color: "bg-emerald-500", textColor: "text-emerald-400" },
  { key: "watch", label: "Kararsız", color: "bg-amber-500", textColor: "text-amber-400" },
  { key: "skip", label: "Almadı", color: "bg-red-500", textColor: "text-red-400" },
] as const;

export default function DecisionDistributionChart({ distribution, total }: DecisionDistributionChartProps) {
  const fallbackDistribution = {
    buy: 0,
    watch: 0,
    skip: 0,
    ...distribution,
  };
  const calculatedTotal = total || fallbackDistribution.buy + fallbackDistribution.watch + fallbackDistribution.skip || 1;

  return (
    <div className="bento-card border-border/50 dark:border-white/10 bg-card/60 backdrop-blur-xl">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between mb-6">
        <div>
          <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            500 Bot Karar Dağılımı
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Her botun satın alma eğilimine göre üretilen sonuç özeti.
          </p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {calculatedTotal} sentetik tüketici
        </span>
      </div>

      <div className="space-y-4">
        {rows.map((row) => {
          const count = fallbackDistribution[row.key];
          const percentage = Math.round((count / calculatedTotal) * 100);

          return (
            <div key={row.key} className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-bold text-foreground">{row.label}</span>
                <span className={`text-sm font-black ${row.textColor}`}>
                  {count} bot / %{percentage}
                </span>
              </div>
              <div className="h-3 rounded-full bg-muted/70 dark:bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full ${row.color}`}
                  style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
