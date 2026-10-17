"use client";

import { Loader2, Sparkles } from "lucide-react";
import type { DraftCheckResponse } from "@/types";
import { cn } from "@/lib/utils";

/* "Hazırlık" panel of the product form (Faz 13b): live estimate from /api/draft-check (no AI),
   the inputs that would raise it most, what is still required, and the submit button. */

const MAX_GAINS = 5;

export const formatGain = (delta: number) => `+${delta.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`;

function handNote(score: number) {
  if (score >= 60) return "satışa yakın!";
  if (score >= 45) return "biraz cila lazım";
  return "önce düzelt";
}

interface ReadinessProps {
  check: DraftCheckResponse | null;
  checking: boolean;
  failed: boolean;
  missing: string[];
  /** Show input warnings only once the form has real content; an empty draft warns about everything. */
  showWarnings: boolean;
  isLoading: boolean;
  savedAt: number | null;
  restored: boolean;
  onGainClick: (field: string) => void;
  onClear: () => void;
}

export default function ReadinessPanel(props: ReadinessProps) {
  const { check, checking, failed, missing, showWarnings, isLoading, savedAt, restored, onGainClick, onClear } = props;
  const score = check?.score ?? null;
  const gains = (check?.gains ?? []).slice(0, MAX_GAINS);

  return (
    <aside id="readiness" aria-labelledby="readiness-title" className="card-paper flex flex-col gap-4 lg:sticky lg:top-24">
      <div className="flex items-center justify-between gap-2">
        <h2 id="readiness-title" className="squiggle text-[21px] font-bold">Hazırlık</h2>
        {checking && score !== null && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> güncelleniyor
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2" aria-live="polite">
        <div className="relative flex items-baseline gap-1">
          <span className="font-display text-[46px] font-extrabold leading-none tracking-tight">{score ?? "–"}</span>
          <span className="text-sm font-semibold text-muted-foreground">/100 tahmini skor</span>
          {score !== null && (
            <span aria-hidden className="pointer-events-none absolute -top-1 right-0 rotate-[6deg] font-hand text-[22px] leading-none text-foreground-2">
              {handNote(score)}
            </span>
          )}
        </div>
        <div className="bar-track" aria-hidden>
          <div className="bar-fill" style={{ width: `${Math.max(2, score ?? 0)}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">
          {score === null
            ? "Fiyatı girince tahmin başlar."
            : "Aynı 500 kişiyle, AI yorumları olmadan hızlı hesap; sonuç ekranındaki skora çok yakındır."}
          {failed && " Tahmin şu an güncellenemedi."}
        </p>
      </div>

      {check?.cap && (
        <div className="note-risk flex flex-col gap-1.5">
          <p>
            <b className="font-bold text-foreground">Skor şu an en fazla {check.cap.limit}.</b> {check.cap.reason}
          </p>
          {showWarnings && check.warnings.length > 0 && (
            <ul className="list-disc pl-4 text-foreground-2">
              {check.warnings.slice(0, 3).map((w) => <li key={w}>{w}</li>)}
            </ul>
          )}
        </div>
      )}

      {gains.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-bold text-foreground-2">En çok kazandıracaklar</h3>
          <ul className="flex flex-col gap-1.5">
            {gains.map((gain) => (
              <li key={gain.field}>
                <button
                  type="button"
                  onClick={() => onGainClick(gain.field)}
                  className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border-2 border-border bg-card px-3 text-left text-sm font-bold transition-colors hover:bg-secondary"
                >
                  <span>{gain.label}</span>
                  <span className="font-display text-base font-extrabold text-buy-text">{formatGain(gain.delta)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {missing.length > 0 && (
        <p className="text-sm text-foreground-2">
          <b className="font-bold">Doldurulması gereken:</b> {missing.join(", ")}
        </p>
      )}

      <button type="submit" disabled={isLoading} className="btn-sticker-primary w-full justify-center py-3 text-base">
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Sparkles className="h-5 w-5" aria-hidden />}
        {isLoading ? "Hazırlanıyor…" : "Simülasyonu başlat"}
      </button>

      <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
        {savedAt ? (restored ? "Kaldığın yerden devam ediyorsun; taslak bu tarayıcıda saklanıyor." : "Taslak bu tarayıcıda saklanıyor.") : "Yazdıkların bu tarayıcıda taslak olarak saklanır."}
        {savedAt && (
          <button type="button" onClick={onClear} className="font-bold text-accent underline-offset-2 hover:underline">
            Formu temizle
          </button>
        )}
      </p>
    </aside>
  );
}

/** Phones: the panel sits at the end of the form; this bar keeps the estimate and the button in reach. */
export function ReadinessBar({ score, gainCount, isLoading }: { score: number | null; gainCount: number; isLoading: boolean }) {
  return (
    <div className="no-print sticky bottom-3 z-30 flex items-center justify-between gap-3 rounded-wobble-lg border-2 border-foreground bg-card px-4 py-2.5 shadow-sticker-ink lg:hidden">
      <a href="#readiness" className="flex min-h-11 flex-col justify-center leading-tight">
        <span className="font-display text-lg font-extrabold">
          {score ?? "–"}<small className="text-xs font-semibold text-muted-foreground">/100</small>
        </span>
        <span className={cn("text-xs font-bold", gainCount ? "text-accent" : "text-muted-foreground")}>
          {gainCount ? `${gainCount} öneri` : "tahmini skor"}
        </span>
      </a>
      <button type="submit" disabled={isLoading} className="btn-sticker-primary min-h-11 px-5">
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
        {isLoading ? "Hazırlanıyor…" : "Başlat"}
      </button>
    </div>
  );
}
