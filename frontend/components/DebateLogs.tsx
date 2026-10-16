"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMediaQuery } from "@/lib/hooks";
import { motion } from "framer-motion";
import { DebateLog, Persona } from "@/types";
import { personaColor, personaLabel, personaSlug } from "@/lib/personas";
import { cn } from "@/lib/utils";

interface DebateLogsProps {
  logs: DebateLog[];
  personas?: Persona[];
}

const genericSpeakerPattern = /^(assistant|asistan|agent|ajan|persona|bot|buyer|seller|alici|alıcı|satici|satıcı|user|system)\s*\d*$/i;

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
  const focusSlug = useSearchParams().get("persona");
  // Reveal messages one by one like a live chat, unless the user came for a specific persona.
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const instant = Boolean(focusSlug) || reducedMotion;
  // The counter is tagged with the logs it counts, so new logs restart from 0 without a reset in the effect.
  const [reveal, setReveal] = useState({ logs: normalizedLogs, count: 0 });
  const revealed = reveal.logs === normalizedLogs ? reveal.count : 0;
  const visibleCount = instant ? normalizedLogs.length : Math.min(revealed, normalizedLogs.length);

  useEffect(() => {
    if (instant) return;
    const timer = window.setInterval(() => {
      setReveal((prev) => {
        const count = prev.logs === normalizedLogs ? prev.count : 0;
        if (count >= normalizedLogs.length) window.clearInterval(timer);
        return { logs: normalizedLogs, count: Math.min(count + 1, normalizedLogs.length) };
      });
    }, 1200);
    return () => window.clearInterval(timer);
  }, [normalizedLogs, instant]);

  useEffect(() => {
    if (!focusSlug) return;
    document.querySelector(`[data-persona="${focusSlug}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusSlug, visibleCount]);

  if (normalizedLogs.length === 0) return null;

  return (
    <div className="space-y-4">
      <ol className="space-y-3.5">
        {normalizedLogs.slice(0, visibleCount).map((log, index) => {
          const color = personaColor(log.name);
          const slug = personaSlug(log.name);
          const focused = focusSlug === slug;
          return (
            <motion.li
              key={`${log.name}-${index}`}
              data-persona={slug}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={cn(
                "flex gap-3 rounded-[4px_16px_16px_4px] border-2 border-l-[6px] bg-card p-4 shadow-sticker",
                focused && "ring-2 ring-ring ring-offset-2 ring-offset-background"
              )}
              style={{ borderLeftColor: color, borderTopColor: "hsl(var(--border))", borderRightColor: "hsl(var(--border))", borderBottomColor: "hsl(var(--border))" }}
            >
              <span
                aria-hidden
                className="grid h-9 w-9 shrink-0 place-items-center rounded-blob font-display text-sm font-extrabold text-card"
                style={{ background: color }}
              >
                {personaLabel(log.name).charAt(0)}
              </span>
              <div className="min-w-0">
                <b className="font-display text-sm font-bold">{personaLabel(log.name)}</b>
                <p className="mt-0.5 text-foreground-2">{log.text}</p>
              </div>
            </motion.li>
          );
        })}
      </ol>
      {visibleCount < normalizedLogs.length && (
        <button type="button" onClick={() => setReveal({ logs: normalizedLogs, count: normalizedLogs.length })} className="btn-sticker">
          Tümünü göster ({normalizedLogs.length - visibleCount} mesaj daha)
        </button>
      )}
    </div>
  );
};
