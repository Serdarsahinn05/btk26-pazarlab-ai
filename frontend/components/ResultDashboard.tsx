"use client";

import { SimulationResponse } from "@/types";
import OverallScoreCard from "./OverallScoreCard";
import TopPersonaCards from "./TopPersonaCards";
import WeaknessList from "./WeaknessList";
import AiFeedbackPanel from "./AiFeedbackPanel";
import ProductTypeInsight from "./ProductTypeInsight";
import ChannelRecommendation from "./ChannelRecommendation";

interface ResultDashboardProps {
  data: SimulationResponse | null;
}

export default function ResultDashboard({ data }: ResultDashboardProps) {
  if (!data) return null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black tracking-tight text-foreground">
          Simülasyon Sonuçları
        </h2>
        <span className="text-sm text-muted-foreground font-medium bg-muted px-3 py-1 rounded-full">
          {data.simulatedConsumers} Tüketici Analiz Edildi
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* En üst skorlar */}
        <OverallScoreCard data={data} />
        
        {/* Karakteristik ve Kanallar (Yeni Küçük Kartlar) */}
        <ProductTypeInsight insight={data.aiInsights.productTypeInsight} />
        <ChannelRecommendation channels={data.aiInsights.channelRecommendation} />
        <div className="col-span-1">
          <WeaknessList weaknesses={data.weaknesses} />
        </div>

        {/* Personalar */}
        <TopPersonaCards personas={data.topPersonas} />

        {/* AI Reçetesi */}
        <AiFeedbackPanel insights={data.aiInsights} />
      </div>
    </div>
  );
}
