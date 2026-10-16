"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToastState {
  tone: "error" | "info";
  message: string;
  onRetry?: () => void;
}

/** Bottom-centred sticker pill (DESIGN.md §4 "Durum toast'u"). */
export default function StatusToast({ toast, onClose }: { toast: ToastState | null; onClose: () => void }) {
  if (!toast) return null;
  const isError = toast.tone === "error";

  return (
    <div
      role={isError ? "alert" : "status"}
      className={cn(
        "no-print fixed bottom-6 left-1/2 z-50 flex max-w-[92vw] -translate-x-1/2 items-center gap-3 rounded-full border-2 bg-card px-4 py-2.5 text-sm font-semibold shadow-sticker-ink",
        isError ? "border-skip text-skip-text" : "border-foreground text-foreground"
      )}
    >
      <span>{toast.message}</span>
      {toast.onRetry && (
        <button type="button" onClick={toast.onRetry} className="btn-sticker !px-3 !py-1 text-xs">
          Tekrar dene
        </button>
      )}
      <button type="button" onClick={onClose} aria-label="Bildirimi kapat" className="rounded-full p-1 text-foreground/70 hover:bg-secondary">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
