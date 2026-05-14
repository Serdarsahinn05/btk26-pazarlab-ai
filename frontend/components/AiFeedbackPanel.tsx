"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AiInsights } from "@/types";
import { CalendarDays, CheckCircle2, FileText, Megaphone, Sparkles, Tags } from "lucide-react";

interface AiFeedbackPanelProps {
  insights: AiInsights;
}

export default function AiFeedbackPanel({ insights }: AiFeedbackPanelProps) {
  return (
    <Card className="col-span-1 md:col-span-2 border-indigo-500/20 shadow-md">
      <CardHeader className="pb-2 bg-indigo-50/50 dark:bg-indigo-950/20 border-b border-border/50 rounded-t-xl">
        <CardTitle className="text-xl flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
          <Sparkles className="w-5 h-5" />
          AI Satis Recetesi & Oneriler
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-6">
        <div className="bg-muted/50 p-4 rounded-lg border border-border/50 text-base text-foreground font-medium leading-relaxed">
          &quot;{insights.summary}&quot;
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="font-bold text-base text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Aksiyon Plani
            </h4>
            <ul className="space-y-2">
              {insights.salesRecipe.map((step, index) => (
                <li key={index} className="flex items-start gap-3 text-base bg-background p-3 rounded border border-border/50 leading-relaxed">
                  <span className="bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold rounded-full w-7 h-7 flex items-center justify-center text-sm shrink-0 mt-0.5">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-base text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              Onerilen Aciklama
            </h4>
            <div className="bg-background p-4 rounded border border-border/50 text-base text-foreground/85 leading-relaxed h-full">
              {insights.improvedDescription}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/50 mt-4">
          <div className="bg-background p-3 rounded border border-border/50">
            <span className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-1.5">
              <Tags className="h-4 w-4" />
              Fiyatlandirma
            </span>
            <p className="text-sm mt-2 font-medium leading-relaxed">{insights.pricingAdvice}</p>
          </div>
          <div className="bg-background p-3 rounded border border-border/50">
            <span className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              Sezon
            </span>
            <p className="text-sm mt-2 font-medium leading-relaxed">{insights.seasonAdvice}</p>
          </div>
          <div className="bg-background p-3 rounded border border-border/50">
            <span className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-1.5">
              <Megaphone className="h-4 w-4" />
              Pazarlama
            </span>
            <p className="text-sm mt-2 font-medium leading-relaxed">{insights.marketingAdvice}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
