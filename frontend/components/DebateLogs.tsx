"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Zap } from "lucide-react";
import { DebateLog, Persona } from "@/types";

interface DebateLogsProps {
  logs: DebateLog[];
  personas?: Persona[];
}

const personaColors: Record<string, string> = {
  "Trend Takipcisi": "bg-pink-500/10 text-pink-500 border-pink-500/20",
  "Kalite Odakli Alici": "bg-blue-500/10 text-blue-500 border-blue-500/20",
  "Fiyat Hassas Alici": "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  "Marka Sadigi": "bg-purple-500/10 text-purple-500 border-purple-500/20",
  "Detayci Analist": "bg-green-500/10 text-green-500 border-green-500/20",
  "Sistem": "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

const genericSpeakerPattern = /^(assistant|asistan|agent|ajan|persona|bot|buyer|seller|alici|alıcı|satici|satıcı|user|system)\s*\d*$/i;

function iconForName(name: string) {
  if (name === "Sistem") return 0;

  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) | 0;
  }

  return (Math.abs(hash) % 10) + 1;
}

function stripPersonaPrefix(text: string, personaNames: string[]) {
  const cleanText = String(text || "").trim();

  for (const personaName of personaNames) {
    const escapedName = personaName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matcher = new RegExp(`^\\s*${escapedName}\\s*[:\\-–]\\s*`, "i");
    if (matcher.test(cleanText)) {
      return {
        name: personaName,
        text: cleanText.replace(matcher, "").trim(),
      };
    }
  }

  return { name: "", text: cleanText };
}

function mapGenericSpeaker(name: string, personaNames: string[], index: number) {
  const numberMatch = name.match(/\d+/);
  if (numberMatch) {
    const personaIndex = Number(numberMatch[0]) - 1;
    if (personaIndex >= 0 && personaIndex < personaNames.length) {
      return personaNames[personaIndex];
    }
  }

  return personaNames[index % personaNames.length] || "Sistem";
}

function normalizeLogs(logs: DebateLog[], personas: Persona[] = []) {
  const personaNames = personas.map((persona) => persona.name).filter(Boolean);
  const validNames = new Set(personaNames);

  return logs
    .map((log, index) => {
      const prefixed = stripPersonaPrefix(log.text, personaNames);
      const rawName = prefixed.name || String(log.name || "").trim();
      let name = rawName;

      if (personaNames.length > 0 && !validNames.has(name)) {
        name = genericSpeakerPattern.test(name) || !name
          ? mapGenericSpeaker(name, personaNames, index)
          : mapGenericSpeaker(name, personaNames, index);
      }

      return {
        name: name || "Sistem",
        text: prefixed.text || String(log.text || "").trim(),
      };
    })
    .filter((log) => log.text);
}

export const DebateLogs: React.FC<DebateLogsProps> = ({ logs, personas = [] }) => {
  const normalizedLogs = useMemo(() => normalizeLogs(logs, personas), [logs, personas]);
  const [visibleLogs, setVisibleLogs] = useState<DebateLog[]>([]);

  const personaIconsMap = useMemo(() => {
    const map: Record<string, number> = {};
    normalizedLogs.forEach((log) => {
      if (log.name && map[log.name] === undefined) {
        map[log.name] = iconForName(log.name);
      }
    });
    return map;
  }, [normalizedLogs]);

  useEffect(() => {
    setVisibleLogs([]);
    if (!normalizedLogs || normalizedLogs.length === 0) return;

    let index = 0;
    const interval = window.setInterval(() => {
      if (index < normalizedLogs.length) {
        const nextLog = normalizedLogs[index];
        if (nextLog) {
          setVisibleLogs((prev) => [...prev, nextLog]);
        }
        index += 1;
      } else {
        window.clearInterval(interval);
      }
    }, 1500);

    return () => window.clearInterval(interval);
  }, [normalizedLogs]);

  if (!normalizedLogs || normalizedLogs.length === 0) return null;

  return (
    <div className="space-y-4 max-h-[500px] overflow-y-auto p-4 custom-scrollbar rounded-xl bg-white/40 dark:bg-black/40 border border-border/50 dark:border-white/10 backdrop-blur-md shadow-xl dark:shadow-2xl">
      <div className="flex items-center gap-2 mb-4 border-b border-border/50 dark:border-white/10 pb-2">
        <MessageSquare className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
        <h3 className="text-sm font-semibold text-foreground dark:text-white uppercase tracking-wider">Persona Tartismasi (A2A)</h3>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {visibleLogs.map((log, index) => {
            if (!log || !log.name) return null;

            const iconId = personaIconsMap[log.name];
            const isSystem = log.name === "Sistem";

            return (
              <motion.div
                key={`${log.name}-${index}`}
                initial={{ opacity: 0, x: -10, y: 10 }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ duration: 0.4 }}
                className={`flex flex-col gap-1 p-3 rounded-2xl border ${
                  personaColors[log.name] || "bg-muted/50 dark:bg-white/5 text-foreground/80 dark:text-white/80 border-border/50 dark:border-white/10"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-border/50 dark:border-white/20 bg-white/10 flex items-center justify-center shrink-0">
                    {isSystem ? (
                      <Zap className="w-4 h-4 text-yellow-500" />
                    ) : (
                      <img
                        src={`/pp_icons/${iconId}.jpeg`}
                        alt={log.name}
                        className="w-full h-full object-cover"
                        onError={(event) => {
                          const target = event.target as HTMLImageElement;
                          target.src = "";
                          target.style.display = "none";
                        }}
                      />
                    )}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-tight opacity-70 text-foreground dark:text-white">{log.name}</span>
                </div>
                <p className="text-sm leading-relaxed font-medium pl-10 -mt-2 text-foreground/90 dark:text-white/90">
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
