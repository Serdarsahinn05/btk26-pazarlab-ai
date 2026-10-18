"use client";

import { useEffect, useState } from "react";
import { ClipboardPaste, Link2, Loader2, Plus, Sparkles, X } from "lucide-react";
import { apiErrorMessage, competitorChoice, readProductLink, readProductPage, savedCompetitorChoice } from "@/lib/api";
import { ChoiceOption, Competitor, CompetitorChoiceResult, CompetitorInput, ProductLinkReadResponse } from "@/types";
import { cn } from "@/lib/utils";

/* Faz 21: the seller's product against 1–3 rivals on the same 500 residents (multinomial choice, no AI).
   Rivals come from a link (read by the server), copied page text, or the price search; empty fields are
   assumed equal to the seller's product and the result says so. */

const MAX_RIVALS = 3;
const pct = (rate: number) => `%${Math.round(rate * 100)}`;
const tl = (n: number) => `${Math.abs(Math.round(n)).toLocaleString("tr-TR")} TL`;

type Tri = "" | "yes" | "no";

interface Draft {
  id: number;
  url: string;
  pasted: string;
  showPaste: boolean;
  name: string;
  price: string;
  description: string;
  rating: string;
  reviewCount: string;
  shippingDays: string;
  returns: Tri;
  warranty: Tri;
  features: Record<string, string | number | boolean>;
  reading: boolean;
  note: string | null;
}

let nextId = 1;
const emptyDraft = (patch: Partial<Draft> = {}): Draft => ({
  id: nextId++, url: "", pasted: "", showPaste: false, name: "", price: "", description: "", rating: "", reviewCount: "",
  shippingDays: "", returns: "", warranty: "", features: {}, reading: false, note: null, ...patch,
});

const tri = (value?: boolean): Tri => (value === undefined ? "" : value ? "yes" : "no");
const fromTri = (value: Tri) => (value === "" ? undefined : value === "yes");
const num = (text: string) => (text.trim() === "" ? undefined : Number(text.replace(",", ".")));

function fromInput(c: CompetitorInput): Draft {
  return emptyDraft({
    url: c.url ?? "", name: c.name, price: String(c.price), description: c.description ?? "",
    rating: c.rating?.toString() ?? "", reviewCount: c.reviewCount?.toString() ?? "", shippingDays: c.shippingDays?.toString() ?? "",
    returns: tri(c.returnAvailable), warranty: tri(c.warranty), features: c.features ?? {},
  });
}

function toInput(d: Draft): CompetitorInput {
  const input: CompetitorInput = { name: d.name.trim(), price: Number(d.price.replace(",", ".")) };
  if (d.url.trim()) input.url = d.url.trim();
  if (d.description.trim()) input.description = d.description.trim();
  if (Object.keys(d.features).length) input.features = d.features;
  const optional = { rating: num(d.rating), reviewCount: num(d.reviewCount), shippingDays: num(d.shippingDays) };
  for (const [key, value] of Object.entries(optional)) if (value !== undefined && Number.isFinite(value)) Object.assign(input, { [key]: value });
  if (fromTri(d.returns) !== undefined) input.returnAvailable = fromTri(d.returns);
  if (fromTri(d.warranty) !== undefined) input.warranty = fromTri(d.warranty);
  return input;
}

/** Reader result → the fields this form has. Only plain feature values travel on (the server drops unknown keys). */
function fromReader(r: ProductLinkReadResponse): Partial<Draft> {
  const features: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(r.features ?? {})) if (/^[A-Za-z]{1,40}$/.test(key) && value !== null) features[key] = value;
  return {
    name: (r.title ?? "").slice(0, 120),
    price: r.price ? String(r.price) : "",
    description: (r.description ?? "").slice(0, 4000),
    rating: r.rating?.toString() ?? "",
    reviewCount: r.review_count?.toString() ?? "",
    features,
    note: r.title && r.price ? null : "Sayfadan ad veya fiyat okunamadı; elle tamamla.",
  };
}

export default function CompetitorChoice({ simulationId, found }: { simulationId: string; found: Competitor[] }) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [result, setResult] = useState<CompetitorChoiceResult | null>(null);
  const [state, setState] = useState<"loading" | "idle" | "busy">("loading");
  const [error, setError] = useState<string | null>(null);

  // Rivals saved with this result (a shared link shows the same comparison).
  useEffect(() => {
    let cancelled = false;
    savedCompetitorChoice(simulationId)
      .then((saved) => {
        if (cancelled) return;
        setDrafts(saved.competitors.length ? saved.competitors.map(fromInput) : [emptyDraft()]);
        setResult(saved.result);
      })
      .catch(() => !cancelled && setDrafts([emptyDraft()]))
      .finally(() => !cancelled && setState("idle"));
    return () => {
      cancelled = true;
    };
  }, [simulationId]);

  const update = (id: number, patch: Partial<Draft>) => setDrafts((all) => all.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const remove = (id: number) => setDrafts((all) => (all.length > 1 ? all.filter((d) => d.id !== id) : [emptyDraft()]));
  const add = (patch: Partial<Draft> = {}) =>
    setDrafts((all) => {
      const blank = all.findIndex((d) => !d.name && !d.url && !d.price);
      if (blank >= 0) return all.map((d, i) => (i === blank ? { ...d, ...patch } : d));
      return all.length < MAX_RIVALS ? [...all, emptyDraft(patch)] : all;
    });

  const read = async (d: Draft, how: "link" | "text") => {
    update(d.id, { reading: true, note: null });
    try {
      const page = how === "link" ? await readProductLink(d.url.trim()) : await readProductPage({ text: d.pasted, url: d.url.trim() || undefined });
      update(d.id, { ...fromReader(page), reading: false, showPaste: false, pasted: "" });
    } catch (err) {
      const hint = how === "link" ? " Sayfa metnini kopyalayıp yapıştırmayı dene." : "";
      update(d.id, { reading: false, showPaste: how === "link" || d.showPaste, note: apiErrorMessage(err) + hint });
    }
  };

  const ready = drafts.filter((d) => d.name.trim().length >= 4 && Number(d.price.replace(",", ".")) > 0);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setState("busy");
    setError(null);
    try {
      setResult((await competitorChoice(simulationId, ready.map(toInput))).result);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setState("idle");
    }
  };

  const unused = found.filter((c) => c.price && !drafts.some((d) => d.name === c.title.slice(0, 120))).slice(0, 6);

  return (
    <section className="card-paper flex flex-col gap-5" aria-labelledby="rakip-pay">
      <div>
        <h3 id="rakip-pay" className="text-[19px] font-bold">Rakiplerle yarıştır</h3>
        <p className="mt-1 text-sm text-foreground-2">
          1–3 rakibin linkini ekle; aynı 500 sakin senin ürününle rakipler ve hiçbiri arasında seçsin. Boş bıraktığın alanlar
          senin ürününle aynı sayılır.
        </p>
      </div>

      {state === "loading" ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Kayıtlı rakipler yükleniyor…</p>
      ) : (
        <form onSubmit={submit} className="no-print flex flex-col gap-4">
          {drafts.map((d, i) => (
            <RivalFields key={d.id} draft={d} index={i} onChange={(patch) => update(d.id, patch)} onRead={(how) => read(d, how)} onRemove={() => remove(d.id)} />
          ))}

          {unused.length > 0 && drafts.length <= MAX_RIVALS && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-bold text-foreground-2">Fiyat aramasında bulunanlardan ekle <span className="font-normal text-muted-foreground">(yalnızca ad ve fiyat: eşit kalite varsayımıyla)</span></p>
              <div className="flex flex-wrap gap-2">
                {unused.map((c, i) => (
                  <button key={i} type="button" onClick={() => add({ name: c.title.slice(0, 120), price: String(c.price), url: c.link ?? "" })}
                    className="max-w-full truncate rounded-full border-2 border-border bg-card px-3 py-1.5 text-left text-sm hover:border-accent">
                    <Plus className="mr-1 inline h-3.5 w-3.5" aria-hidden />{c.title.slice(0, 48)} · <b>{tl(c.price ?? 0)}</b>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {drafts.length < MAX_RIVALS && (
              <button type="button" onClick={() => setDrafts((all) => [...all, emptyDraft()])} className="text-sm font-bold text-accent underline-offset-2 hover:underline">
                + Rakip ekle
              </button>
            )}
            <button type="submit" disabled={state === "busy" || ready.length === 0} className="btn-sticker-primary ml-auto min-h-11">
              {state === "busy" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
              Payı hesapla
            </button>
          </div>
          {error && <p className="note-risk" role="alert">{error}</p>}
        </form>
      )}

      {result && <ChoiceResult result={result} />}
    </section>
  );
}

function RivalFields({ draft: d, index, onChange, onRead, onRemove }: {
  draft: Draft; index: number; onChange: (patch: Partial<Draft>) => void; onRead: (how: "link" | "text") => void; onRemove: () => void;
}) {
  const label = "flex flex-col gap-1 text-sm leading-5 font-bold text-foreground-2";
  return (
    <fieldset className="relative flex flex-col gap-3 rounded-wobble border-2 border-dashed border-border bg-secondary px-4 py-3">
      {/* The legend must be the fieldset's first child to name the group. */}
      <legend className="float-left pr-10 font-bold">Rakip {index + 1}</legend>
      <button type="button" onClick={onRemove} aria-label={`Rakip ${index + 1}'i kaldır`} className="absolute top-2 right-2 rounded-full p-1 text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" aria-hidden />
      </button>
      <div className="flex flex-wrap items-end gap-2">
        <label className={cn(label, "min-w-0 flex-1 basis-60")}>
          Ürün linki
          <input value={d.url} onChange={(e) => onChange({ url: e.target.value })} type="url" maxLength={2048} placeholder="https://…" className="field" />
        </label>
        <button type="button" onClick={() => onRead("link")} disabled={d.reading || !/^https?:\/\/\S+/.test(d.url.trim())} className="btn-sticker min-h-11">
          {d.reading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
          Linkten oku
        </button>
        <button type="button" onClick={() => onChange({ showPaste: !d.showPaste })} aria-expanded={d.showPaste} className="btn-sticker min-h-11">
          <ClipboardPaste className="h-4 w-4" aria-hidden /> Metin yapıştır
        </button>
      </div>
      {d.showPaste && (
        <div className="flex flex-col gap-2">
          <label className={label}>
            Sayfa metni (Ctrl+A, Ctrl+C ile kopyala)
            <textarea value={d.pasted} onChange={(e) => onChange({ pasted: e.target.value })} rows={3} maxLength={200_000} className="field resize-y" />
          </label>
          <button type="button" onClick={() => onRead("text")} disabled={d.reading || d.pasted.trim().length < 20} className="btn-sticker self-start">
            Metinden oku
          </button>
        </div>
      )}
      {d.note && <p className="text-sm text-skip-text" role="status">{d.note}</p>}
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <label className={label}>
          Ürün adı
          <input value={d.name} onChange={(e) => onChange({ name: e.target.value })} minLength={4} maxLength={120} className="field" />
        </label>
        <label className={label}>
          Fiyat (TL)
          <input value={d.price} onChange={(e) => onChange({ price: e.target.value })} inputMode="decimal" className="field" />
        </label>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer font-bold text-accent">Ayrıntılar (boşsa senin ürününle aynı sayılır)</summary>
        <div className="mt-3 flex flex-col gap-3">
          <label className={label}>
            Açıklama
            <textarea value={d.description} onChange={(e) => onChange({ description: e.target.value })} rows={3} maxLength={4000} className="field resize-y" />
          </label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <label className={label}>
              Puan (5)
              <input value={d.rating} onChange={(e) => onChange({ rating: e.target.value })} inputMode="decimal" className="field" />
            </label>
            <label className={label}>
              Değerlendirme
              <input value={d.reviewCount} onChange={(e) => onChange({ reviewCount: e.target.value })} inputMode="numeric" className="field" />
            </label>
            <label className={label}>
              Kargo (gün)
              <input value={d.shippingDays} onChange={(e) => onChange({ shippingDays: e.target.value })} inputMode="numeric" className="field" />
            </label>
            <TriSelect label="İade" value={d.returns} onChange={(returns) => onChange({ returns })} />
            <TriSelect label="Garanti" value={d.warranty} onChange={(warranty) => onChange({ warranty })} />
          </div>
        </div>
      </details>
    </fieldset>
  );
}

function TriSelect({ label, value, onChange }: { label: string; value: Tri; onChange: (v: Tri) => void }) {
  return (
    <label className="flex flex-col gap-1 text-sm leading-5 font-bold text-foreground-2">
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value as Tri)} className="field">
        <option value="">Bilinmiyor</option>
        <option value="yes">Var</option>
        <option value="no">Yok</option>
      </select>
    </label>
  );
}

/* ------------------------------ result ------------------------------ */

function ChoiceResult({ result }: { result: CompetitorChoiceResult }) {
  const [showTable, setShowTable] = useState(false);
  const rows = [...result.options.map((o) => ({ ...o, label: o.key === "own" ? "Senin ürünün" : o.name })),
    { ...result.none, key: "none", label: "Hiçbirini almadı" }];
  const rivals = result.options.slice(1);

  return (
    <div className="flex flex-col gap-5" aria-live="polite">
      <figure className="flex flex-col gap-2">
        <figcaption className="text-sm font-bold text-foreground-2">
          Tahmini pay <span className="font-normal text-muted-foreground">· {result.simulatedConsumers} sakin, {result.runs} tur; parantezde turların %80&apos;i</span>
        </figcaption>
        {rows.map((row) => (
          <div key={row.key} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-2 text-sm sm:grid-cols-[minmax(0,14rem)_1fr_auto]"
            title={`${row.label}: ${pct(row.share)} (${pct(row.low)}–${pct(row.high)}), yaklaşık ${row.residents} sakin`}>
            <span className={cn("truncate", row.key === "own" ? "font-bold" : "text-foreground-2")}>{row.label}</span>
            <div className="h-3 rounded-r-[4px] bg-secondary" aria-hidden>
              <div className={cn("h-full rounded-r-[4px]", row.key === "none" ? "bg-border" : "bg-accent")} style={{ width: `${Math.max(1, row.share * 100)}%` }} />
            </div>
            <span className="text-right">
              <b className="font-display font-extrabold">{pct(row.share)}</b>
              <span className="ml-1 text-xs text-muted-foreground">({pct(row.low)}–{pct(row.high)})</span>
            </span>
          </div>
        ))}
      </figure>

      <ul className="flex flex-col gap-2 text-sm">
        {rivals.map((r) => <RivalNote key={r.key} rival={r} />)}
      </ul>

      {result.bestChanges.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-bold">Rakiplere karşı en etkili değişiklik</p>
          <ol className="flex flex-col gap-2">
            {result.bestChanges.map((c, i) => (
              <li key={c.key} className="flex gap-3 text-sm">
                <span className="num-badge">{i + 1}</span>
                <span className="pt-0.5">
                  <b>{c.label}</b>
                  {" · "}
                  <span className={c.deltaBuyers >= 0 ? "font-bold text-buy-text" : "font-bold text-skip-text"}>
                    {c.deltaBuyers >= 0 ? "+" : "−"}{Math.abs(c.deltaBuyers)} sakin ({c.deltaShare >= 0 ? "+" : "−"}{Math.abs(Math.round(c.deltaShare * 1000) / 10)} puan)
                  </span>
                  {c.deltaRevenue < 0 ? <span className="text-skip-text"> · ama ciro {tl(c.deltaRevenue)} düşer</span> : <span className="text-foreground-2"> · ciro +{tl(c.deltaRevenue)}</span>}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <button type="button" onClick={() => setShowTable((v) => !v)} aria-expanded={showTable} className="self-start text-sm font-bold text-accent underline-offset-2 hover:underline">
          {showTable ? "Persona kırılımını gizle" : "Hangi persona kime gidiyor?"}
        </button>
        {showTable && <PersonaTable result={result} />}
      </div>

      <p className="text-xs text-muted-foreground">
        Tahmini; sentetik bir kasabaya dayanır. Rakipler senin ürününle aynı kurallarla puanlandı (AI analizi kullanılmadı) ve
        karar ilk haftanınki (ağızdan ağıza yayılma yok); bu yüzden senin payın ana sonuçtaki alıcı sayısından biraz farklı olabilir.
      </p>
    </div>
  );
}

function RivalNote({ rival }: { rival: ChoiceOption }) {
  const reasons = rival.reasons ?? [];
  return (
    <li className="flex flex-col gap-1 border-t border-dashed border-border pt-2">
      <span>
        <b>{rival.name}</b> <span className="text-muted-foreground">· {tl(rival.price)}</span>
        {rival.equalQuality && <span className="ml-2 inline-block rounded-full border-2 border-border px-2 py-0.5 text-xs font-bold whitespace-nowrap">eşit kalite varsayımıyla</span>}
      </span>
      <span className="text-foreground-2">
        {reasons.length === 0
          ? "Senin ürününe karşı belirgin bir üstünlüğü yok."
          : <>Bu rakibe gidenlerin gerekçesi: {reasons.map((r, i) => (
              <span key={r.key}>{i > 0 && ", "}<b>{pct(r.share)} {r.label}</b>{r.detail ? ` (en çok ${r.detail})` : ""}</span>
            ))}.</>}
      </span>
      {!rival.equalQuality && rival.assumed.length > 0 && (
        <span className="text-xs text-muted-foreground">Senin ürününle aynı varsayıldı: {rival.assumed.join(", ")}.</span>
      )}
    </li>
  );
}

function PersonaTable({ result }: { result: CompetitorChoiceResult }) {
  const heads = [...result.options.map((o, i) => (i === 0 ? "Sen" : `Rakip ${i}`)), "Hiçbiri"];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[360px] text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="py-1 pr-3 font-bold">Persona</th>
            {heads.map((h) => <th key={h} className="py-1 pl-2 text-right font-bold">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {result.personas.map((row) => (
            <tr key={row.persona} className="border-t border-dashed border-border">
              <td className="py-1 pr-3">{row.persona} <span className="text-muted-foreground">({row.residents})</span></td>
              {row.shares.map((s, i) => <td key={i} className={cn("py-1 pl-2 text-right", i === 0 && "font-bold")}>{pct(s)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
