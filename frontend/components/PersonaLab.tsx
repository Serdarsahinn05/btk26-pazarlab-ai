"use client";

import { motion } from "framer-motion";
import { Users, Info, Target, Zap, Heart } from "lucide-react";
import personasData from "../data/personas.json";

export default function PersonaLab() {
  const personas = personasData.personaTypes;

  return (
    <div className="space-y-8 pb-12">
      <header>
        <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
          <Users className="text-primary w-8 h-8 glow-blue" />
          Persona <span className="text-gradient">Lab</span>
        </h2>
        <p className="text-muted-foreground mt-2 font-medium">
          Simülasyon sistemimizde aktif olan {personas.length} farklı tüketici psikolojisi ve satın alma profili.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {personas.map((persona, idx) => (
          <motion.div
            key={persona.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bento-card border-white/5 hover:border-primary/20 transition-all group overflow-hidden"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="bg-primary/10 p-2.5 rounded-xl border border-primary/20 group-hover:bg-primary/20 transition-colors">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground bg-white/5 px-3 py-1 rounded-full">
                {persona.personalityType}
              </span>
            </div>

            <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{persona.name}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-6 italic">
              &quot;{persona.aiRoleplayPrompt}&quot;
            </p>

            <div className="space-y-4">
              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center gap-2 mb-1">
                  <Heart className="w-3 h-3 text-red-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">Alışveriş Alışkanlığı</span>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">{persona.personalityTraits.shoppingHabit}</p>
              </div>

              <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-3 h-3 text-yellow-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">Değerleri</span>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">{persona.personalityTraits.values}</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
               <div className="flex flex-col">
                  <span className="text-[9px] uppercase tracking-tighter text-muted-foreground">Korkusu</span>
                  <span className="text-[11px] font-bold text-destructive/80">{persona.personalityTraits.biggestFear}</span>
               </div>
               <div className="flex flex-col items-end">
                  <span className="text-[9px] uppercase tracking-tighter text-muted-foreground">Popülasyon</span>
                  <span className="text-[11px] font-bold text-primary">{persona.count} Ajan</span>
               </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
