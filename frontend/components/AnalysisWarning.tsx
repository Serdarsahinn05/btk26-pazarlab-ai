"use client";

import { InputAnalysisResponse } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Lightbulb, ArrowRight, X, CheckCircle2, Info } from "lucide-react";
import { Button } from "./ui/button";

interface AnalysisWarningProps {
  analysis: InputAnalysisResponse;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function AnalysisWarning({ analysis, onConfirm, onCancel }: AnalysisWarningProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
      />

      {/* Modal Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl glass"
      >
        {/* Header Decoration */}
        <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500" />
        
        <div className="p-6 sm:p-8 space-y-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">Girdi Analizi Uyarısı</h2>
                <p className="text-sm text-muted-foreground">AI, verilerinizde bazı tutarsızlıklar tespit etti.</p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="rounded-full p-2 text-muted-foreground hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid gap-6">
            {/* Warnings Section */}
            {analysis.warnings.length > 0 && (
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-500">
                  <Info className="h-4 w-4" />
                  Tespit Edilen Sorunlar
                </h3>
                <div className="space-y-2">
                  {analysis.warnings.map((warning, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-200/80"
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                      {warning}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggestions & Corrections */}
            {(analysis.suggestions.length > 0 || analysis.suspectedCategory || analysis.correctedProductName) && (
              <div className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-400">
                  <Lightbulb className="h-4 w-4" />
                  İyileştirme Önerileri
                </h3>
                <div className="grid gap-2">
                  {analysis.suggestions.map((suggestion, idx) => (
                    <div key={idx} className="flex items-center gap-3 rounded-xl border border-blue-400/20 bg-blue-400/5 p-3 text-sm text-blue-200/80">
                      <CheckCircle2 className="h-4 w-4 text-blue-400" />
                      {suggestion}
                    </div>
                  ))}
                  
                  {analysis.suspectedCategory && (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-primary-foreground/90">
                      <div className="flex items-center gap-3">
                        <ArrowRight className="h-4 w-4 text-primary" />
                        <span>Kategori Önerisi: <span className="font-bold text-primary">{analysis.suspectedCategory}</span></span>
                      </div>
                    </div>
                  )}

                  {analysis.correctedProductName && (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-primary-foreground/90">
                      <div className="flex items-center gap-3">
                        <ArrowRight className="h-4 w-4 text-primary" />
                        <span>İsim Önerisi: <span className="font-bold text-primary">{analysis.correctedProductName}</span></span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1 h-12 rounded-xl border-border hover:bg-muted transition-all"
            >
              Vazgeç ve Düzenle
            </Button>
            <Button
              onClick={onConfirm}
              className="flex-1 h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-[0_0_20px_rgba(245,158,11,0.3)] transition-all"
            >
              Yine de Devam Et
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
