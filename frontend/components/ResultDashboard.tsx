"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import confetti from "canvas-confetti";
import { Check, Copy, FileDown, Link2, Loader2, Printer, RotateCcw, Sparkles } from "lucide-react";
import { downloadBlob } from "@/lib/history";
import { simulationToMarkdown } from "@/lib/report";
import { CompareResponse, Competitor, NormalizedProduct, Persona, SimulationRequest, SimulationResponse } from "@/types";
import { aiFallbackNote, compareVariants } from "@/lib/api";
import WhatIf from "@/components/WhatIf";
import PersonaChat from "@/components/PersonaChat";
import { SegmentRing, Ring } from "@/components/ui/ring";
import { DebateLogs } from "@/components/DebateLogs";
import { ImprovementsCard, LegacyEngineNote, SegmentsCard, TownCast, WordOfMouthCard } from "@/components/TownInsights";
import { Disclosure, ResultNav, SECTION_SCROLL_MARGIN, type ResultSection } from "@/components/ResultLayout";
import {
  DECISION_LABEL,
  DECISION_TEXT_CLASS,
  decisionOf,
  personaColor,
  personaLabel,
  personaSlug,
} from "@/lib/personas";
import { cn } from "@/lib/utils";
import type { DashboardView } from "@/components/TopBar";

interface ResultDashboardProps {
  data: SimulationResponse;
  view: DashboardView;
  productName: string;
  /** Original input; enables the what-if tools. Missing for results saved before it was stored. */
  request?: SimulationRequest | null;
  onReset: () => void;
}

export default function ResultDashboard({ data, view, productName, request, onReset }: ResultDashboardProps) {
  useCelebration(data, view);
  // Same input analysis as the main run, so the price curve's "now" point matches the result.
  const whatIfRequest = useMemo(
    () => (request ? { ...request, inputAnalysis: request.inputAnalysis ?? data.inputAnalysis ?? undefined } : null),
    [request, data.inputAnalysis]
  );

  if (view === "benchmark") return <BenchmarkView markdown={data.benchmarkAnalysis} competitors={data.competitors ?? []} request={whatIfRequest} />;
  if (view === "debate") {
    const personas = data.allPersonas?.length ? data.allPersonas : data.topPersonas;
    return (
      <section className="space-y-5">
        <h2 className="squiggle text-2xl font-bold">Persona tartışması</h2>
        <p className="text-foreground-2">Üç farklı persona ürününüzü kendi bakış açısıyla tartışıyor.</p>
        {data.debateLogs?.length ? (
          <DebateLogs logs={data.debateLogs} personas={personas} />
        ) : (
          <EmptyState text="Bu simülasyon için tartışma kaydı oluşmadı." />
        )}
        <PersonaChat key={data.simulationId ?? "local"} simulationId={data.simulationId} personas={sortedPersonas(data)} />
      </section>
    );
  }

  const sections: ResultSection[] = [
    { id: "karar", label: "Karar" },
    { id: "iyilestir", label: "Neyi değiştirmeli?" },
    { id: "kasaba", label: "Kasaba" },
    ...(whatIfRequest ? [{ id: "ne-olur", label: "Ne olur?" }] : []),
    { id: "aciklama", label: "Açıklama" },
    { id: "parametreler", label: "Parametreler" },
  ];
  const range = data.buyersRange && data.buyersRange.high > data.buyersRange.low ? data.buyersRange : null;

  // A report read top to bottom (DESIGN.md §9.3): verdict, what to change, why (the town), then tools and details folded.
  return (
    <div className="space-y-8">
      {!data.engineVersion && <LegacyEngineNote />}
      <ResultNav
        sections={sections}
        verdict={
          <span className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="font-display text-lg font-extrabold">{data.overallScore}</span>
            <span className="text-muted-foreground">/100 ·</span>
            <span>{data.estimatedBuyers} alıcı</span>
            {range && <span className="hidden font-semibold text-muted-foreground sm:inline">({range.low}–{range.high})</span>}
          </span>
        }
      />

      <section id="karar" aria-label="Karar" className={cn("space-y-6", SECTION_SCROLL_MARGIN)}>
        <div className="grid gap-6 lg:grid-cols-[5fr_7fr]">
          <DecisionCard data={data} />
          <ActionCard data={data} productName={productName} onReset={onReset} />
        </div>
        <KpiRow data={data} />
      </section>

      <section id="iyilestir" aria-label="Neyi değiştirmeli?" className={cn("grid items-start gap-6 md:grid-cols-2 lg:grid-cols-3", SECTION_SCROLL_MARGIN)}>
        {data.improvements && <ImprovementsCard items={data.improvements} />}
        <ListCard title="Zayıflıklar" items={data.weaknesses} empty="Belirgin bir zayıflık bulunmadı." />
        <div className={cn(data.improvements ? "md:col-span-2 lg:col-span-1" : undefined)}>
          <ListCard
            title="Kanal önerileri"
            items={data.aiInsights.channelRecommendation}
            note={data.aiInsights.marketingAdvice}
            empty="Kanal önerisi yok."
            chips
          />
        </div>
      </section>

      <section id="kasaba" aria-label="Kasaba" className={cn("space-y-8", SECTION_SCROLL_MARGIN)}>
        <PersonaGrid personas={sortedPersonas(data)} resultId={data.simulationId} />
        {data.representatives?.length ? <TownCast residents={data.representatives} /> : null}
        {(data.adoptionCurve?.length || data.segments) && (
          <div className="grid items-start gap-6 lg:grid-cols-[1fr_2fr]">
            {data.adoptionCurve?.length ? <WordOfMouthCard curve={data.adoptionCurve} /> : null}
            {data.segments && <SegmentsCard segments={data.segments} />}
          </div>
        )}
      </section>

      {whatIfRequest && (
        <Disclosure id="ne-olur" title="Ne olur?" summary="Fiyat eğrisi ve A/B karşılaştırma: aynı 500 kişiyle, AI'sız, anında.">
          <WhatIf request={whatIfRequest} bare />
        </Disclosure>
      )}
      <Disclosure id="aciklama" title="İyileştirilmiş açıklama" summary="İlana kopyalayabileceğin, eksikleri tamamlanmış açıklama.">
        <ImprovedDescription text={data.aiInsights.improvedDescription} images={data.images} request={whatIfRequest} />
      </Disclosure>
      <Disclosure id="parametreler" title="Ürün parametreleri" summary="Skorun dayandığı 11 ölçü: fiyat uyumu, kalite, trend, güven…">
        <ParamBars product={data.normalizedProduct} />
      </Disclosure>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function useCelebration(data: SimulationResponse, view: DashboardView) {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (view !== "analysis" || reducedMotion || data.overallScore < 60) return;
    // canvas-confetti draws on a canvas and cannot read CSS variables: these are --primary, --accent, --watch (light).
    confetti({ particleCount: 70, spread: 70, origin: { y: 0.3 }, colors: ["#2f7a4c", "#2f7896", "#c99a1a"] });
  }, [data, view]);
}

function sortedPersonas(data: SimulationResponse): Persona[] {
  const list = data.allPersonas?.length ? data.allPersonas : data.topPersonas;
  return [...list].sort((a, b) => b.purchaseProbability - a.purchaseProbability);
}

function handNote(score: number) {
  if (score >= 60) return "satışa yakın!";
  if (score >= 40) return "biraz cila lazım";
  return "önce düzelt";
}

function DecisionCard({ data }: { data: SimulationResponse }) {
  // id: the result bar shows the verdict once this card has scrolled away.
  const dist = data.decisionDistribution ?? { buy: data.estimatedBuyers, watch: 0, skip: data.simulatedConsumers - data.estimatedBuyers };
  const segments = [
    { label: "Aldı", value: dist.buy, color: "hsl(var(--buy))" },
    { label: "Kararsız", value: dist.watch, color: "hsl(var(--watch))" },
    { label: "Almadı", value: dist.skip, color: "hsl(var(--skip))" },
  ];

  return (
    <section id="karar-karti" className="card-paper">
      <h2 className="squiggle text-[21px] font-bold">Karar</h2>
      <div className="relative mt-4">
        <SegmentRing segments={segments}>
          <span className="font-display text-[46px] font-extrabold leading-none tracking-tight">{data.overallScore}</span>
          <span className="text-xs font-bold text-muted-foreground">genel skor / 100</span>
        </SegmentRing>
        <span aria-hidden className="pointer-events-none absolute -right-1 top-2 rotate-[8deg] font-hand text-[22px] leading-none text-foreground-2">
          {handNote(data.overallScore)}
        </span>
      </div>
      <ul className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm font-bold">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span aria-hidden className="h-3 w-3 rounded-full border border-foreground/30" style={{ background: s.color }} />
            {s.label} <span className="font-display text-base">{s.value}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-center text-xs text-muted-foreground">{data.simulatedConsumers} sentetik tüketici · talep sinyali, gerçek dönüşüm oranı değildir</p>
    </section>
  );
}

function ActionCard({ data, productName, onReset }: { data: SimulationResponse; productName: string; onReset: () => void }) {
  const actions = data.aiInsights.salesRecipe.slice(0, 3);
  const risk = data.weaknesses?.[0];
  const [copied, setCopied] = useState(false);
  const shareUrl = data.simulationId ? `${window.location.origin}/dashboard?r=${data.simulationId}` : undefined;

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      window.prompt("Linki kopyalayın:", shareUrl);
    }
  };

  const downloadMarkdown = () => {
    const md = simulationToMarkdown(data, productName, shareUrl);
    const slug = productName.toLowerCase().replace(/[^a-z0-9ğüşıöç]+/gi, "-").slice(0, 40) || "simulasyon";
    downloadBlob(new Blob([md], { type: "text/markdown;charset=utf-8" }), `pazarlab-${slug}.md`);
  };

  return (
    <section className="card-paper flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="squiggle text-[21px] font-bold">Ne yapmalı?</h2>
        {data.aiInsights.aiGenerated === false && (
          <span className="chip text-muted-foreground" title={aiFallbackNote(data.aiInsights) ?? undefined}>kural tabanlı</span>
        )}
      </div>
      <p className="text-lg font-semibold leading-snug">{data.aiInsights.summary}</p>
      {actions.length > 0 && (
        <ol className="space-y-2.5">
          {actions.map((action, i) => (
            <li key={i} className="flex gap-3">
              <span className="num-badge">{i + 1}</span>
              <span className="pt-0.5 text-foreground-2">{action}</span>
            </li>
          ))}
        </ol>
      )}
      {risk && (
        <p className="note-risk">
          <b className="font-bold text-skip-text">Kritik risk: </b>
          {risk}
        </p>
      )}
      <div className="no-print mt-auto flex flex-wrap gap-2.5 pt-1">
        <button type="button" onClick={onReset} className="btn-sticker-primary">
          <RotateCcw className="h-4 w-4" aria-hidden /> Yeni simülasyon
        </button>
        {shareUrl && (
          <button type="button" onClick={copyLink} className="btn-sticker px-3.5" title="Bu sonucu açan link (90 gün saklanır)">
            {copied ? <Check className="h-4 w-4" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
            {copied ? "Kopyalandı" : "Link"}
          </button>
        )}
        <button type="button" onClick={downloadMarkdown} className="btn-sticker px-3.5" title="Raporu Markdown dosyası olarak indir">
          <FileDown className="h-4 w-4" aria-hidden /> .md
        </button>
        <button type="button" onClick={() => window.print()} className="btn-sticker px-3.5" title="Yazdır ya da PDF olarak kaydet">
          <Printer className="h-4 w-4" aria-hidden /> PDF
        </button>
      </div>
    </section>
  );
}

function KpiRow({ data }: { data: SimulationResponse }) {
  const buyerShare = data.simulatedConsumers ? Math.round((data.estimatedBuyers / data.simulatedConsumers) * 100) : 0;
  const range = data.buyersRange;
  const kpis: Array<{ label: string; value: number; display?: string; range?: string; hint: string; title?: string; stripe: string }> = [
    { label: "Pazar genişliği", value: data.marketBreadthScore, hint: "Ürünü ilgilendiren kitle", stripe: "border-t-buy" },
    { label: "Niyet dönüşümü", value: data.intentConversionScore, hint: "İlgilenenin alıma dönme payı", stripe: "border-t-accent" },
    { label: "Problem uyumu", value: data.problemSolutionFit, hint: "İhtiyaca ne kadar cevap veriyor", stripe: "border-t-watch" },
    {
      label: "Tahmini alıcı",
      value: buyerShare,
      display: `${data.estimatedBuyers}`,
      range: range && range.high > range.low ? `${range.low}–${range.high}` : undefined,
      hint: `${data.simulatedConsumers} sakinin %${buyerShare}'i`,
      title: range ? `${range.runs} turun %80'inde alıcı sayısı ${range.low} ile ${range.high} arasında` : undefined,
      stripe: "border-t-violet",
    },
  ];

  return (
    <section aria-label="Temel göstergeler" className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
      {kpis.map((kpi) => (
        <div key={kpi.label} title={kpi.title} className={cn("card-paper grid content-start gap-2.5 border-t-[5px] p-4! md:p-5!", kpi.stripe)}>
          <span className="text-sm font-bold text-foreground-2">{kpi.label}</span>
          <span className="font-display text-[32px] font-extrabold leading-none tracking-tight">
            {kpi.display ?? kpi.value}
            {!kpi.display && <small className="ml-0.5 text-sm font-semibold text-muted-foreground">/100</small>}
            {kpi.range && <small className="mt-1 block whitespace-nowrap text-sm font-semibold tracking-normal text-muted-foreground sm:ml-1.5 sm:mt-0 sm:inline">({kpi.range})</small>}
          </span>
          <div className="bar-track" aria-hidden>
            <div className="bar-fill" style={{ width: `${Math.max(2, kpi.value)}%` }} />
          </div>
          <span className="text-xs text-muted-foreground">{kpi.hint}</span>
        </div>
      ))}
    </section>
  );
}

function PersonaGrid({ personas, resultId }: { personas: Persona[]; resultId?: string | null }) {
  const keep = resultId ? `&r=${encodeURIComponent(resultId)}` : "";
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="squiggle text-[21px] font-bold">Personalar</h2>
        <span className="text-sm text-muted-foreground">Karta tıklayın → tartışmada o persona</span>
      </div>
      <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 md:mx-0 md:grid md:grid-cols-[repeat(auto-fill,minmax(160px,1fr))] md:overflow-visible md:px-0">
        {personas.map((p) => {
          const decision = decisionOf(p.decision, p.purchaseProbability);
          const color = personaColor(p.name);
          const pct = Math.round(p.purchaseProbability * 100);
          return (
            <Link
              key={p.name}
              href={`/dashboard?view=debate&persona=${personaSlug(p.name)}${keep}`}
              className="tilt-odd grid w-[150px] shrink-0 snap-start justify-items-center gap-2 rounded-wobble border-2 border-border p-4 text-center shadow-sticker transition-transform duration-150 md:w-auto"
              style={{ background: `color-mix(in srgb, ${color} 7%, hsl(var(--card)))` }}
            >
              <Ring value={p.purchaseProbability} color={color} label={`${personaLabel(p.name)} satın alma eğilimi yüzde ${pct}`}>
                <span className="font-display text-xl font-extrabold">%{pct}</span>
              </Ring>
              <span className="font-display text-sm font-bold leading-tight">{personaLabel(p.name)}</span>
              <span className={cn("chip", DECISION_TEXT_CLASS[decision])}>{DECISION_LABEL[decision]}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function ListCard({ title, items, note, empty, chips }: { title: string; items: string[]; note?: string; empty: string; chips?: boolean }) {
  return (
    <section className="card-paper overflow-hidden p-0!">
      <div
        className="bg-secondary px-5 pb-5 pt-4 md:px-6"
        style={{ clipPath: "polygon(0 0,100% 0,100% 82%,92% 92%,80% 84%,66% 94%,52% 85%,38% 95%,24% 85%,10% 94%,0 84%)" }}
      >
        <h2 className="squiggle text-[21px] font-bold">{title}</h2>
      </div>
      <div className="space-y-3 px-5 pb-5 pt-2 md:px-6 md:pb-6">
        {items.length === 0 ? (
          <p className="text-muted-foreground">{empty}</p>
        ) : chips ? (
          <div className="flex flex-wrap gap-2">
            {items.map((item) => (
              <span key={item} className="chip text-accent">{item}</span>
            ))}
          </div>
        ) : (
          <ul className="space-y-2.5">
            {items.map((item, i) => (
              <li key={i} className="flex gap-3 text-foreground-2">
                <span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-full bg-skip" />
                {item}
              </li>
            ))}
          </ul>
        )}
        {note && <p className="text-sm text-foreground-2">{note}</p>}
      </div>
    </section>
  );
}

const PARAMS: Array<{ key: keyof NormalizedProduct; label: string; risk?: boolean }> = [
  { key: "priceFit", label: "Fiyat uyumu" },
  { key: "priceRisk", label: "Fiyat riski", risk: true },
  { key: "qualityScore", label: "Kalite algısı" },
  { key: "trendFit", label: "Trend uyumu" },
  { key: "brandTrust", label: "Marka güveni" },
  { key: "descriptionCompleteness", label: "Açıklama detayı" },
  { key: "visualAppeal", label: "Görsel çekicilik" },
  { key: "seasonFit", label: "Mevsim uyumu" },
  { key: "shippingReturnScore", label: "Kargo / iade" },
  { key: "targetAudienceFit", label: "Hedef kitle uyumu" },
  { key: "differentiationScore", label: "Farklılaşma" },
];

function ParamBars({ product }: { product: NormalizedProduct }) {
  return (
    <div className="card-paper">
      <dl className="grid gap-x-10 gap-y-4 md:grid-cols-2">
        {PARAMS.map(({ key, label, risk }) => {
          const pct = Math.round((product[key] ?? 0) * 100);
          return (
            <div key={key} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5">
              <dt className="text-sm font-bold text-foreground-2">
                {label}
                {risk && <span className="ml-1 font-semibold text-muted-foreground">(düşük iyi)</span>}
              </dt>
              <dd className="font-display text-sm font-extrabold">%{pct}</dd>
              <div className="bar-track col-span-2" aria-hidden>
                <div
                  className="bar-fill"
                  style={{
                    width: `${Math.max(2, pct)}%`,
                    ...(risk ? { background: "repeating-linear-gradient(-45deg, hsl(var(--skip)) 0 6px, hsl(var(--skip) / .75) 6px 10px)" } : {}),
                  }}
                />
              </div>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

/** Markdown the model may answer with, as the plain text a listing takes (Faz 16). */
function plainText(markdown: string): string {
  return markdown
    .replace(/^#+\s*/gm, "")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/\*\*|__|\*|`/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 4000);
}

function ImprovedDescription({ text, images, request }: { text: string; images?: string[]; request: SimulationRequest | null }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="card-paper space-y-4">
      <div className="flex justify-end">
        <button type="button" onClick={copy} className="btn-sticker no-print py-1.5!">
          {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {copied ? "Kopyalandı" : "Kopyala"}
        </button>
      </div>
      {request && <BeforeAfter request={request} description={plainText(text)} />}
      {/* The LLM often answers in Markdown (bold, bullet lists); raw HTML stays escaped (no rehype-raw). */}
      <div className="prose prose-neutral max-w-none text-foreground-2 dark:prose-invert prose-strong:text-foreground prose-li:my-0.5">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
      </div>
      {images && images.length > 0 && (
        <div className="flex gap-3 overflow-x-auto pb-1">
          {images.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- user/scraped URLs and data URLs, not optimisable
            <img key={i} src={url} alt={`Ürün görseli ${i + 1}`} className="h-24 w-24 shrink-0 rounded-wobble border-2 border-border object-cover" />
          ))}
        </div>
      )}
    </div>
  );
}

function BenchmarkView({ markdown, competitors, request }: { markdown?: string; competitors: Competitor[]; request: SimulationRequest | null }) {
  const content = useMemo(() => markdown?.trim(), [markdown]);
  return (
    <section className="space-y-5">
      <h2 className="squiggle text-2xl font-bold">Rakip ve pazar analizi</h2>
      {request && competitors.some((c) => c.price) && <CompetitorCard competitors={competitors} request={request} />}
      {content ? (
        <article className="card-paper prose prose-neutral max-w-none dark:prose-invert prose-headings:font-display prose-strong:text-foreground prose-li:my-1">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </article>
      ) : (
        <EmptyState text="Bu ürün için rakip verisi toplanamadı (Serper anahtarı yok ya da arama zaman aşımına uğradı)." />
      )}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-wobble border-2 border-dashed border-border p-10 text-center text-muted-foreground">{text}</p>;
}

/** The rewritten description on the same 500 people: score, buyers and revenue before and after (Faz 16). */
function BeforeAfter({ request, description }: { request: SimulationRequest; description: string }) {
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const tooShort = description.length < 40;

  const run = async () => {
    setState("busy");
    try {
      // The stored AI analysis describes the old text, so both sides use the rule-based one (as in A/B).
      const base: SimulationRequest = { ...request, inputAnalysis: undefined };
      setResult(await compareVariants(base, { ...base, description }));
      setState("idle");
    } catch {
      setState("error");
    }
  };

  return (
    <div className="no-print flex flex-col gap-3 rounded-wobble border-2 border-dashed border-border bg-secondary px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-foreground-2">
          <b className="font-bold">Bu açıklama işe yarar mı?</b> Aynı 500 kişiyle eski ve yeni açıklamayı karşılaştır.
        </p>
        <button type="button" onClick={run} disabled={state === "busy" || tooShort} className="btn-sticker-primary min-h-11">
          {state === "busy" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
          Bu açıklamayla dene
        </button>
      </div>
      {state === "error" && <p className="note-risk">Karşılaştırma şu an yapılamadı; biraz sonra tekrar dene.</p>}
      {result && <BeforeAfterTable result={result} />}
    </div>
  );
}

/** Score, buyers and revenue of two runs on the same 500 people. */
function BeforeAfterTable({ result }: { result: CompareResponse }) {
  const rows: Array<[string, number, number, (n: number) => string]> = [
    ["Genel skor", result.base.overallScore, result.variant.overallScore, String],
    ["Alıcı", result.base.estimatedBuyers, result.variant.estimatedBuyers, String],
    ["Tahmini ciro", result.base.estimatedBuyers * result.base.price, result.variant.estimatedBuyers * result.variant.price,
      (n) => `${Math.round(n).toLocaleString("tr-TR")} TL`],
  ];
  return (
        <table className="w-full text-sm" aria-live="polite">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1 font-bold">Gösterge</th>
              <th className="py-1 text-right font-bold">Önce</th>
              <th className="py-1 text-right font-bold">Sonra</th>
              <th className="py-1 text-right font-bold">Fark</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, before, after, fmt]) => {
              const delta = after - before;
              return (
                <tr key={label} className="border-t border-dashed border-border">
                  <td className="py-1.5">{label}</td>
                  <td className="py-1.5 text-right">{fmt(before)}</td>
                  <td className="py-1.5 text-right font-bold">{fmt(after)}</td>
                  <td className={cn("py-1.5 text-right font-bold", delta > 0 ? "text-buy-text" : delta < 0 ? "text-skip-text" : "text-muted-foreground")}>
                    {delta > 0 ? "+" : delta < 0 ? "−" : ""}{fmt(Math.abs(delta))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
  );
}

const tl = (n: number) => `${Math.round(n).toLocaleString("tr-TR")} TL`;

/** Where the seller's price sits among similar products, and the town re-run with their median as the going price (Faz 16).
 *  Not a market share: the engine does not simulate the competitors themselves (multinomial choice is a later step). */
function CompetitorCard({ competitors, request }: { competitors: Competitor[]; request: SimulationRequest }) {
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [state, setState] = useState<"idle" | "busy" | "error">("idle");
  const prices = competitors.flatMap((c) => (c.price ? [c.price] : [])).sort((a, b) => a - b);
  const median = prices.length % 2 ? prices[(prices.length - 1) / 2] : (prices[prices.length / 2 - 1] + prices[prices.length / 2]) / 2;
  const own = request.price;
  const diff = Math.round(((own - median) / median) * 100);
  const cheaper = prices.filter((p) => p < own).length;
  const lo = Math.min(own, prices[0]);
  const hi = Math.max(own, prices[prices.length - 1]);
  const at = (p: number) => `${hi > lo ? ((p - lo) / (hi - lo)) * 100 : 50}%`;

  const run = async () => {
    setState("busy");
    try {
      setResult(await compareVariants(request, { ...request, marketPrice: median }));
      setState("idle");
    } catch {
      setState("error");
    }
  };

  return (
    <div className="card-paper flex flex-col gap-4">
      <h3 className="text-[19px] font-bold">Fiyatın rakipler arasında</h3>
      <p className="text-foreground-2">
        Senin fiyatın <b className="font-display">{tl(own)}</b>; {prices.length} benzer ürünün medyanı <b className="font-display">{tl(median)}</b>
        {" "}({diff === 0 ? "aynı" : diff > 0 ? `%${diff} daha pahalı` : `%${-diff} daha ucuz`}). {cheaper} rakip senden ucuz.
      </p>
      <figure>
        <figcaption className="sr-only">Rakip fiyatları ve senin fiyatın, en ucuzdan en pahalıya</figcaption>
        <div className="relative mx-3 h-12" aria-hidden>
          <div className="absolute inset-x-0 top-6 h-0.5 bg-border" />
          {prices.map((p, i) => (
            <span key={i} title={tl(p)} className="absolute top-[18px] h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-card bg-accent" style={{ left: at(p) }} />
          ))}
          <span className="absolute top-0 -translate-x-1/2 text-center" style={{ left: at(own) }}>
            <span className="block text-xs font-bold">sen</span>
            <span className="mx-auto mt-0.5 block h-4 w-4 rotate-45 rounded-[3px] border-2 border-card bg-primary" />
          </span>
        </div>
        <div className="mx-3 flex justify-between text-xs text-muted-foreground" aria-hidden>
          <span>{tl(lo)}</span>
          <span>{tl(hi)}</span>
        </div>
      </figure>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="py-1 pr-3 font-bold">Ürün</th>
            <th className="py-1 pr-3 font-bold">Satıcı</th>
            <th className="py-1 text-right font-bold">Fiyat</th>
          </tr>
        </thead>
        <tbody>
          {competitors.map((c, i) => (
            <tr key={i} className="border-t border-dashed border-border">
              <td className="py-1.5 pr-3">
                {c.link ? <a href={c.link} target="_blank" rel="noopener noreferrer nofollow" className="text-accent underline-offset-2 hover:underline">{c.title}</a> : c.title}
              </td>
              <td className="py-1.5 pr-3 text-muted-foreground">{c.source ?? "–"}</td>
              <td className="py-1.5 text-right font-bold">{c.price ? tl(c.price) : "–"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="no-print flex flex-col gap-3 rounded-wobble border-2 border-dashed border-border bg-secondary px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-foreground-2">
            <b className="font-bold">Kasaba rakip fiyatlarını bilseydi?</b> Kategori ortalaması yerine rakiplerin medyanıyla yeniden hesapla.
          </p>
          <button type="button" onClick={run} disabled={state === "busy"} className="btn-sticker-primary min-h-11">
            {state === "busy" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
            Rakip fiyatlarını referans al
          </button>
        </div>
        {state === "error" && <p className="note-risk">Hesaplama şu an yapılamadı; biraz sonra tekrar dene.</p>}
        {result && <BeforeAfterTable result={result} />}
      </div>
      <p className="text-xs text-muted-foreground">Bu bir pazar payı tahmini değil: kasaba rakip ürünleri ayrıca seçmiyor, yalnızca fiyat karşılaştırmasının dayanağı değişiyor.</p>
    </div>
  );
}
