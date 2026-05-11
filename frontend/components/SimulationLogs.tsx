"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { PurchaseMotivation } from "@/types";
import { Loader2, TerminalSquare } from "lucide-react";

interface SimulationLogsProps {
  motivation: PurchaseMotivation | null;
}

export default function SimulationLogs({ motivation }: SimulationLogsProps) {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    // Reset logs on mount
    setLogs(["Sistem başlatılıyor...", "PazarLab AI motoru hazır."]);

    const messages = [
      "Veritabanından benzer ürün performansları çekiliyor...",
      `Motivasyon profili algılandı: ${motivation || "Bilinmiyor"}...`,
      motivation === "yedek_parca_tamir" 
        ? "Yedek parça ürünleri için niyetli alıcı davranışı modelleniyor..." 
        : motivation === "stil_begeni"
        ? "Trend ve stil odaklı tüketici eğilimleri analiz ediliyor..."
        : "500 sentetik tüketici için satın alma olasılıkları hesaplanıyor...",
      "Fiyat elastikiyeti ve sezon uyumu skorlanıyor...",
      "Rakip analizi ve pazar genişliği belirleniyor...",
      "Sonuçlar derleniyor..."
    ];

    let currentIndex = 0;
    
    const interval = setInterval(() => {
      if (currentIndex < messages.length) {
        setLogs(prev => [...prev, messages[currentIndex]]);
        currentIndex++;
      } else {
        clearInterval(interval);
      }
    }, 400); // Add a new log every 400ms

    return () => clearInterval(interval);
  }, [motivation]);

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-2xl border-primary/20 bg-slate-950 text-green-400 font-mono">
      <CardContent className="p-6">
        <div className="flex items-center space-x-3 mb-4 border-b border-slate-800 pb-4">
          <TerminalSquare className="w-6 h-6 text-primary" />
          <h2 className="text-lg font-semibold text-slate-200">AI Simülasyon Terminali</h2>
          <Loader2 className="w-5 h-5 ml-auto text-primary animate-spin" />
        </div>
        
        <div className="space-y-2 text-sm min-h-[200px] flex flex-col justify-end">
          {logs.map((log, i) => (
            <div 
              key={i} 
              className="animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              <span className="text-slate-500 mr-2">{`>`}</span>
              {log}
            </div>
          ))}
          <div className="animate-pulse">
            <span className="text-slate-500 mr-2">{`>`}</span>
            <span className="inline-block w-2 h-4 bg-green-400 align-middle"></span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
