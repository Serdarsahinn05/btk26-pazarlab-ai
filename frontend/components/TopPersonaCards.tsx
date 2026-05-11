"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Persona } from "@/types";
import { User, ThumbsUp, Lightbulb } from "lucide-react";

interface TopPersonaCardsProps {
  personas: Persona[];
}

export default function TopPersonaCards({ personas }: TopPersonaCardsProps) {
  return (
    <Card className="col-span-1 md:col-span-3 border-primary/20 shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center gap-2">
          <User className="w-5 h-5 text-primary" />
          En Olası Alıcı Personaları
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          {personas.map((persona, index) => (
            <div key={index} className="bg-muted/30 p-5 rounded-xl border border-border/50 flex flex-col gap-3 relative overflow-hidden">
              {index === 0 && (
                <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                  BİRİNCİL HEDEF
                </div>
              )}
              
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-lg text-foreground">{persona.name}</h3>
                <div className="flex flex-col items-end">
                  <span className="text-2xl font-black text-primary">
                    {Math.round(persona.purchaseProbability * 100)}%
                  </span>
                  <span className="text-[10px] text-muted-foreground -mt-1">Dönüşüm</span>
                </div>
              </div>
              
              <div className="space-y-3 mt-2">
                <div className="flex items-start gap-2 text-sm">
                  <ThumbsUp className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <p className="text-muted-foreground">{persona.reason}</p>
                </div>
                
                <div className="flex items-start gap-2 text-sm bg-primary/5 p-2 rounded border border-primary/10">
                  <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-foreground font-medium">{persona.advice}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
