"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { PurchaseMotivation } from "@/types";
import { cn } from "@/lib/utils";

// Mirrors the backend graph: input_analysis → research → benchmark → simulate → debate.
// Timing is approximate (the API returns once at the end); the last step waits for the response.
const STEPS = [
  { label: "Girdi kalitesi kontrol ediliyor", ms: 3000 },
  { label: "Rakipler aranıyor", ms: 6000 },
  { label: "Pazar karşılaştırması yazılıyor", ms: 12000 },
  { label: "500 sentetik tüketici karar veriyor", ms: 8000 },
  { label: "Personalar ürünü tartışıyor", ms: 0 },
];

export default function SimulationLogs({ motivation }: { motivation: PurchaseMotivation | null }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
    const timers: number[] = [];
    let elapsed = 0;
    STEPS.slice(0, -1).forEach((step, index) => {
      elapsed += step.ms;
      timers.push(window.setTimeout(() => setActive(index + 1), elapsed));
    });
    return () => timers.forEach(window.clearTimeout);
  }, [motivation]);

  return (
    <section className="card-paper mx-auto max-w-xl" aria-live="polite" aria-busy="true">
      <h2 className="squiggle text-[21px] font-bold">Simülasyon çalışıyor</h2>
      <p className="mt-2 text-sm text-muted-foreground">Gemini yoğunsa bu adım 1–2 dakika sürebilir.</p>
      <ol className="mt-5 space-y-3">
        {STEPS.map((step, index) => {
          const done = index < active;
          const current = index === active;
          return (
            <li key={step.label} className={cn("flex items-center gap-3", !done && !current && "text-muted-foreground")}>
              <span
                className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-blob border-2 font-display text-sm font-extrabold",
                  done ? "border-buy bg-buy text-card" : current ? "border-foreground bg-watch" : "border-border bg-card"
                )}
              >
                {done ? <Check className="h-4 w-4" aria-hidden /> : current ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : index + 1}
              </span>
              <span className={cn(current && "font-bold")}>{step.label}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
