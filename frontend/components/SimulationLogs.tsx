"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PurchaseMotivation } from "@/types";
import { Loader2, TerminalSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SimulationLogsProps {
  motivation: PurchaseMotivation | null;
}

export default function SimulationLogs({ motivation }: SimulationLogsProps) {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    setLogs(["[SYSTEM] Baslatiliyor...", "[AI_CORE] PazarLab motoru devrede."]);

    const messages = [
      "> AI input analizi ve kategori uyumu kontrol ediliyor...",
      `> Motivasyon profili eslestirildi: [${motivation || "Bilinmiyor"}]...`,
      motivation === "profesyonel_kullanim"
        ? "> Teknik ozellik ve profesyonel kullanim uyumu modelleniyor..."
        : motivation === "stil_begeni"
        ? "> Trend ve stil odakli tuketici egilimleri analiz ediliyor..."
        : "> 500 sentetik tuketici icin satin alma olasiliklari hesaplaniyor...",
      "> Fiyat elastikiyeti ve operasyonel guven skorlaniyor...",
      "> Marka/model, aciklama ve teknik detay sinyalleri 10 parametreye indirgeniyor...",
      "> Veriler derleniyor, lutfen bekleyiniz..."
    ];

    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex < messages.length) {
        setLogs((prev) => [...prev, messages[currentIndex]]);
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [motivation]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full max-w-2xl mx-auto"
    >
      <Card className="shadow-[0_0_40px_hsl(var(--primary)/0.15)] border-primary/30 bg-black/90 backdrop-blur-xl text-primary font-mono relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-primary/50 shadow-[0_0_10px_hsl(var(--primary)/1)] animate-[float_3s_linear_infinite]" style={{ transformOrigin: "top" }} />

        <CardContent className="p-6">
          <div className="flex items-center space-x-3 mb-4 border-b border-primary/20 pb-4">
            <TerminalSquare className="w-6 h-6 text-primary" />
            <h2 className="text-lg font-semibold text-primary/90 tracking-widest uppercase">PazarLab_Terminal_v2.0</h2>
            <Loader2 className="w-5 h-5 ml-auto text-primary animate-spin" />
          </div>

          <div className="space-y-3 text-sm min-h-[200px] flex flex-col justify-end">
            <AnimatePresence>
              {logs.map((log, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-start gap-2 text-primary/80"
                >
                  <span className="text-primary/50">{`>>`}</span>
                  <span className="whitespace-pre-wrap">{log}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-primary/50">{`>>`}</span>
              <motion.div
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                className="w-2 h-4 bg-primary"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
