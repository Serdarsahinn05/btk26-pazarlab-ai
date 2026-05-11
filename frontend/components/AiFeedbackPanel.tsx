"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AiInsights } from "@/types";
import { Sparkles, FileText, CheckCircle2 } from "lucide-react";

interface AiFeedbackPanelProps {
  insights: AiInsights;
}

export default function AiFeedbackPanel({ insights }: AiFeedbackPanelProps) {
  return (
    <Card className="col-span-1 md:col-span-2 border-indigo-500/20 shadow-md">
      <CardHeader className="pb-2 bg-indigo-50/50 dark:bg-indigo-950/20 border-b border-border/50 rounded-t-xl">
        <CardTitle className="text-xl flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
          <Sparkles className="w-5 h-5" />
          AI Satış Reçetesi & Öneriler
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-6">
        
        {/* Özet */}
        <div className="bg-muted/50 p-4 rounded-lg border border-border/50 text-foreground font-medium">
          &quot;{insights.summary}&quot;
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Satış Reçetesi */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Aksiyon Planı
            </h4>
            <ul className="space-y-2">
              {insights.salesRecipe.map((step, index) => (
                <li key={index} className="flex items-start gap-2 text-sm bg-background p-2 rounded border border-border/50">
                  <span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold rounded-full w-5 h-5 flex items-center justify-center text-xs shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* İyileştirilmiş Açıklama */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-500" />
              Önerilen Açıklama
            </h4>
            <div className="bg-background p-3 rounded border border-border/50 text-sm text-muted-foreground italic h-full">
              {insights.improvedDescription}
            </div>
          </div>
        </div>

        {/* Diğer Öneriler */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/50 mt-4">
          <div className="bg-background p-3 rounded border border-border/50">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Fiyatlandırma</span>
            <p className="text-xs mt-1 font-medium">{insights.pricingAdvice}</p>
          </div>
          <div className="bg-background p-3 rounded border border-border/50">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Sezon</span>
            <p className="text-xs mt-1 font-medium">{insights.seasonAdvice}</p>
          </div>
          <div className="bg-background p-3 rounded border border-border/50">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Pazarlama</span>
            <p className="text-xs mt-1 font-medium">{insights.marketingAdvice}</p>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
