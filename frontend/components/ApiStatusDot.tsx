"use client";

import { useEffect, useState } from "react";
import { checkHealth } from "@/lib/api";
import { HealthStatus } from "@/types";
import { cn } from "@/lib/utils";

const POLL_MS = 30_000;

/** Real backend status from /api/health; the details sit in the tooltip / screen-reader text. */
export default function ApiStatusDot() {
  const [health, setHealth] = useState<HealthStatus | null | undefined>(undefined);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      const result = await checkHealth();
      if (alive) setHealth(result);
    };
    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, []);

  const state = health === undefined ? "checking" : !health ? "down" : health.ai.configured ? "ok" : "no-ai";
  const label = {
    checking: "API kontrol ediliyor",
    down: "API'ye ulaşılamıyor",
    "no-ai": "API çevrimiçi · AI kapalı",
    ok: "API çevrimiçi",
  }[state];
  const detail = health
    ? [
        health.ai.configured ? `Model: ${health.ai.model ?? "ilk istekte seçilecek"}` : "GEMINI_API_KEY yok: kural tabanlı tavsiye",
        health.research.configured ? "Rakip araması açık" : "Rakip araması kapalı",
      ].join(" · ")
    : "";

  return (
    <span className="flex items-center gap-2 text-xs font-bold text-foreground-2" title={detail || label} aria-live="polite">
      <span
        aria-hidden
        className={cn(
          "h-2.5 w-2.5 rounded-full border border-foreground/40",
          state === "ok" && "bg-buy",
          state === "no-ai" && "bg-watch",
          state === "down" && "bg-skip",
          state === "checking" && "animate-pulse bg-muted-foreground"
        )}
      />
      <span className="hidden md:inline">{label}</span>
      <span className="sr-only">{detail}</span>
    </span>
  );
}
