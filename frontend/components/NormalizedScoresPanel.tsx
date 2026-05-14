"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { NormalizedProduct } from "@/types";
import { Ruler } from "lucide-react";

interface NormalizedScoresPanelProps {
  product: NormalizedProduct;
}

const scoreRows: Array<{
  key: keyof NormalizedProduct;
  label: string;
  risk?: boolean;
}> = [
  { key: "priceFit", label: "Fiyat Uyumu" },
  { key: "priceRisk", label: "Fiyat Riski", risk: true },
  { key: "qualityScore", label: "Kalite Algisi" },
  { key: "trendFit", label: "Trend Uyumu" },
  { key: "brandTrust", label: "Marka Guveni" },
  { key: "descriptionCompleteness", label: "Aciklama Detayi" },
  { key: "visualAppeal", label: "Gorsel Cekicilik" },
  { key: "seasonFit", label: "Mevsim Uyumu" },
  { key: "shippingReturnScore", label: "Kargo/Iade Skoru" },
  { key: "targetAudienceFit", label: "Hedef Kitle Uyumu" },
  { key: "differentiationScore", label: "Farklilasma" },
];

function getIndicatorColor(value: number, isRisk?: boolean) {
  const score = Math.round(value * 100);

  if (isRisk) {
    if (score >= 60) return "bg-destructive";
    if (score >= 35) return "bg-amber-500";
    return "bg-emerald-500";
  }

  if (score >= 70) return "bg-emerald-500";
  if (score >= 45) return "bg-primary";
  return "bg-destructive";
}

export default function NormalizedScoresPanel({ product }: NormalizedScoresPanelProps) {
  return (
    <Card className="border-border/50 dark:border-white/10 shadow-xl glass bg-card/60 backdrop-blur-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center gap-2">
          <Ruler className="w-5 h-5 text-amber-500" />
          Normalleştirilmiş Skorlar
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 pt-2">
          {scoreRows.map((row) => {
            const rawValue = product[row.key] ?? 0;
            const score = Math.round(rawValue * 100);

            return (
              <div key={row.key} className="space-y-2">
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-semibold text-foreground">{row.label}</span>
                  <span className="font-bold text-muted-foreground">%{score}</span>
                </div>
                <Progress
                  value={score}
                  className="h-2 bg-muted/70 dark:bg-white/10"
                  indicatorColor={getIndicatorColor(rawValue, row.risk)}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
