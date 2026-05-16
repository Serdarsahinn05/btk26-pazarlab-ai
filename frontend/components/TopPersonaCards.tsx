"use client";

import { Progress } from "@/components/ui/progress";

import { AiInsights, Persona, PersonaFeedback } from "@/types";
import {
  BadgeCheck,
  Bot,
  CircleDollarSign,
  CircleHelp,
  Diamond,
  Flame,
  Lightbulb,
  Package,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Trophy,
  User,
  Users,
  Zap,
} from "lucide-react";

interface TopPersonaCardsProps {
  personas: Persona[];
  allPersonas?: Persona[];
  insights?: AiInsights;
}

const personaIcons = [
  Flame,
  Diamond,
  Zap,
  Users,
  Star,
  Search,
  Tag,
  Package,
  CircleHelp,
  CircleDollarSign,
  ShieldCheck,
  BadgeCheck,
];

function getFeedbackMap(feedback?: PersonaFeedback[]) {
  return new Map((feedback ?? []).map((item) => [item.name, item]));
}

function getDecisionClasses(decision?: string) {
  if (decision === "buy") return "bg-emerald-500 text-white border-emerald-400";
  if (decision === "skip") return "bg-muted text-muted-foreground border-border";
  return "bg-amber-500 text-white border-amber-400";
}

function getProgressColor(probability: number) {
  if (probability >= 0.62) return "bg-emerald-500";
  if (probability >= 0.45) return "bg-primary";
  return "bg-destructive";
}

function getPersonaFeedback(persona: Persona, feedbackMap: Map<string, PersonaFeedback>) {
  return feedbackMap.get(persona.name)?.feedback || persona.microFeedback || persona.reason;
}

function getPersonaAction(persona: Persona, feedbackMap: Map<string, PersonaFeedback>) {
  return feedbackMap.get(persona.name)?.action || persona.advice;
}

export default function TopPersonaCards({ personas = [], allPersonas = [], insights }: TopPersonaCardsProps) {
  const feedbackMap = getFeedbackMap(insights?.personaFeedback);
  const rankedPersonas = (allPersonas?.length ? allPersonas : personas) || [];
  
  // Güvenli map işlemi
  const topNames = new Set(
    (personas || [])
      .filter(p => p && p.name)
      .map((persona) => persona.name)
  );
  
  const remainingPersonas = rankedPersonas.filter((persona) => persona && persona.name && !topNames.has(persona.name));


  return (
    <div className="bento-card border-border/50 shadow-xl overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      
      <div className="pb-6 border-b border-white/5 mb-6">
        <h3 className="text-xl font-black tracking-tight flex items-center gap-3">
          <User className="w-6 h-6 text-primary glow-blue" />
          PERSONA YATIRIM HARİTASI
        </h3>
        <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest font-bold">500+ Yapay Zeka Ajanı Analizi</p>
      </div>

      <div className="space-y-12">
        <div>
          <div className="mb-6 flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-primary/80 flex items-center gap-2">
              <Trophy className="w-4 h-4" /> YATIRIM ÖNCELİKLİ İLK 3
            </h4>
            <div className="h-px flex-1 bg-primary/10 mx-4" />
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Ana Hedef Kitle</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {personas.map((persona, index) => {
              const Icon = personaIcons[index % personaIcons.length];
              const probability = Math.round(persona.purchaseProbability * 100);

              return (
                <div
                  key={persona.name}
                  className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 p-6 transition-all hover:bg-primary/10 hover:border-primary/40 glow-blue"
                >
                  <div className="absolute right-0 top-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-12 translate-x-12 blur-2xl" />
                  
                  <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-primary/20 border border-primary/30 px-3 py-1 text-[10px] font-black text-primary uppercase tracking-widest">
                    <Trophy className="h-3 w-3" />
                    #{index + 1}
                  </div>

                  <div className="mb-6 flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background border border-white/10 shadow-lg">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-lg font-black leading-tight text-foreground">{persona.name}</h4>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{persona.buyerCount ?? 0}/{persona.sampleSize ?? 0} BOT ONAYI</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Satın Alma Olasılığı</span>
                        <span className="text-sm font-black text-primary tracking-tighter">%{probability}</span>
                      </div>
                      <Progress
                        value={probability}
                        className="h-2 bg-white/5"
                        indicatorColor={getProgressColor(persona.purchaseProbability)}
                      />
                    </div>

                    <div className="p-4 rounded-xl border border-white/5 bg-black/40 text-xs leading-relaxed">
                      <div className="flex items-center gap-2 mb-2 text-amber-500">
                        <Lightbulb className="h-3.5 w-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">AI Tavsiyesi</span>
                      </div>
                      <p className="font-medium text-foreground/90">{getPersonaAction(persona, feedbackMap)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-6 flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
              <Bot className="w-4 h-4" /> BOT KARARLARI
            </h4>
            <div className="h-px flex-1 bg-white/5 mx-4" />
            <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Diğer Gruplar</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {remainingPersonas.map((persona, index) => {
              if (!persona || !persona.name) return null;
              const Icon = personaIcons[(index + personas.length) % personaIcons.length];
              const probability = Math.round(persona.purchaseProbability * 100);

              return (
                <div
                  key={persona.name}
                  className="rounded-2xl border border-white/5 bg-white/5 p-4 transition-all hover:bg-white/10 hover:border-white/10 group"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-lg bg-background border border-white/5 flex items-center justify-center shrink-0 group-hover:border-primary/30 transition-colors">
                        <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black leading-snug text-foreground uppercase tracking-tight">{persona.name}</h4>
                        <p className="mt-1 text-[10px] text-muted-foreground font-medium leading-relaxed italic line-clamp-2">&quot;{getPersonaFeedback(persona, feedbackMap)}&quot;</p>

                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-[8px] font-black uppercase tracking-widest rounded-full px-2 py-0.5 border ${getDecisionClasses(persona.decision)}`}>
                        {persona.decisionLabel || "KARARSIZ"}
                      </span>
                      <span className="text-[10px] font-black text-foreground">%{probability}</span>
                    </div>
                    <Progress
                      value={probability}
                      className="h-1 bg-white/5"
                      indicatorColor={getProgressColor(persona.purchaseProbability)}
                    />
                  </div>

                  <div className="flex items-start gap-2 pt-2 border-t border-white/5 text-[9px] text-muted-foreground">
                    <Sparkles className="h-3 w-3 shrink-0 text-amber-500" />
                    <span className="font-medium">{getPersonaAction(persona, feedbackMap)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>

  );
}
