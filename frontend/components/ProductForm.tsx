"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ClipboardPaste, History, Link2, Loader2, Sparkles, Star, Trash2, Upload } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ReadinessPanel, { ReadinessBar, formatGain } from "@/components/ReadinessPanel";
import { DraftCheckResponse, ImageAnalysis, ProductLinkReadResponse, PurchaseMotivation, SimulationRequest } from "@/types";
import { analyzeImages, apiErrorMessage, draftCheck, readProductLink, readProductPage } from "@/lib/api";
import { FAMILIES, OTHER, type FormField, categoryInfo, categoryLabel, detectCategory, isKnownCategory } from "@/lib/categories";
import { readImportHash } from "@/lib/extensionImport";
import { type HistoryEntry, loadHistory } from "@/lib/history";
import {
  EMPTY_VALUES, type Values, clearDraft, fromRequest, hasContent, loadDraft, missingRequired, saveDraft, toDraft, toRequest,
} from "@/lib/productDraft";
import { cn } from "@/lib/utils";

// Backend accepts at most 6 images of ~1.5 MB each (see SimulationRequest.images).
const MAX_IMAGES = 6;
const MAX_IMAGE_EDGE = 1280;
const DRAFT_CHECK_DELAY_MS = 700;
// Radix Select cannot hold "" as an item value; this item clears a choice.
const NONE = "__none";

const MOTIVATIONS: Array<[PurchaseMotivation, string]> = [
  ["stil_begeni", "Stil / beğeni"],
  ["ihtiyac", "Günlük ihtiyaç"],
  ["problem_cozme", "Problem çözme"],
  ["yedek_parca_tamir", "Yedek parça / tamir"],
  ["hediye", "Hediye"],
  ["trend", "Trend / sosyal medya"],
  ["profesyonel_kullanim", "Profesyonel kullanım"],
];

/** Re-encode an uploaded photo as a JPEG no larger than MAX_IMAGE_EDGE on its long side. */
function downscaleImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image decode failed"));
    };
    img.src = url;
  });
}

interface ProductFormProps {
  onSubmit: (data: SimulationRequest) => void;
  isLoading: boolean;
}

type LinkState =
  | { status: "idle" }
  | { status: "reading" }
  | { status: "done"; text: string; note?: { text: string; check: boolean } | null; rating?: { value: number; count: number | null } | null }
  | { status: "error"; text: string };

export default function ProductForm({ onSubmit, isLoading }: ProductFormProps) {
  const [category, setCategory] = useState("tisort");
  const [motivation, setMotivation] = useState<PurchaseMotivation>(categoryInfo("tisort").defaultMotivation);
  const [values, setValues] = useState<Values>(EMPTY_VALUES);
  // Inputs the link reader filled; the mark goes away once the seller touches the field.
  const [autoFilled, setAutoFilled] = useState<Set<string>>(new Set());
  const [images, setImages] = useState<string[]>([]);
  const [link, setLink] = useState<LinkState>({ status: "idle" });
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [restored, setRestored] = useState(false);
  const [recent, setRecent] = useState<HistoryEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  // Fallback when the link cannot be read: the seller pastes the page's text (or its HTML).
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const info = useMemo(() => categoryInfo(category), [category]);
  const family = FAMILIES.find((f) => f.id === info.family) ?? FAMILIES[0];
  const fields = info.form.fields;
  // F23: with "Genel" the family's average price is the reference (Giyim 800 TL for a 350 TL t-shirt); offer the subtype the name says.
  const productName = String(values.productName ?? "");
  const nameGuess = useMemo(() => {
    if (category !== info.family) return null;
    const guess = detectCategory(productName);
    return guess && guess !== info.family && categoryInfo(guess).family === info.family ? guess : null;
  }, [category, info.family, productName]);

  // Browser-only state (draft, history) is read after mount so the server render matches the first client render.
  useEffect(() => {
    const draft = loadDraft();
    const history = loadHistory().filter((entry) => entry.request).slice(0, 3);
    queueMicrotask(() => {
      setRecent(history);
      if (draft && hasContent(draft.values) && isKnownCategory(draft.category)) {
        setCategory(draft.category);
        setMotivation(draft.motivation);
        setValues({ ...EMPTY_VALUES, ...draft.values });
        setImages(draft.images ?? []);
        setSavedAt(draft.savedAt);
        setRestored(true);
      }
    });
  }, []);

  // Keep the draft in this browser while typing.
  useEffect(() => {
    if (!hasContent(values)) return;
    const timer = setTimeout(() => setSavedAt(saveDraft({ category, motivation, values, images })), 500);
    return () => clearTimeout(timer);
  }, [category, motivation, values, images]);

  const draft = useMemo(() => toDraft(category, motivation, values, fields), [category, motivation, values, fields]);
  const check = useDraftCheck(draft);
  const missing = missingRequired(values, fields);
  const gainOf = useMemo(() => new Map((check.data?.gains ?? []).map((g) => [g.field, g.delta])), [check.data]);

  const set = (name: string, value: string | boolean) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setAutoFilled((prev) => {
      if (!prev.has(name)) return prev;
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
  };

  const changeCategory = (next: string) => {
    setCategory(next);
    setMotivation(categoryInfo(next).defaultMotivation);
  };

  const pickCategory = (value: string | null) => {
    // Radix fires "" when the subtype list is rebuilt after a family change; that is not a choice.
    if (!value) return;
    if (link.status === "done") setLink({ ...link, note: null });
    changeCategory(value);
  };

  /** Fill the form from what the link reader or the page reader found. */
  const applyRead = (result: ProductLinkReadResponse) => {
    const next = isKnownCategory(result.category) ? result.category : OTHER;
    const patch = linkValues(result);
    changeCategory(next);
    setValues((prev) => ({ ...prev, ...patch }));
    setAutoFilled(new Set(Object.keys(patch)));
    if (result.images?.length || result.image) {
      setImages((result.images?.length ? result.images : [result.image as string]).slice(0, MAX_IMAGES));
    }
    const visible = new Set(["productName", "description", "price", "rating", "reviewCount", ...categoryInfo(next).form.fields.map((f) => f.name)]);
    const filled = Object.keys(patch).filter((key) => visible.has(key)).length;
    setLink({
      status: "done",
      text: result.warnings[0] ?? (filled ? `${filled} alan dolduruldu. Mavi işaretli alanları kontrol et.` : "Sayfadan bilgi okunamadı; alanları elle doldur."),
      note: linkCategoryNote(result),
      rating: result.rating != null ? { value: result.rating, count: result.review_count ?? null } : null,
    });
    if (!filled) setPasteOpen(true);
  };

  // A product sent by the browser extension (#import=…) wins over the saved draft; the hash is dropped after use.
  useEffect(() => {
    const imported = readImportHash(window.location.hash);
    if (!imported) return;
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    queueMicrotask(() => {
      applyRead(imported);
      if (imported.url) setValues((prev) => ({ ...prev, productUrl: imported.url }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount, after the draft restore above
  }, []);

  const readLink = async () => {
    const url = String(values.productUrl ?? "").trim();
    if (!url) {
      setLink({ status: "error", text: "Önce ürün linkini yapıştır." });
      return;
    }
    setLink({ status: "reading" });
    try {
      applyRead(await readProductLink(url));
    } catch (err: unknown) {
      setLink({ status: "error", text: apiErrorMessage(err) });
      setPasteOpen(true);
    }
  };

  const readPasted = async () => {
    const content = pasteText.trim();
    if (!content) return;
    setLink({ status: "reading" });
    try {
      const url = String(values.productUrl ?? "").trim();
      // A paste that starts like markup is the page source (e.g. "view source"); anything else is its visible text.
      applyRead(await readProductPage(content.startsWith("<") ? { html: content, url } : { text: content, url }));
      setPasteText("");
      setPasteOpen(false);
    } catch (err: unknown) {
      setLink({ status: "error", text: apiErrorMessage(err) });
    }
  };

  const copyFrom = (entry: HistoryEntry) => {
    if (!entry.request) return;
    const request = entry.request;
    setCategory(isKnownCategory(request.category) ? request.category : OTHER);
    setMotivation(request.purchaseMotivation);
    setValues(fromRequest(request));
    setAutoFilled(new Set());
    setImages([]);
    setLink({ status: "done", text: `“${entry.productName}” yüklendi; değiştirmek istediklerini düzenle.` });
  };

  const clearForm = () => {
    clearDraft();
    setValues(EMPTY_VALUES);
    setAutoFilled(new Set());
    setImages([]);
    setSavedAt(null);
    setRestored(false);
    setLink({ status: "idle" });
    changeCategory("tisort");
  };

  const focusField = (name: string) => {
    const target = document.getElementById(name);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    target?.focus({ preventScroll: true });
  };

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(async (file) => {
      if (!file.type.startsWith("image/")) return;
      try {
        const result = await downscaleImage(file);
        setImages((prev) => (prev.includes(result) ? prev : [...prev, result].slice(0, MAX_IMAGES)));
      } catch {
        setLink({ status: "error", text: "Görsel okunamadı." });
      }
    });
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(toRequest(category, motivation, values, fields, images));
  };

  const descriptionWords = String(values.description ?? "").trim().split(/\s+/).filter(Boolean).length;
  const productDone = !missing.some((m) => m === "Ürün adı" || m === "Fiyat" || m.startsWith("Açıklama"));
  const featuresDone = !fields.some((f) => f.required && !String(values[f.name] ?? "").trim());
  const textProps = (name: string) => ({
    id: name,
    name,
    value: String(values[name] ?? ""),
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(name, e.target.value),
  });

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Link first: the fastest way in is the product page the seller already has. */}
      <section aria-labelledby="link-title" className="card-paper flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 id="link-title" className="squiggle text-[21px] font-bold">Linkten başla</h2>
          <span className="text-sm text-muted-foreground">Trendyol, Hepsiburada, Amazon, n11…</span>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="productUrl" className="sr-only">Ürün linki</label>
          <input
            {...textProps("productUrl")}
            type="url"
            maxLength={2048}
            placeholder="Ürün sayfasının linkini yapıştır"
            className="field h-12 text-base"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                readLink();
              }
            }}
          />
          <button type="button" onClick={readLink} disabled={link.status === "reading"} className="btn-sticker-primary min-h-12 shrink-0 justify-center sm:w-44">
            {link.status === "reading" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
            {link.status === "reading" ? "Okunuyor…" : "Linkten oku"}
          </button>
        </div>
        <div aria-live="polite" className="flex flex-col gap-2 text-sm">
          {link.status === "idle" && (
            <p className="text-muted-foreground">Sayfadaki bilgileri aşağıya dolduruyoruz, sen kontrol edip düzeltiyorsun. Linkin yoksa alanları elle doldur.</p>
          )}
          {link.status === "reading" && <p className="text-muted-foreground">Sayfa okunuyor; bu birkaç saniye sürebilir.</p>}
          {link.status === "done" && (
            <p className="flex flex-wrap items-start gap-x-2 text-foreground-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-buy-text" aria-hidden /> {link.text}
              {link.rating && (
                <span className="inline-flex items-center gap-1 font-bold">
                  <Star className="h-4 w-4 text-watch" aria-hidden />
                  {link.rating.value.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}
                  {link.rating.count != null && <span className="font-normal text-muted-foreground">· {link.rating.count.toLocaleString("tr-TR")} değerlendirme</span>}
                </span>
              )}
            </p>
          )}
          {link.status === "error" && <p className="note-risk">{link.text} Bilgileri aşağıya elle de girebilirsin.</p>}
          {link.status === "done" && link.note && (
            <p className={link.note.check ? "note-risk" : "text-muted-foreground"}>{link.note.text}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setPasteOpen((open) => !open)}
            aria-expanded={pasteOpen}
            aria-controls="paste-panel"
            className="inline-flex min-h-11 items-center gap-2 self-start text-left text-sm font-bold text-accent underline-offset-2 hover:underline"
          >
            <ClipboardPaste className="h-4 w-4" aria-hidden /> Link okunamadı mı? Sayfanın metnini yapıştır
          </button>
          {pasteOpen && (
            <div id="paste-panel" className="flex flex-col gap-2">
              <label htmlFor="pasteText" className="text-sm text-muted-foreground">
                Ürün sayfasında Ctrl+A ile her şeyi seçip kopyala, buraya yapıştır. Ad, fiyat, açıklama ve puanı oradan çıkarırız.
              </label>
              <textarea
                id="pasteText"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={5}
                maxLength={200_000}
                placeholder="Sayfanın metni (ya da kaynak kodu)"
                className="field resize-y"
              />
              <button type="button" onClick={readPasted} disabled={!pasteText.trim() || link.status === "reading"} className="btn-sticker min-h-11 self-start">
                {link.status === "reading" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ClipboardPaste className="h-4 w-4" aria-hidden />}
                Metinden doldur
              </button>
            </div>
          )}
        </div>
        {recent.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t-2 border-dashed border-border pt-3 text-sm">
            <span className="font-bold text-foreground-2">Son ürününden başla:</span>
            {recent.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => copyFrom(entry)}
                className="inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full border-2 border-border bg-card px-3.5 font-bold hover:bg-secondary"
              >
                <History className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="truncate">{entry.productName}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* 1 · Ürün */}
          <Step n={1} title="Ürün" done={productDone}>
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldLabel htmlFor="category" label="Kategori" className={family.subtypes.length ? undefined : "sm:col-span-2"}>
                <Select value={info.family} onValueChange={pickCategory}>
                  <SelectTrigger id="category" className="field h-11">
                    <SelectValue placeholder="Kategori seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {FAMILIES.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {/* inline-flex: Tailwind makes svg a block, which would put the icon on its own line */}
                        <span className="inline-flex items-center gap-2">
                          <f.icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden /> {f.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldLabel>
              {family.subtypes.length > 0 && (
                <FieldLabel
                  htmlFor="subtype"
                  label="Ürün türü"
                  hint={category === info.family && info.averagePrice
                    ? `Seçmezsen ${info.familyLabel.toLocaleLowerCase("tr")} ortalaması (${info.averagePrice.toLocaleString("tr-TR")} TL) referans alınır.`
                    : undefined}
                >
                  <Select value={category} onValueChange={pickCategory}>
                    <SelectTrigger id="subtype" className="field h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {family.subtypes.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>{sub.label}</SelectItem>
                      ))}
                      <SelectItem value={family.id}>Genel / emin değilim</SelectItem>
                    </SelectContent>
                  </Select>
                  {nameGuess && (
                    // Only the subtype changes; the motivation and filled fields stay.
                    <button
                      type="button"
                      onClick={() => setCategory(nameGuess)}
                      className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-full border-2 border-accent/40 px-3.5 text-sm font-bold text-accent hover:bg-accent/10"
                    >
                      <Sparkles className="h-4 w-4" aria-hidden /> Ürün adına göre: {categoryInfo(nameGuess).label} · seç
                    </button>
                  )}
                </FieldLabel>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
              <FieldLabel htmlFor="productName" label="Ürün adı" required auto={autoFilled.has("productName")}>
                <input {...textProps("productName")} placeholder={info.form.exampleName} minLength={4} maxLength={120} required className="field" />
              </FieldLabel>
              <FieldLabel htmlFor="price" label="Fiyat (TL)" required auto={autoFilled.has("price")}>
                <input {...textProps("price")} type="number" inputMode="decimal" min="1" max="10000000" step="0.01" placeholder="Örn. 1200" required className="field" />
              </FieldLabel>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldLabel
                htmlFor="marketPrice"
                label={info.averagePrice === null ? "Benzer ürünlerin ortalama fiyatı" : "Benzerlerinin ortalama fiyatı (isteğe bağlı)"}
                hint={
                  info.averagePrice === null
                    ? "Bu kategoride hazır ortalama yok; boş bırakırsan fiyatın ne pahalı ne ucuz sayılır."
                    : `Boş bırakırsan ${info.label} için ~${info.averagePrice.toLocaleString("tr-TR")} TL kabul edilir.`
                }
              >
                <input {...textProps("marketPrice")} type="number" inputMode="decimal" min="1" max="10000000" step="0.01" placeholder="TL" className="field" />
              </FieldLabel>
              <FieldLabel htmlFor="motivation" label="Neden alınır?" hint="Alıcının asıl satın alma sebebi.">
                <Select value={motivation} onValueChange={(v) => v && setMotivation(v as PurchaseMotivation)}>
                  <SelectTrigger id="motivation" className="field h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MOTIVATIONS.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FieldLabel>
            </div>

            <FieldLabel
              htmlFor="description"
              label="Ürün açıklaması"
              required
              auto={autoFilled.has("description")}
              gain={gainOf.get("description")}
              hint={`${descriptionWords} kelime · en az 40 karakter; ~28 kelimeden sonra açıklama tam puan alır.`}
            >
              <textarea {...textProps("description")} minLength={40} maxLength={4000} rows={6} placeholder={info.form.descriptionPlaceholder} required className="field resize-y" />
            </FieldLabel>

            <div className="flex flex-col gap-2">
              <span className="text-sm leading-6 font-bold text-foreground-2">
                Görseller <span className="font-semibold text-muted-foreground">(en fazla {MAX_IMAGES}; skoru etkilemez, AI ile değerlendirilebilir)</span>
              </span>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {images.map((url, idx) => (
                  <div key={idx} className="group relative aspect-square overflow-hidden rounded-wobble border-2 border-border bg-card">
                    {/* eslint-disable-next-line @next/next/no-img-element -- user uploads / scraped URLs */}
                    <img src={url} alt={`Ürün görseli ${idx + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                      aria-label={`Görsel ${idx + 1}'i kaldır`}
                      className="absolute right-1 top-1 grid h-9 w-9 place-items-center rounded-full border-2 border-foreground bg-card shadow-sticker-ink"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                ))}
                {images.length < MAX_IMAGES && (
                  <label
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
                    className={cn(
                      "flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-wobble border-2 border-dashed text-sm font-bold text-muted-foreground transition-colors focus-within:outline-solid focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring",
                      isDragging ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-secondary",
                    )}
                  >
                    <Upload className="h-5 w-5" aria-hidden />
                    Yükle
                    <input type="file" multiple accept="image/*" className="sr-only" onChange={(e) => addFiles(e.target.files)} />
                  </label>
                )}
              </div>
            </div>
            {images.length > 0 && (
              <PhotoReview images={images} category={category} productName={String(values.productName ?? "")} />
            )}
          </Step>

          {/* 2 · Özellikler */}
          <Step n={2} title={`${info.label} özellikleri`} done={featuresDone} hint="Doldurdukça skor değişir">
            <div className="grid gap-4 sm:grid-cols-2">
              {fields.map((field) => (
                <FeatureInput key={field.name} field={field} value={values[field.name]} auto={autoFilled.has(field.name)} gain={gainOf.get(field.name)} onChange={set} />
              ))}
            </div>
          </Step>

          {/* 3 · Kitle ve satış */}
          <Step n={3} title="Kitle ve satış koşulları">
            <div className="grid gap-4 sm:grid-cols-2">
              {info.audienceFields.includes("ageRange") && (
                <ChoiceField name="ageRange" label="Yaş aralığı" value={values.ageRange} onChange={set}
                  options={[["genel", "Tüm yaşlar"], ["13-17", "13-17"], ["18-30", "18-30"], ["30-45", "30-45"], ["45+", "45+"]]} />
              )}
              {info.audienceFields.includes("gender") && (
                <ChoiceField name="gender" label="Cinsiyet" value={values.gender} onChange={set}
                  options={[["unisex", "Herkes (unisex)"], ["kadin", "Kadın"], ["erkek", "Erkek"]]} />
              )}
              <ChoiceField name="incomeLevel" label="Fiyat segmenti" value={values.incomeLevel} onChange={set}
                options={[["low", "Ekonomik"], ["middle", "Orta"], ["high", "Premium"]]} />
              {/* Spans the row when the audience fields leave it alone (no empty cell). */}
              <FieldLabel htmlFor="shippingDays" label="Kargo süresi (gün)" gain={gainOf.get("shippingDays")}
                className={info.audienceFields.filter((f) => f !== "incomeLevel").length % 2 ? "sm:col-span-2" : undefined}>
                <input {...textProps("shippingDays")} type="number" inputMode="numeric" min="0" max="60" className="field" />
              </FieldLabel>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FieldLabel htmlFor="rating" label="Mağaza puanı (5 üzerinden)" auto={autoFilled.has("rating")}
                hint="Satıştaki ürünün yıldızı; yeni üründe boş bırak.">
                <input {...textProps("rating")} type="number" inputMode="decimal" min="0" max="5" step="0.1" placeholder="Örn. 4,6" className="field" />
              </FieldLabel>
              <FieldLabel htmlFor="reviewCount" label="Değerlendirme sayısı" auto={autoFilled.has("reviewCount")}
                hint="Çok değerlendirme, puanın güvene etkisini büyütür.">
                <input {...textProps("reviewCount")} type="number" inputMode="numeric" min="0" step="1" placeholder="Örn. 1284" className="field" />
              </FieldLabel>
            </div>
            <div className="flex flex-wrap gap-3">
              <Toggle name="returnAvailable" label="İade imkânı var" checked={values.returnAvailable === true} gain={gainOf.get("returnAvailable")} onChange={set} />
              <Toggle name="warranty" label="Garanti / fatura var" checked={values.warranty === true} gain={gainOf.get("warranty")} onChange={set} />
            </div>
          </Step>
        </div>

        <ReadinessPanel
          check={check.data}
          checking={check.checking}
          failed={check.failed}
          missing={missing}
          showWarnings={String(values.description ?? "").trim().length >= 40}
          isLoading={isLoading}
          savedAt={savedAt}
          restored={restored}
          onGainClick={focusField}
          onClear={clearForm}
        />
      </div>

      <ReadinessBar score={check.data?.score ?? null} gainCount={check.data?.gains.length ?? 0} isLoading={isLoading} />
    </form>
  );
}

/* ------------------------------------------------------------------ live check */

function useDraftCheck(draft: object) {
  const key = JSON.stringify(draft);
  const [state, setState] = useState<{ key: string; data: DraftCheckResponse | null; failed: boolean }>({ key: "", data: null, failed: false });

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      draftCheck(JSON.parse(key), controller.signal)
        .then((data) => setState({ key, data, failed: false }))
        .catch(() => {
          if (!controller.signal.aborted) setState((prev) => ({ key, data: prev.data, failed: true }));
        });
    }, DRAFT_CHECK_DELAY_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [key]);

  return { data: state.data, checking: state.key !== key, failed: state.key === key && state.failed };
}

/* ------------------------------------------------------------------ link reader */

function linkValues(result: ProductLinkReadResponse): Values {
  const patch: Values = {};
  // Mirror backend limits (SimulationRequest) so scraped text never causes a 422.
  if (result.title) patch.productName = result.title.slice(0, 120);
  if (result.description) patch.description = result.description.slice(0, 4000);
  // type="number" inputs only take a dot decimal.
  if (result.price) patch.price = String(result.price);
  if (result.brand) patch.brand = result.brand.slice(0, 200);
  if (result.rating != null) patch.rating = String(result.rating);
  if (result.review_count != null) patch.reviewCount = String(result.review_count);
  for (const [key, value] of Object.entries(result.features ?? {})) {
    if (value === null || value === undefined || value === "") continue;
    patch[key === "colors" ? "colorsText" : key] = String(value).slice(0, 200);
  }
  return patch;
}

function linkCategoryNote(result: ProductLinkReadResponse): { text: string; check: boolean } | null {
  const label = categoryLabel(result.category ?? OTHER);
  if (result.category_confidence === "high") return { text: `Kategori sayfanın kendi kategorisinden okundu: ${label}.`, check: false };
  if (result.category_confidence === "medium") return { text: `Kategoriyi ürün adından tahmin ettik (${label}). Doğru değilse aşağıdan değiştir.`, check: true };
  if (result.category_confidence === "low") return { text: "Kategori tanınamadı; “Diğer” seçildi. Aşağıdan uygun kategoriyi seç.", check: true };
  return null;
}

/* ------------------------------------------------------------------ pieces */

function Step({ n, title, hint, done, children }: { n: number; title: string; hint?: string; done?: boolean; children: React.ReactNode }) {
  return (
    <fieldset className="card-paper flex flex-col gap-4">
      <legend className="sr-only">{title}</legend>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="num-badge" aria-hidden>{n}</span>
        <h2 className="text-[19px] font-bold">{title}</h2>
        {done && (
          <span className="chip text-buy-text">
            <Check className="h-3.5 w-3.5" aria-hidden /> tamam
          </span>
        )}
        {hint && <span className="ml-auto text-sm text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </fieldset>
  );
}

function FieldLabel({
  htmlFor, label, required, hint, auto, gain, className, children,
}: {
  htmlFor: string;
  label: string;
  required?: boolean;
  hint?: string;
  /** Filled from the product link and not edited yet. */
  auto?: boolean;
  /** Score points this empty input would add (draft check). */
  gain?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    // gap, not space-y: Radix Select appends a hidden native <select> as the last child.
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex min-h-6 flex-wrap items-center gap-x-2 gap-y-1">
        <label htmlFor={htmlFor} className="text-sm leading-6 font-bold text-foreground-2">
          {label} {required && <span className="text-skip-text" aria-hidden>*</span>}
        </label>
        {auto && <span className="chip text-accent" title="Linkten dolduruldu; kontrol et">linkten</span>}
        {gain !== undefined && (
          <span className="chip ml-auto text-buy-text" title="Bu alanı doldurursan tahmini skor bu kadar artar">
            {formatGain(gain)} puan
          </span>
        )}
      </div>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function FeatureInput({ field, value, auto, gain, onChange }: {
  field: FormField;
  value: string | boolean | undefined;
  auto: boolean;
  gain?: number;
  onChange: (name: string, value: string | boolean) => void;
}) {
  if (field.type === "checkbox") {
    return <Toggle name={field.name} label={field.label} checked={value === true} gain={gain} onChange={onChange} wide />;
  }
  if (field.type === "select") {
    return (
      <FieldLabel htmlFor={field.name} label={field.label} auto={auto} gain={gain}>
        <Select value={typeof value === "string" ? value : ""} onValueChange={(v) => v && onChange(field.name, v === NONE ? "" : v)}>
          <SelectTrigger id={field.name} className="field h-11">
            <SelectValue placeholder="Seçin" />
          </SelectTrigger>
          <SelectContent>
            {field.options?.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
            <SelectItem value={NONE}>Belirtilmedi</SelectItem>
          </SelectContent>
        </Select>
      </FieldLabel>
    );
  }
  return (
    <FieldLabel htmlFor={field.name} label={field.label} required={field.required} auto={auto} gain={gain}>
      <input
        id={field.name}
        name={field.name}
        type={field.type === "number" ? "number" : "text"}
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(field.name, e.target.value)}
        placeholder={field.placeholder}
        required={field.required}
        maxLength={200}
        className="field"
      />
    </FieldLabel>
  );
}

function ChoiceField({ name, label, value, options, onChange }: {
  name: string;
  label: string;
  value: string | boolean | undefined;
  options: Array<[string, string]>;
  onChange: (name: string, value: string) => void;
}) {
  return (
    <FieldLabel htmlFor={name} label={label}>
      <Select value={String(value ?? "")} onValueChange={(v) => v && onChange(name, v)}>
        <SelectTrigger id={name} className="field h-11"><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
        </SelectContent>
      </Select>
    </FieldLabel>
  );
}

function Toggle({ name, label, checked, gain, wide, onChange }: {
  name: string;
  label: string;
  checked: boolean;
  gain?: number;
  /** Feature checkboxes sit in the field grid; commerce toggles are pills. */
  wide?: boolean;
  onChange: (name: string, value: boolean) => void;
}) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-3 border-2 border-border bg-card px-3.5 text-sm font-bold hover:bg-secondary",
        wide ? "rounded-xl self-end" : "rounded-full",
      )}
    >
      <input id={name} name={name} type="checkbox" checked={checked} onChange={(e) => onChange(name, e.target.checked)} className="h-4 w-4 accent-[hsl(var(--primary))]" />
      {label}
      {gain !== undefined && !checked && <span className="chip text-buy-text">{formatGain(gain)}</span>}
    </label>
  );
}

/** Optional AI look at the photos (Faz 16). Does not change the simulation; says why when AI is off. */
function PhotoReview({ images, category, productName }: { images: string[]; category: string; productName: string }) {
  const [review, setReview] = useState<{ for: string; data?: ImageAnalysis; error?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const key = images.join("|");
  const current = review?.for === key ? review : null;

  const run = async () => {
    setBusy(true);
    try {
      setReview({ for: key, data: await analyzeImages(images, category, productName) });
    } catch (err: unknown) {
      setReview({ for: key, error: apiErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const data = current?.data;
  return (
    <div className="flex flex-col gap-3 rounded-wobble border-2 border-dashed border-border bg-secondary px-4 py-3" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-foreground-2">
          <b className="font-bold">Görseller alıcıyı ikna ediyor mu?</b> AI ilk {Math.min(images.length, 4)} görsele bakar.
        </p>
        <button type="button" onClick={run} disabled={busy} className="btn-sticker min-h-11">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
          Görselleri değerlendir
        </button>
      </div>
      {current?.error && <p className="note-risk">{current.error}</p>}
      {data && !data.available && <p className="text-sm text-muted-foreground">{data.reason}</p>}
      {data && data.available && (
        <div className="flex flex-col gap-2 text-sm">
          <p>
            <span className="font-display text-2xl font-extrabold">{data.score}</span>
            <span className="font-semibold text-muted-foreground">/100 görsel puanı</span>
          </p>
          {[
            ["İyi olan", data.strengths, "text-buy-text"],
            ["Sorun", data.issues, "text-skip-text"],
            ["Öneri", data.suggestions, "text-foreground"],
            ["Eksik çekim", data.missingShots, "text-foreground"],
          ].map(([label, items, tone]) =>
            (items as string[]).length ? (
              <p key={label as string} className="text-foreground-2">
                <b className={cn("font-bold", tone as string)}>{label as string}:</b> {(items as string[]).join(" · ")}
              </p>
            ) : null,
          )}
        </div>
      )}
    </div>
  );
}

