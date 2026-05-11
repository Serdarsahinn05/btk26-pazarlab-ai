"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";

interface ProductTypeInsightProps {
  insight: string;
}

export default function ProductTypeInsight({ insight }: ProductTypeInsightProps) {
  return (
    <Card className="col-span-1 border-blue-500/20 shadow-sm bg-blue-50/30 dark:bg-blue-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-600 dark:text-blue-400">
          <Info className="w-4 h-4" />
          Ürün Karakteristiği
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-foreground/80 font-medium">
          {insight}
        </p>
      </CardContent>
    </Card>
  );
}
