"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Loader2, Minus } from "lucide-react";
import { compareVariants, apiErrorMessage, priceSweep } from "@/lib/api";
import { CompareResponse, CoreMetrics, PriceSweepResponse, SimulationRequest, SweepPoint } from "@/types";
import { SegmentRing } from "@/components/ui/ring";
import { personaLabel } from "@/lib/personas";
import { cn } from "@/lib/utils";

const tl = (n: number) => `${Math.round(n).toLocaleString("tr-TR")} TL`;

/** "Ne olur?" section: price sensitivity curve + A/B variant comparison (deterministic core, no LLM). */
export default function WhatIf({ request }: { request: SimulationRequest }) {
  return (
    <section className="space-y-4" aria-labelledby="whatif-title">
      <div>
        <h2 id="whatif-title" className="squiggle text-[21px] font-bold">Ne olur?</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Aynı 500 sentetik tüketiciyle hızlı senaryolar. AI kullanılmaz; sonuç anında gelir.
        </p>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <PriceCurve request={request} />
        <AbCompare request={request} />
      </div>
    </section>
  );
}

/* ------------------------------ price curve ------------------------------ */

function PriceCurve({ request }: { request: SimulationRequest }) {
  // Results are tagged with the request they belong to, so a new request shows the spinner without resetting state.
  const [sweep, setSweep] = useState<{ for: SimulationRequest; data?: PriceSweepResponse; error?: string } | null>(null);
  const current = sweep?.for === request ? sweep : null;
  const data = current?.data ?? null;
  const error = current?.error ?? "";
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    let alive = true;
    priceSweep(request)
      .then((res) => alive && setSweep({ for: request, data: res }))
      .catch((err) => alive && setSweep({ for: request, error: apiErrorMessage(err) }));
    return () => {
      alive = false;
    };
  }, [request]);

  return (
    <div className="card-paper space-y-4">
      <h3 className="text-[19px] font-bold">Fiyat duyarlılığı</h3>
      {error && <p className="note-risk">{error}</p>}
      {!data && !error && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Hesaplanıyor…
        </p>
      )}
      {data && (
        <>
          <p className="text-foreground-2">
            En çok ciro <b className="font-display">{tl(data.bestRevenue.price)}</b> fiyatta ({data.bestRevenue.estimatedBuyers} alıcı ·{" "}
            {tl(data.bestRevenue.revenue)}). En çok alıcı <b className="font-display">{tl(data.bestBuyers.price)}</b> fiyatta.
          </p>
          <LineChart points={data.points} current={request.price} />
          <RevenueBars points={data.points} best={data.bestRevenue.price} current={request.price} />
          <p className="text-xs text-muted-foreground">
            Model, fiyatı kategori ortalamasına yakın ürünleri en uyumlu sayar; çok ucuz fiyat kalite şüphesi yaratabilir.
            Bu yüzden eğri her zaman aşağı inmeyebilir.
          </p>
          <button type="button" onClick={() => setShowTable((v) => !v)} className="text-sm font-bold text-accent underline-offset-2 hover:underline">
            {showTable ? "Tabloyu gizle" : "Tablo olarak göster"}
          </button>
          {showTable && <SweepTable points={data.points} />}
        </>
      )}
    </div>
  );
}

const W = 520;
const H = 190;
const PAD = { l: 40, r: 12, t: 14, b: 30 };

function useScales(points: SweepPoint[], value: (p: SweepPoint) => number) {
  const xs = points.map((p) => p.price);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...points.map(value)) * 1.1 || 1;
  const x = (v: number) => PAD.l + ((v - minX) / (maxX - minX || 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => H - PAD.b - (v / maxY) * (H - PAD.t - PAD.b);
  return { x, y, maxY };
}

function LineChart({ points, current }: { points: SweepPoint[]; current: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const { x, y, maxY } = useScales(points, (p) => p.estimatedBuyers);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(p.price)},${y(p.estimatedBuyers)}`).join(" ");
  const ticks = [0, Math.round(maxY / 2), Math.round(maxY)];
  const hovered = hover === null ? null : points[hover];

  return (
    <figure className="relative">
      <figcaption className="mb-1 text-sm font-bold text-foreground-2">Alıcı sayısı (500 bot içinde)</figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Fiyata göre alıcı sayısı çizgi grafiği" onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="hsl(var(--border))" strokeWidth={1} />
            <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" className="fill-muted-foreground text-[11px]">{t}</text>
          </g>
        ))}
        <line x1={x(current)} x2={x(current)} y1={PAD.t} y2={H - PAD.b} stroke="hsl(var(--foreground-2))" strokeDasharray="4 4" strokeWidth={1.5} />
        <text x={x(current)} y={PAD.t - 2} textAnchor="middle" className="fill-foreground-2 text-[11px] font-bold">şu an</text>
        <path d={path} fill="none" stroke="hsl(var(--primary))" strokeWidth={2.5} strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={p.price}>
            <circle cx={x(p.price)} cy={y(p.estimatedBuyers)} r={hover === i ? 6 : 4} fill="hsl(var(--primary))" stroke="hsl(var(--card))" strokeWidth={2} />
            {/* larger invisible hit target */}
            <rect x={x(p.price) - 22} y={PAD.t} width={44} height={H - PAD.t - PAD.b} fill="transparent" onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={`${tl(p.price)}: ${p.estimatedBuyers} alıcı`} />
          </g>
        ))}
        {points.filter((_, i) => i % 2 === 0).map((p) => (
          <text key={p.price} x={x(p.price)} y={H - 10} textAnchor="middle" className="fill-muted-foreground text-[11px]">{Math.round(p.price)}</text>
        ))}
      </svg>
      {hovered && (
        <div className="pointer-events-none absolute top-6 rounded-xl border-2 border-foreground bg-card px-3 py-1.5 text-xs font-bold shadow-sticker-ink" style={{ left: `clamp(0px, calc(${(x(hovered.price) / W) * 100}% - 60px), calc(100% - 130px))` }}>
          {tl(hovered.price)} · {hovered.estimatedBuyers} alıcı · skor {hovered.overallScore}
        </div>
      )}
    </figure>
  );
}

function RevenueBars({ points, best, current }: { points: SweepPoint[]; best: number; current: number }) {
  const max = Math.max(...points.map((p) => p.revenue)) || 1;
  return (
    <figure>
      <figcaption className="mb-1 text-sm font-bold text-foreground-2">Tahmini ciro (alıcı × fiyat)</figcaption>
      <div className="flex h-20 items-end gap-[2px]" role="img" aria-label="Fiyata göre tahmini ciro çubuk grafiği">
        {points.map((p) => (
          <div key={p.price} className="group relative flex h-full flex-1 flex-col justify-end" title={`${tl(p.price)}: ${tl(p.revenue)}`}>
            <div
              className={cn("rounded-t-[4px]", p.price === best ? "bg-accent" : "bg-accent/45", Math.abs(p.price - current) < 0.01 && "outline outline-2 outline-offset-1 outline-foreground-2")}
              style={{ height: `${(p.revenue / max) * 100}%` }}
            />
          </div>
        ))}
      </div>
    </figure>
  );
}

function SweepTable({ points }: { points: SweepPoint[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="py-1 pr-3 font-bold">Fiyat</th>
            <th className="py-1 pr-3 font-bold">Alıcı</th>
            <th className="py-1 pr-3 font-bold">Skor</th>
            <th className="py-1 font-bold">Ciro</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.price} className="border-t border-dashed border-border">
              <td className="py-1 pr-3">{tl(p.price)}</td>
              <td className="py-1 pr-3">{p.estimatedBuyers}</td>
              <td className="py-1 pr-3">{p.overallScore}</td>
              <td className="py-1">{tl(p.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------ A/B compare ------------------------------ */

function AbCompare({ request }: { request: SimulationRequest }) {
  const [price, setPrice] = useState(String(request.price));
  const [name, setName] = useState(request.productName);
  const [description, setDescription] = useState(request.description);
  const [shippingDays, setShippingDays] = useState(String(request.commerce.shippingDays));
  const [returnAvailable, setReturnAvailable] = useState(request.commerce.returnAvailable);
  const [warranty, setWarranty] = useState(request.commerce.warranty);
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const textChanged = name !== request.productName || description !== request.description;
    // The stored AI analysis describes the original text; if the text changes, both sides use the
    // same rule-based analysis so the comparison stays fair.
    const base: SimulationRequest = textChanged ? { ...request, inputAnalysis: undefined } : request;
    const variant: SimulationRequest = {
      ...base,
      price: Number(price.replace(",", ".")) || request.price,
      productName: name,
      description,
      commerce: { ...request.commerce, shippingDays: Number(shippingDays) || 0, returnAvailable, warranty },
    };
    try {
      setResult(await compareVariants(base, variant));
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card-paper space-y-4">
      <h3 className="text-[19px] font-bold">A/B karşılaştırma</h3>
      <p className="text-sm text-muted-foreground">Varyant B için değiştirmek istediklerinizi düzenleyin.</p>
      <form onSubmit={run} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_8rem_7rem]">
          <label className="space-y-1 text-sm font-bold text-foreground-2">
            Ürün adı
            <input value={name} onChange={(e) => setName(e.target.value)} minLength={4} maxLength={120} required className="field" />
          </label>
          <label className="space-y-1 text-sm font-bold text-foreground-2">
            Fiyat (TL)
            <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min="1" max="10000000" step="0.01" required className="field" />
          </label>
          <label className="space-y-1 text-sm font-bold text-foreground-2">
            Kargo (gün)
            <input value={shippingDays} onChange={(e) => setShippingDays(e.target.value)} type="number" min="0" max="60" className="field" />
          </label>
        </div>
        <label className="block space-y-1 text-sm font-bold text-foreground-2">
          Açıklama
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} minLength={40} maxLength={4000} rows={3} required className="field resize-y" />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 rounded-full border-2 border-border bg-card px-3 py-1.5 text-sm font-bold">
            <input type="checkbox" checked={returnAvailable} onChange={(e) => setReturnAvailable(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
            İade
          </label>
          <label className="flex items-center gap-2 rounded-full border-2 border-border bg-card px-3 py-1.5 text-sm font-bold">
            <input type="checkbox" checked={warranty} onChange={(e) => setWarranty(e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
            Garanti
          </label>
          <button type="submit" disabled={busy} className="btn-sticker-primary ml-auto">
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Karşılaştır
          </button>
        </div>
      </form>
      {error && <p className="note-risk">{error}</p>}
      {result && <CompareResult result={result} />}
    </div>
  );
}

function MiniRing({ label, m }: { label: string; m: CoreMetrics }) {
  const d = m.decisionDistribution;
  return (
    <div className="grid justify-items-center gap-1">
      <span className="font-display text-sm font-bold">{label} · {tl(m.price)}</span>
      <SegmentRing
        size={130}
        stroke={14}
        segments={[
          { label: "Aldı", value: d.buy, color: "hsl(var(--buy))" },
          { label: "Kararsız", value: d.watch, color: "hsl(var(--watch))" },
          { label: "Almadı", value: d.skip, color: "hsl(var(--skip))" },
        ]}
      >
        <span className="font-display text-2xl font-extrabold leading-none">{m.overallScore}</span>
      </SegmentRing>
    </div>
  );
}

function CompareResult({ result }: { result: CompareResponse }) {
  const { base, variant } = result;
  const rows: Array<[string, number, number]> = [
    ["Genel skor", base.overallScore, variant.overallScore],
    ["Alıcı", base.estimatedBuyers, variant.estimatedBuyers],
    ["Tahmini ciro (bin TL)", Math.round((base.estimatedBuyers * base.price) / 1000), Math.round((variant.estimatedBuyers * variant.price) / 1000)],
    ["Pazar genişliği", base.marketBreadthScore, variant.marketBreadthScore],
    ["Niyet dönüşümü", base.intentConversionScore, variant.intentConversionScore],
    ["Problem uyumu", base.problemSolutionFit, variant.problemSolutionFit],
  ];

  return (
    <div className="space-y-4 border-t-2 border-dashed border-border pt-4" aria-live="polite">
      <div className="grid grid-cols-2 gap-4">
        <MiniRing label="A" m={base} />
        <MiniRing label="B" m={variant} />
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="py-1 font-bold">Gösterge</th>
            <th className="py-1 text-right font-bold">A</th>
            <th className="py-1 text-right font-bold">B</th>
            <th className="py-1 text-right font-bold">Fark</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, a, b]) => {
            const delta = b - a;
            const Icon = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;
            return (
              <tr key={label} className="border-t border-dashed border-border">
                <td className="py-1.5">{label}</td>
                <td className="py-1.5 text-right">{a}</td>
                <td className="py-1.5 text-right font-bold">{b}</td>
                <td className={cn("py-1.5 text-right font-bold", delta > 0 ? "text-buy-text" : delta < 0 ? "text-skip-text" : "text-muted-foreground")}>
                  <span className="inline-flex items-center gap-0.5">
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                    {delta > 0 ? "+" : ""}
                    {delta}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {variant.topPersona && (
        <p className="text-sm text-foreground-2">
          B&apos;de en istekli persona: <b>{personaLabel(variant.topPersona)}</b>
        </p>
      )}
    </div>
  );
}
