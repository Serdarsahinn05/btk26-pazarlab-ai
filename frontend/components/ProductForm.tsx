"use client";

import { useMemo, useRef, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Features, ProductLinkReadResponse, PurchaseMotivation, SimulationRequest } from "@/types";
import { apiErrorMessage, readProductLink } from "@/lib/api";
import { FAMILIES, OTHER, categoryInfo, categoryLabel, isKnownCategory } from "@/lib/categories";
import { Link2, Loader2, Sparkles, Trash2, Upload } from "lucide-react";

// Backend accepts at most 6 images of ~1.5 MB each (see SimulationRequest.images).
const MAX_IMAGES = 6;
const MAX_IMAGE_EDGE = 1280;

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

function getString(formData: FormData, key: string): string | undefined {
  const value = String(formData.get(key) || "").trim();
  return value || undefined;
}

export default function ProductForm({ onSubmit, isLoading }: ProductFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [category, setCategory] = useState("tisort");
  // How the link reader found the category; cleared when the user picks one.
  const [categoryNote, setCategoryNote] = useState<{ text: string; check: boolean } | null>(null);
  const [motivation, setMotivation] = useState<PurchaseMotivation>("stil_begeni");
  const [linkStatus, setLinkStatus] = useState<string>("");
  const [isReadingLink, setIsReadingLink] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const info = useMemo(() => categoryInfo(category), [category]);
  const family = FAMILIES.find((f) => f.id === info.family) ?? FAMILIES[0];

  const handleCategoryChange = (value: string | null) => {
    // Values can come from the link reader, so only accept categories the API knows.
    const next = isKnownCategory(value) ? value : OTHER;
    setCategory(next);
    setMotivation(categoryInfo(next).defaultMotivation);
  };

  const pickCategory = (value: string | null) => {
    // Radix fires "" when the subtype list is rebuilt after a family change; that is not a choice.
    if (!value) return;
    setCategoryNote(null);
    handleCategoryChange(value);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const requestData: SimulationRequest = {
      category,
      purchaseMotivation: motivation,
      productName: String(formData.get("productName") || ""),
      productUrl: getString(formData, "productUrl"),
      price: Number(String(formData.get("price") || "0").replace(",", ".")),
      marketPrice: Number(String(formData.get("marketPrice") || "").replace(",", ".")) || undefined,
      description: String(formData.get("description") || ""),
      targetAudience: {
        ageRange: getString(formData, "ageRange") || "genel",
        gender: getString(formData, "gender") || "unisex",
        incomeLevel: getString(formData, "incomeLevel") || "middle"
      },
      features: readFeatures(formData, info.form.fields),
      commerce: {
        shippingDays: Number(formData.get("shippingDays") || 3),
        returnAvailable: formData.get("returnAvailable") === "on",
        warranty: formData.get("warranty") === "on"
      },
      images
    };

    onSubmit(requestData);
  };

  const adjustHeight = (el: HTMLElement) => {
    if (el instanceof HTMLTextAreaElement) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
  };

  const setFormValue = (name: string, value?: string | number | null) => {
    if (value === undefined || value === null || value === "") return;
    // Mirror backend limits (SimulationRequest) so scraped text never causes a 422.
    const limit = name === "description" ? 4000 : name === "productName" ? 120 : 200;
    const text = String(value).slice(0, limit);

    const trySet = (attempt = 0) => {
      if (!formRef.current || attempt > 20) return; // 2 saniye boyunca dene

      const field = formRef.current.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
      if (field) {
        field.value = text;
        if (name === "description") adjustHeight(field);
      } else {
        // Eleman henüz render olmamis olabilir, biraz bekle tekrar dene
        setTimeout(() => trySet(attempt + 1), 100);
      }
    };
    
    trySet();
  };

  const handleReadLink = async () => {
    const urlField = formRef.current?.elements.namedItem("productUrl") as HTMLInputElement | null;
    const url = urlField?.value.trim();
    if (!url) {
      setLinkStatus("Önce ürün linkini girin.");
      return;
    }

    setIsReadingLink(true);
    setLinkStatus("Link okunuyor…");
    try {
      const result = await readProductLink(url);
      
      // Kategori varsa degistir (bu yeni alanlari render eder)
      if (result.category) {
        handleCategoryChange(result.category);
        setCategoryNote(linkCategoryNote(result));
      }

      // DOM guncellenmesi ve alanlarin render olmasi icin biraz bekle
      setTimeout(() => {
        setFormValue("productName", result.title);
        setFormValue("description", result.description);
        setFormValue("brand", result.brand);
        
        // type="number" alanlar yalnizca noktali ondalik kabul eder; virgullu deger alani bos birakir.
        if (result.price) {
          setFormValue("price", String(result.price));
        }
        
        // Dinamik ozellikleri doldur
        if (result.features) {
          Object.entries(result.features).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== "") {
              setFormValue(key, value);
            }
          });
        }
      }, 500); // Kategori degisimi sonrasi render icin 500ms ideal
      
      // Yeni link okundugunda eskileri temizle ve yenileri ekle
      if (result.images && result.images.length > 0) {
        setImages(result.images.slice(0, MAX_IMAGES));
      } else if (result.image) {
        setImages([result.image]);
      } else {
        setImages([]);
      }
      setLinkStatus(result.warnings[0] || "Linkten bilgiler, kategori ve teknik detaylar okundu.");
    } catch (err: unknown) {
      setLinkStatus(apiErrorMessage(err));
    } finally {
      setIsReadingLink(false);
    }
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files) return;
    
    Array.from(files).forEach(async (file) => {
      if (!file.type.startsWith("image/")) return;
      try {
        const result = await downscaleImage(file);
        setImages((prev) => (prev.includes(result) ? prev : [...prev, result].slice(0, MAX_IMAGES)));
      } catch {
        setLinkStatus("Görsel okunamadı.");
      }
    });
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {/* 1 · Link ile doldur */}
      <Step n={1} title="Linkten doldur" hint="İsteğe bağlı">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="productUrl" className="sr-only">Ürün linki</label>
          <input
            id="productUrl"
            name="productUrl"
            type="url"
            maxLength={2048}
            placeholder="Trendyol, Hepsiburada, Amazon, n11 linki yapıştırın…"
            className="field"
          />
          <button type="button" onClick={handleReadLink} disabled={isReadingLink} className="btn-sticker-primary shrink-0 sm:w-44">
            {isReadingLink ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Link2 className="h-4 w-4" aria-hidden />}
            {isReadingLink ? "Okunuyor…" : "Linkten oku"}
          </button>
        </div>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {linkStatus || "Okunan bilgiler aşağıdaki alanlara otomatik dolar; dilediğiniz gibi düzenleyebilirsiniz."}
        </p>
      </Step>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 2 · Temel bilgiler */}
        <Step n={2} title="Temel bilgiler">
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
              <FieldLabel htmlFor="subtype" label="Ürün türü">
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
              </FieldLabel>
            )}
          </div>
          {categoryNote && (
            <p className={categoryNote.check ? "note-risk" : "text-sm text-muted-foreground"} aria-live="polite">
              {categoryNote.text}
            </p>
          )}

          <FieldLabel htmlFor="motivation" label="Satın alma motivasyonu">
              <Select name="motivation" value={motivation} onValueChange={(val) => setMotivation((val as PurchaseMotivation) || info.defaultMotivation)}>
                <SelectTrigger id="motivation" className="field h-11">
                  <SelectValue placeholder="Motivasyon seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stil_begeni">Stil / beğeni</SelectItem>
                  <SelectItem value="ihtiyac">Günlük ihtiyaç</SelectItem>
                  <SelectItem value="problem_cozme">Problem çözme</SelectItem>
                  <SelectItem value="yedek_parca_tamir">Yedek parça / tamir</SelectItem>
                  <SelectItem value="hediye">Hediye</SelectItem>
                  <SelectItem value="trend">Trend / sosyal medya</SelectItem>
                  <SelectItem value="profesyonel_kullanim">Profesyonel kullanım</SelectItem>
                </SelectContent>
              </Select>
          </FieldLabel>

          <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
            <FieldLabel htmlFor="productName" label="Ürün adı" required>
              <input id="productName" name="productName" placeholder={info.form.exampleName} minLength={4} maxLength={120} required className="field" />
            </FieldLabel>
            <FieldLabel htmlFor="price" label="Fiyat (TL)" required>
              <input id="price" name="price" type="number" min="1" max="10000000" step="0.01" placeholder="1200" required className="field" />
            </FieldLabel>
          </div>

          {info.averagePrice === null && (
            <FieldLabel
              htmlFor="marketPrice"
              label="Benzer ürünlerin ortalama fiyatı (TL)"
              hint="Bu kategoride hazır bir fiyat ortalaması yok. Boş bırakırsan kasaba fiyatını ne pahalı ne ucuz bulur."
            >
              <input id="marketPrice" name="marketPrice" type="number" min="1" max="10000000" step="0.01" placeholder="Örn. 750" className="field" />
            </FieldLabel>
          )}

          <FieldLabel htmlFor="description" label="Ürün açıklaması" required hint="En az 40 karakter. Detay arttıkça simülasyon isabeti artar.">
            <textarea
              id="description"
              name="description"
              minLength={40}
              maxLength={4000}
              rows={6}
              placeholder={info.form.descriptionPlaceholder}
              required
              className="field resize-y"
            />
          </FieldLabel>

          <div className="flex flex-col gap-2">
            <span className="text-sm leading-6 font-bold text-foreground-2">Görseller <span className="font-semibold text-muted-foreground">(en fazla {MAX_IMAGES})</span></span>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {images.map((url, idx) => (
                <div key={idx} className="group relative aspect-square overflow-hidden rounded-wobble border-2 border-border bg-card">
                  {/* eslint-disable-next-line @next/next/no-img-element -- user uploads / scraped URLs */}
                  <img src={url} alt={`Ürün görseli ${idx + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                    aria-label={`Görsel ${idx + 1}'i kaldır`}
                    className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full border-2 border-foreground bg-card shadow-sticker-ink"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {images.length < MAX_IMAGES && (
                <label
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-wobble border-2 border-dashed text-sm font-bold text-muted-foreground transition-colors focus-within:outline-solid focus-within:outline-2 focus-within:outline-ring ${
                    isDragging ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-secondary"
                  }`}
                >
                  <Upload className="h-5 w-5" aria-hidden />
                  Yükle
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="sr-only"
                    ref={fileInputRef}
                    onChange={(e) => handleFileUpload(e.target.files)}
                  />
                </label>
              )}
            </div>
          </div>
        </Step>

        <div className="space-y-6">
          {/* 3 · Kategoriye özel özellikler */}
          <Step n={3} title={`${info.label} özellikleri`}>
            <div className="grid gap-4 sm:grid-cols-2">
              {info.form.fields.map((field) => {
                if (field.type === "checkbox") {
                  return (
                    <label key={field.name} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border-2 border-border bg-card px-3.5 text-sm font-bold hover:bg-secondary">
                      <input name={field.name} type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" />
                      {field.label}
                    </label>
                  );
                }
                if (field.type === "select") {
                  return (
                    <FieldLabel key={field.name} htmlFor={field.name} label={field.label}>
                      <Select name={field.name} defaultValue={field.options?.[0]?.value}>
                        <SelectTrigger id={field.name} className="field h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map((option) => (
                            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FieldLabel>
                  );
                }
                return (
                  <FieldLabel key={field.name} htmlFor={field.name} label={field.label} required={field.required}>
                    <input
                      id={field.name}
                      name={field.name}
                      type={field.type === "number" ? "number" : "text"}
                      placeholder={field.placeholder}
                      required={field.required}
                      maxLength={200}
                      className="field"
                    />
                  </FieldLabel>
                );
              })}
            </div>
          </Step>

          {/* 4 · Hedef kitle ve satış koşulları */}
          <Step n={4} title="Hedef kitle ve satış koşulları">
            <div className="grid gap-4 sm:grid-cols-2">
              {info.audienceFields.includes("ageRange") && (
                  <FieldLabel htmlFor="ageRange" label="Yaş aralığı">
                    <Select name="ageRange" defaultValue="18-30">
                      <SelectTrigger id="ageRange" className="field h-11"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="13-17">13-17</SelectItem>
                        <SelectItem value="18-30">18-30</SelectItem>
                        <SelectItem value="30-45">30-45</SelectItem>
                        <SelectItem value="45+">45+</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldLabel>
              )}
              {info.audienceFields.includes("gender") && (
                  <FieldLabel htmlFor="gender" label="Cinsiyet">
                    <Select name="gender" defaultValue="unisex">
                      <SelectTrigger id="gender" className="field h-11"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unisex">Unisex</SelectItem>
                        <SelectItem value="kadin">Kadın</SelectItem>
                        <SelectItem value="erkek">Erkek</SelectItem>
                      </SelectContent>
                    </Select>
                  </FieldLabel>
              )}
              <FieldLabel htmlFor="incomeLevel" label="Fiyat segmenti">
                <Select name="incomeLevel" defaultValue="middle">
                  <SelectTrigger id="incomeLevel" className="field h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Ekonomik</SelectItem>
                    <SelectItem value="middle">Orta</SelectItem>
                    <SelectItem value="high">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </FieldLabel>
              {/* Spans the row when the audience fields leave it alone (no empty cell). */}
              <FieldLabel htmlFor="shippingDays" label="Kargo süresi (gün)" className={info.audienceFields.filter((f) => f !== "incomeLevel").length % 2 ? "sm:col-span-2" : undefined}>
                <input id="shippingDays" name="shippingDays" type="number" defaultValue="3" min="0" max="60" className="field" />
              </FieldLabel>
            </div>
            <div className="flex flex-wrap gap-3">
              <label className="flex cursor-pointer items-center gap-2 rounded-full border-2 border-border bg-card px-3.5 py-2 text-sm font-bold">
                <input name="returnAvailable" type="checkbox" defaultChecked className="h-4 w-4 accent-[hsl(var(--primary))]" />
                İade imkânı var
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-full border-2 border-border bg-card px-3.5 py-2 text-sm font-bold">
                <input name="warranty" type="checkbox" className="h-4 w-4 accent-[hsl(var(--primary))]" />
                Garanti / fatura var
              </label>
            </div>
          </Step>
        </div>
      </div>

      {/* Sticky submit bar: always visible while filling the form (DESIGN.md §9.2) */}
      <div className="no-print sticky bottom-4 z-30 flex flex-col items-stretch gap-3 rounded-wobble-lg border-2 border-foreground bg-card px-5 py-3.5 shadow-sticker-ink sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-foreground-2">
          <b className="font-display">{info.label}</b> · 500 sentetik tüketici · genelde 30–90 sn
        </p>
        <button type="submit" disabled={isLoading} className="btn-sticker-primary px-6 py-2.5 text-base">
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> : <Sparkles className="h-5 w-5" aria-hidden />}
          {isLoading ? "Hazırlanıyor…" : "Simülasyonu başlat"}
        </button>
      </div>
    </form>
  );
}

function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <fieldset className="card-paper space-y-4">
      <legend className="sr-only">{title}</legend>
      {/* mt-4: the sr-only legend is the first child, so space-y leaves no gap above the title in Tailwind 4. */}
      <div className="mt-4 flex items-center gap-3">
        <span className="num-badge" aria-hidden>{n}</span>
        <h2 className="text-[19px] font-bold">{title}</h2>
        {hint && <span className="text-sm text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </fieldset>
  );
}

function FieldLabel({
  htmlFor,
  label,
  required,
  hint,
  className,
  children,
}: {
  htmlFor: string;
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    // gap, not space-y: Radix Select appends a hidden native <select> as the last child.
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`}>
      <label htmlFor={htmlFor} className="text-sm leading-6 font-bold text-foreground-2">
        {label} {required && <span className="text-skip-text" aria-hidden>*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Feature values of the fields this category shows (the form only renders those). */
function readFeatures(formData: FormData, fields: Array<{ name: string; type?: string }>): Features {
  const features: Record<string, unknown> = {};
  for (const field of fields) {
    if (field.type === "checkbox") features[field.name] = formData.get(field.name) === "on";
    else if (field.name === "colorsText") features.colors = getString(formData, "colorsText")?.split(",").map((c) => c.trim()).filter(Boolean);
    else features[field.name] = getString(formData, field.name);
  }
  return features as Features;
}

function linkCategoryNote(result: ProductLinkReadResponse): { text: string; check: boolean } | null {
  const label = categoryLabel(result.category ?? OTHER);
  if (result.category_confidence === "high") return { text: `Kategori sayfanın kendi kategorisinden okundu: ${label}.`, check: false };
  if (result.category_confidence === "medium") return { text: `Kategoriyi ürün adından tahmin ettik (${label}). Doğru değilse değiştirin.`, check: true };
  if (result.category_confidence === "low") return { text: "Kategori tanınamadı; “Diğer” seçildi. Uygun kategoriyi seçin.", check: true };
  return null;
}
