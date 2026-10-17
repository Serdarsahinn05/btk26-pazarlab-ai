import { SimulationResponse } from "@/types";
import { aiFallbackNote } from "@/lib/api";
import { DECISION_LABEL, decisionOf, personaLabel } from "@/lib/personas";

/** Plain Markdown report of a simulation, for pasting into docs or sending to a team. */
export function simulationToMarkdown(result: SimulationResponse, productName: string, shareUrl?: string): string {
  const dist = result.decisionDistribution;
  const personas = [...(result.allPersonas?.length ? result.allPersonas : result.topPersonas)].sort(
    (a, b) => b.purchaseProbability - a.purchaseProbability
  );
  const range = result.buyersRange && result.buyersRange.high > result.buyersRange.low ? result.buyersRange : null;
  const lines = [
    `# PazarLab AI raporu: ${productName}`,
    "",
    `Tarih: ${new Date().toLocaleString("tr-TR")}${shareUrl ? ` · Sonuç linki: ${shareUrl}` : ""}`,
    aiFallbackNote(result.aiInsights) ? `\n> Not: ${aiFallbackNote(result.aiInsights)}` : "",
    "",
    "## Karar",
    "",
    `- Genel skor: **${result.overallScore}/100**`,
    dist ? `- ${result.simulatedConsumers} sentetik tüketici: ${dist.buy} aldı · ${dist.watch} kararsız · ${dist.skip} almadı` : "",
    range ? `- Tahmini alıcı: ${result.estimatedBuyers} (${range.runs} turun %80'inde ${range.low}–${range.high})` : "",
    result.engineVersion ? "" : "- Not: bu sonuç eski simülasyon motoruyla hesaplandı; yeniden simüle edilirse değişebilir.",
    `- Pazar genişliği ${result.marketBreadthScore}/100 · Niyet dönüşümü ${result.intentConversionScore}/100 · Problem uyumu ${result.problemSolutionFit}/100`,
    "",
    "## Özet",
    "",
    result.aiInsights.summary,
    "",
    "## İlk aksiyonlar",
    "",
    ...result.aiInsights.salesRecipe.map((a, i) => `${i + 1}. ${a}`),
    "",
    ...(result.improvements?.length
      ? [
          "## En etkili değişiklikler",
          "",
          ...result.improvements.map(
            (m) => `- ${m.label}: ${m.deltaBuyers >= 0 ? "+" : ""}${m.deltaBuyers} alıcı, ciro ${m.deltaRevenue >= 0 ? "+" : "−"}${Math.abs(Math.round(m.deltaRevenue)).toLocaleString("tr-TR")} TL`
          ),
          "",
        ]
      : []),
    "## Zayıflıklar",
    "",
    ...(result.weaknesses.length ? result.weaknesses.map((w) => `- ${w}`) : ["- Belirgin bir zayıflık bulunmadı."]),
    "",
    "## Kanal önerileri",
    "",
    result.aiInsights.channelRecommendation.join(", "),
    "",
    result.aiInsights.marketingAdvice,
    "",
    "## Personalar",
    "",
    "| Persona | Satın alma eğilimi | Karar |",
    "|---|---|---|",
    ...personas.map(
      (p) => `| ${personaLabel(p.name)} | %${Math.round(p.purchaseProbability * 100)} | ${DECISION_LABEL[decisionOf(p.decision, p.purchaseProbability)]} |`
    ),
    "",
    "## İyileştirilmiş açıklama",
    "",
    result.aiInsights.improvedDescription,
    "",
    "---",
    "Sonuçlar talep sinyalidir, gerçek dönüşüm oranı veya satış garantisi değildir.",
    "",
  ];
  return lines.filter((line, i, all) => !(line === "" && all[i - 1] === "")).join("\n");
}
