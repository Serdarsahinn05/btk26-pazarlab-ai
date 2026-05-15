"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Zap } from "lucide-react";

interface DebateLog {
  name: string;
  text: string;
}

interface DebateLogsProps {
  logs: DebateLog[];
}


const personaColors: Record<string, string> = {
  "Trend Takipcisi": "bg-pink-500/10 text-pink-500 border-pink-500/20",
  "Kalite Odakli Alici": "bg-blue-500/10 text-blue-500 border-blue-500/20",
  "Fiyat Hassas Alici": "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  "Marka Sadigi": "bg-purple-500/10 text-purple-500 border-purple-500/20",
  "Detayci Analist": "bg-green-500/10 text-green-500 border-green-500/20",
  "Sistem": "bg-gray-500/10 text-gray-400 border-gray-500/20",
};


export const DebateLogs: React.FC<DebateLogsProps> = ({ logs }) => {
  const [visibleLogs, setVisibleLogs] = useState<DebateLog[]>([]);
  
  // Persona isimlerini 1-10 arası resimlerle eşleştir (Tutanlı olması için useMemo kullanıyoruz)
  const personaIconsMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    logs.forEach((log) => {
      if (log.name && !map[log.name]) {
        // İsim bazlı basit bir sayı üret veya tamamen rastgele seç
        // Sistem personası her zaman 1 numarayı veya özel bir ikonu alabilir
        if (log.name === "Sistem") {
          map[log.name] = 0; // Özel durum
        } else {
          map[log.name] = Math.floor(Math.random() * 10) + 1;
        }
      }
    });
    return map;
  }, [logs]);

  useEffect(() => {
    if (!logs || logs.length === 0) return;

    let index = 0;
    const interval = setInterval(() => {
      if (index < logs.length) {
        setVisibleLogs((prev) => [...prev, logs[index]]);
        index++;
      } else {
        clearInterval(interval);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [logs]);

  if (!logs || logs.length === 0) return null;

  return (
    <div className="space-y-4 max-h-[500px] overflow-y-auto p-4 custom-scrollbar rounded-xl bg-black/40 border border-white/10 backdrop-blur-md shadow-2xl">
      <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
        <MessageSquare className="w-5 h-5 text-indigo-400" />
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Ajanlar Arası Tartışma (A2A)</h3>
      </div>
      
      <div className="space-y-3">
        <AnimatePresence>
          {visibleLogs.map((log, i) => {
            if (!log || !log.name) return null;
            
            const iconId = personaIconsMap[log.name];
            const isSystem = log.name === "Sistem";

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10, y: 10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 0.4 }}
                className={`flex flex-col gap-1 p-3 rounded-2xl border ${
                  personaColors[log.name] || "bg-white/5 text-white/80 border-white/10"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20 bg-white/10 flex items-center justify-center shrink-0">
                    {isSystem ? (
                      <Zap className="w-4 h-4 text-yellow-400" />
                    ) : (
                      <img 
                        src={`/pp_icons/${iconId}.jpeg`} 
                        alt={log.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "";
                          target.style.display = "none";
                        }}

                      />
                    )}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-tight opacity-70">{log.name}</span>
                </div>
                <p className="text-sm leading-relaxed font-medium pl-10 -mt-2">
                  {String(log.text)}
                </p>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

