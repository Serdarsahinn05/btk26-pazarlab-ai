"use client";

import { X } from "lucide-react";

export interface ToastState {
  tone: "error" | "info";
  message: string;
  onRetry?: () => void;
}

/** Bottom-centred status pill (DESIGN.md §5 "Durum toast'u"). */
export default function StatusToast({ toast, onClose }: { toast: ToastState | null; onClose: () => void }) {
  if (!toast) return null;
  const isError = toast.tone === "error";

  return (
    <div
      role={isError ? "alert" : "status"}
      className={`fixed bottom-6 left-1/2 z-50 flex max-w-[92vw] -translate-x-1/2 items-center gap-3 rounded-full border px-4 py-2.5 font-mono text-xs shadow-lg ${
        isError ? "border-destructive/50 bg-destructive/90 text-destructive-foreground" : "border-border bg-card text-foreground"
      }`}
    >
      <span>{toast.message}</span>
      {toast.onRetry && (
        <button
          type="button"
          onClick={toast.onRetry}
          className="rounded-full bg-background/90 px-3 py-1 font-bold text-foreground hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Tekrar dene
        </button>
      )}
      <button type="button" onClick={onClose} aria-label="Bildirimi kapat" className="opacity-70 hover:opacity-100">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
