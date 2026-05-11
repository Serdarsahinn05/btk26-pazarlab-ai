"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Megaphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ChannelRecommendationProps {
  channels: string[];
}

export default function ChannelRecommendation({ channels }: ChannelRecommendationProps) {
  return (
    <Card className="col-span-1 border-emerald-500/20 shadow-sm bg-emerald-50/30 dark:bg-emerald-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
          <Megaphone className="w-4 h-4" />
          Önerilen Pazarlama Kanalları
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 pt-1">
          {channels.map((channel, idx) => (
            <Badge key={idx} variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300">
              {channel}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
