"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card className="col-span-1 md:col-span-3 border-primary/20 shadow-xl glass bg-card/70">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          Persona Yatırım Haritası
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Yatırım Öncelikli İlk 3
            </h3>
            <span className="text-xs text-muted-foreground">Ana hedef segmentler</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {personas.map((persona, index) => {
              const Icon = personaIcons[index % personaIcons.length];
              const probability = Math.round(persona.purchaseProbability * 100);

              return (
                <div
                  key={persona.name}
                  className="relative overflow-hidden rounded-xl border border-primary/20 bg-primary/5 p-5 shadow-md"
                >
                  <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground">
                    <Trophy className="h-3 w-3" />
                    #{index + 1}
                  </div>

                  <div className="mb-4 flex items-start gap-3 pr-12">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background/80 border border-border/60">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold leading-tight text-foreground">{persona.name}</h4>
                      <p className="mt-1 text-xs text-muted-foreground">{persona.buyerCount ?? 0}/{persona.sampleSize ?? 0} bot yatırım eğiliminde</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Olasılık</span>
                        <span className="font-black text-primary">%{probability}</span>
                      </div>
                      <Progress
                        value={probability}
                        className="h-2 bg-muted/70 dark:bg-white/10"
                        indicatorColor={getProgressColor(persona.purchaseProbability)}
                      />
                    </div>

                    <div className="flex items-start gap-2 rounded-lg border border-primary/10 bg-background/50 p-3 text-sm">
                      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                      <p className="font-medium text-foreground">{getPersonaAction(persona, feedbackMap)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
              <Bot className="h-4 w-4 text-primary" />
              Bot Kararları
            </h3>
            <span className="text-xs text-muted-foreground">Diğer personalar ve AI kısa yorumu</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {remainingPersonas.map((persona, index) => {
              if (!persona || !persona.name) return null; // Güvenlik kontrolü
              const Icon = personaIcons[(index + personas.length) % personaIcons.length];
              const probability = Math.round(persona.purchaseProbability * 100);

              return (
                <div
                  key={persona.name}
                  className="rounded-xl border border-border/60 bg-muted/20 p-4 transition-colors hover:border-primary/30 hover:bg-primary/5"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <div>
                        <h4 className="text-sm font-bold leading-snug text-foreground">{persona.name}</h4>
                        <p className="mt-1 text-xs text-muted-foreground">Neden: {getPersonaFeedback(persona, feedbackMap)}</p>
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black ${getDecisionClasses(persona.decision)}`}>
                      {persona.decisionLabel || "KARARSIZ"}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Olasılık</span>
                      <span className="font-bold text-foreground">%{probability}</span>
                    </div>
                    <Progress
                      value={probability}
                      className="h-2 bg-muted/70 dark:bg-white/10"
                      indicatorColor={getProgressColor(persona.purchaseProbability)}
                    />
                  </div>

                  <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                    <span>{getPersonaAction(persona, feedbackMap)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
