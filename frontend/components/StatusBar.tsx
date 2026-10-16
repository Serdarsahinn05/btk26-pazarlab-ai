"use client";

import { useEffect, useState } from "react";
import { Cpu, Search, Wifi, WifiOff } from "lucide-react";
import { checkHealth } from "@/lib/api";
import { HealthStatus } from "@/types";

const POLL_MS = 30_000;

/** Footer with real backend status from /api/health (no hard-coded values). */
export default function StatusBar() {
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

  const online = !!health;
  const aiLabel = !health ? "—" : health.ai.configured ? health.ai.model ?? "AI hazır" : "AI kapalı (anahtar yok)";

  return (
    <footer className="h-8 border-t border-border bg-card/50 backdrop-blur-md flex items-center gap-4 px-4 text-xs font-mono text-muted-foreground z-50 overflow-hidden whitespace-nowrap">
      <div className="flex items-center gap-1.5" aria-live="polite">
        {health === undefined ? (
          <span>API kontrol ediliyor…</span>
        ) : online ? (
          <>
            <Wifi className="w-3 h-3 text-emerald-500" aria-hidden />
            <span>API çevrimiçi</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3 h-3 text-destructive" aria-hidden />
            <span>API&apos;ye ulaşılamıyor</span>
          </>
        )}
      </div>
      {online && (
        <>
          <div className="flex items-center gap-1.5 truncate">
            <Cpu className="w-3 h-3 shrink-0" aria-hidden />
            <span className="truncate">{aiLabel}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <Search className="w-3 h-3" aria-hidden />
            <span>{health.research.configured ? "Rakip araması açık" : "Rakip araması kapalı"}</span>
          </div>
        </>
      )}
    </footer>
  );
}
