"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { InputAnalysisResponse } from "@/types";

interface AnalysisWarningProps {
  analysis: InputAnalysisResponse;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Accessible dialog: focus moves inside, Esc closes, Tab stays within (DESIGN.md §6). */
export default function AnalysisWarning({ analysis, onConfirm, onCancel }: AnalysisWarningProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.querySelector<HTMLElement>("[data-autofocus]")?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key !== "Tab" || !dialog) return;
      const focusable = dialog.querySelectorAll<HTMLElement>("button");
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [onCancel]);

  const suggestions = [
    ...analysis.suggestions,
    ...(analysis.suspectedCategory ? [`Kategori önerisi: ${analysis.suspectedCategory}`] : []),
    ...(analysis.correctedProductName ? [`İsim önerisi: ${analysis.correctedProductName}`] : []),
  ];

  return (
    <div className="fixed inset-0 z-100 grid place-items-center p-4">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-xs" onClick={onCancel} aria-hidden />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="analysis-warning-title"
        className="card-paper relative max-h-[90vh] w-full max-w-xl space-y-5 overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="analysis-warning-title" className="squiggle text-[21px] font-bold">Girdiyi bir kontrol et</h2>
            <p className="mt-2 text-sm text-muted-foreground">Ürün bilgilerinde sonucu zayıflatabilecek noktalar bulundu.</p>
          </div>
          <button type="button" onClick={onCancel} aria-label="Uyarıyı kapat" className="rounded-full p-1.5 hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        {analysis.warnings.length > 0 && (
          <div className="note-risk space-y-1.5">
            <b className="font-bold text-skip-text">Sorunlar</b>
            <ul className="list-disc space-y-1 pl-5">
              {analysis.warnings.map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="space-y-2">
            <b className="font-display font-bold">Öneriler</b>
            <ol className="space-y-2">
              {suggestions.map((s, i) => (
                <li key={i} className="flex gap-3 text-foreground-2">
                  <span className="num-badge">{i + 1}</span>
                  <span className="pt-0.5">{s}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <div className="flex flex-col gap-3 pt-1 sm:flex-row">
          <button type="button" onClick={onCancel} className="btn-sticker flex-1" data-autofocus>
            Vazgeç ve düzenle
          </button>
          <button type="button" onClick={onConfirm} className="btn-sticker-primary flex-1">
            Yine de devam et
          </button>
        </div>
      </div>
    </div>
  );
}
