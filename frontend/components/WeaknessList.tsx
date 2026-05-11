"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

interface WeaknessListProps {
  weaknesses: string[];
}

export default function WeaknessList({ weaknesses }: WeaknessListProps) {
  if (!weaknesses || weaknesses.length === 0) return null;

  return (
    <Card className="border-red-500/20 shadow-sm bg-red-50/50 dark:bg-red-950/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2 text-red-600 dark:text-red-400">
          <AlertTriangle className="w-5 h-5" />
          Zayıf Yönler & Riskler
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 mt-2">
          {weaknesses.map((weakness, index) => (
            <li key={index} className="flex items-start gap-2 text-sm">
              <span className="text-red-500 font-bold mt-0.5">•</span>
              <span className="text-foreground/80">{weakness}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
