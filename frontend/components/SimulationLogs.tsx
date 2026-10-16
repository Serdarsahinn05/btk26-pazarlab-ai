"use client";

import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Same order and ids as the backend graph (app/services/graph.py STEP_LABELS).
export const SIMULATION_STEPS = [
  { id: "input_analysis", label: "Girdi kalitesi kontrol ediliyor" },
  { id: "research", label: "Rakipler aranıyor" },
  { id: "benchmark", label: "Pazar karşılaştırması yazılıyor" },
  { id: "simulate", label: "500 sentetik tüketici karar veriyor" },
  { id: "debate", label: "Personalar ürünü tartışıyor" },
] as const;

/** Live progress driven by /api/simulate/stream step events. */
export default function SimulationLogs({ done }: { done: string[] }) {
  const activeIndex = SIMULATION_STEPS.findIndex((s) => !done.includes(s.id));

  return (
    <section className="card-paper mx-auto max-w-xl" aria-live="polite" aria-busy="true">
      <h2 className="squiggle text-[21px] font-bold">Simülasyon çalışıyor</h2>
      <p className="mt-2 text-sm text-muted-foreground">Adımlar gerçek zamanlı ilerler. Gemini yoğunsa 1–2 dakika sürebilir.</p>
      <ol className="mt-5 space-y-3">
        {SIMULATION_STEPS.map((step, index) => {
          const isDone = done.includes(step.id);
          const current = index === activeIndex;
          return (
            <li key={step.id} className={cn("flex items-center gap-3", !isDone && !current && "text-muted-foreground")}>
              <span
                className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-blob border-2 font-display text-sm font-extrabold",
                  isDone ? "border-buy bg-buy text-card" : current ? "border-foreground bg-watch" : "border-border bg-card"
                )}
              >
                {isDone ? <Check className="h-4 w-4" aria-hidden /> : current ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : index + 1}
              </span>
              <span className={cn(current && "font-bold")}>{step.label}</span>
              <span className="sr-only">{isDone ? "tamamlandı" : current ? "devam ediyor" : "bekliyor"}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
