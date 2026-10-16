"use client";

import { useMemo, useRef, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Category, PurchaseMotivation, SimulationRequest } from "@/types";
import { apiErrorMessage, readProductLink } from "@/lib/api";
import { Link2, Loader2, Shirt, Smartphone, Sparkles, Trash2, Upload } from "lucide-react";

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

type FieldType = "text" | "select" | "checkbox" | "number";
type FamilyKey = "kiyafet" | "teknoloji";

interface DynamicField {
  name: string;
  label: string;
  type?: FieldType;
  placeholder?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
}

interface CategoryConfig {
  family: FamilyKey;
  label: string;
  shortLabel: string;
  defaultMotivation: PurchaseMotivation;
  descriptionPlaceholder: string;
  exampleName: string;
  audience: "full" | "income";
  fields: DynamicField[];
}

const seasonOptions = [
  { value: "summer", label: "Yaz" },
  { value: "winter", label: "Kış" },
  { value: "spring", label: "Bahar" },
  { value: "all", label: "Dört mevsim" }
];

const categoryConfig: Record<string, CategoryConfig> = {
  tisort: {
    family: "kiyafet",
    label: "Kıyafet / Tişört",
    shortLabel: "Tişört",
    defaultMotivation: "stil_begeni",
    audience: "full",
    exampleName: "Oversize Pamuklu Baskılı Tişört",
    descriptionPlaceholder: "Kumaş, kalıp, yaka tipi, baskı kalitesi, beden aralığı ve kombin/kullanım senaryosunu yazın.",
    fields: [
      { name: "fabric", label: "Kumaş içeriği", placeholder: "%100 pamuk, modal, polyester karışım...", required: true },
      { name: "fit", label: "Kalıp", type: "select", options: [
        { value: "regular", label: "Regular" },
        { value: "oversize", label: "Oversize" },
        { value: "slim", label: "Slim" }
      ] },
      { name: "sizeRange", label: "Beden aralığı", placeholder: "XS-XXL", required: true },
      { name: "collarType", label: "Yaka tipi", type: "select", options: [
        { value: "bisiklet", label: "Bisiklet yaka" },
        { value: "v_yaka", label: "V yaka" },
        { value: "polo", label: "Polo yaka" }
      ] },
      { name: "sleeveLength", label: "Kol tipi", type: "select", options: [
        { value: "kisa", label: "Kısa kol" },
        { value: "uzun", label: "Uzun kol" }
      ] },
      { name: "printType", label: "Baskı / desen", placeholder: "Nakış, dijital baskı, düz renk..." },
      { name: "colorsText", label: "Renk seçenekleri", placeholder: "Siyah, beyaz, lacivert..." },
      { name: "season", label: "Sezon", type: "select", options: seasonOptions }
    ]
  },
  pantolon: {
    family: "kiyafet",
    label: "Kıyafet / Pantolon",
    shortLabel: "Pantolon",
    defaultMotivation: "ihtiyac",
    audience: "full",
    exampleName: "Regular Fit Keten Pantolon",
    descriptionPlaceholder: "Kumaş, bel tipi, paça formu, esneklik, beden/ölçü ve kullanım alanını yazın.",
    fields: [
      { name: "fabric", label: "Kumaş içeriği", placeholder: "Denim, keten, gabardin...", required: true },
      { name: "fit", label: "Kalıp", type: "select", options: [
        { value: "regular", label: "Regular" },
        { value: "slim", label: "Slim" },
        { value: "wide", label: "Wide leg" }
      ] },
      { name: "waistType", label: "Bel tipi", type: "select", options: [
        { value: "normal", label: "Normal bel" },
        { value: "yuksek", label: "Yüksek bel" },
        { value: "lastikli", label: "Lastikli bel" }
      ] },
      { name: "legType", label: "Paça tipi", type: "select", options: [
        { value: "duz", label: "Düz paça" },
        { value: "dar", label: "Dar paça" },
        { value: "bol", label: "Bol paça" }
      ] },
      { name: "stretch", label: "Esneklik var", type: "checkbox" },
      { name: "sizeRange", label: "Beden/ölçü aralığı", placeholder: "30-38 veya S-XL", required: true },
      { name: "useCase", label: "Kullanım alanı", placeholder: "Ofis, günlük, spor..." },
      { name: "season", label: "Sezon", type: "select", options: seasonOptions }
    ]
  },
  mont: {
    family: "kiyafet",
    label: "Kıyafet / Mont",
    shortLabel: "Mont",
    defaultMotivation: "stil_begeni",
    audience: "full",
    exampleName: "Su Geçirmez Oversize Kışlık Mont",
    descriptionPlaceholder: "Kumaş, iç dolgu, sezon, su/rüzgar koruması, kapüşon, cep ve beden bilgisini yazın.",
    fields: [
      { name: "fabric", label: "Dış kumaş", placeholder: "Polyester, softshell...", required: true },
      { name: "innerFilling", label: "İç dolgu", placeholder: "Elyaf, kaz tüyü, polar...", required: true },
      { name: "season", label: "Sezon", type: "select", options: seasonOptions },
      { name: "fit", label: "Kalıp", type: "select", options: [
        { value: "regular", label: "Regular" },
        { value: "oversize", label: "Oversize" },
        { value: "slim", label: "Slim" }
      ] },
      { name: "sizeRange", label: "Beden aralığı", placeholder: "S-XXL" },
      { name: "waterproof", label: "Su geçirmez", type: "checkbox" },
      { name: "windproof", label: "Rüzgar geçirmez", type: "checkbox" },
      { name: "hood", label: "Kapüşon var", type: "checkbox" },
      { name: "pocketCount", label: "Cep sayısı", type: "number", placeholder: "4" }
    ]
  },
  elbise: {
    family: "kiyafet",
    label: "Kıyafet / Elbise",
    shortLabel: "Elbise",
    defaultMotivation: "stil_begeni",
    audience: "full",
    exampleName: "Midi Boy Keten Elbise",
    descriptionPlaceholder: "Kumaş, kesim, astar, boy, beden aralığı, sezon ve hangi ortamda kullanılacağını yazın.",
    fields: [
      { name: "fabric", label: "Kumaş içeriği", placeholder: "Keten, viskon, saten...", required: true },
      { name: "fit", label: "Kesim / kalıp", type: "select", options: [
        { value: "regular", label: "Regular" },
        { value: "slim", label: "Slim" },
        { value: "oversize", label: "Rahat kesim" }
      ] },
      { name: "sizeRange", label: "Beden aralığı", placeholder: "XS-XL", required: true },
      { name: "sleeveLength", label: "Kol / askılı tipi", type: "select", options: [
        { value: "askili", label: "Askılı" },
        { value: "kisa", label: "Kısa kol" },
        { value: "uzun", label: "Uzun kol" }
      ] },
      { name: "legType", label: "Boy / kesim", placeholder: "Mini, midi, maksi, yırtmaçlı..." },
      { name: "colorsText", label: "Renk seçenekleri", placeholder: "Siyah, yeşil, ekru..." },
      { name: "useCase", label: "Kullanım alanı", placeholder: "Günlük, ofis, davet, tatil..." },
      { name: "season", label: "Sezon", type: "select", options: seasonOptions }
    ]
  },
  etek: {
    family: "kiyafet",
    label: "Kıyafet / Etek",
    shortLabel: "Etek",
    defaultMotivation: "stil_begeni",
    audience: "full",
    exampleName: "Yüksek Bel Midi Etek",
    descriptionPlaceholder: "Kumaş, bel tipi, etek boyu, kalıp, beden aralığı, kombin ve sezon bilgisini yazın.",
    fields: [
      { name: "fabric", label: "Kumaş içeriği", placeholder: "Denim, keten, saten...", required: true },
      { name: "waistType", label: "Bel tipi", type: "select", options: [
        { value: "normal", label: "Normal bel" },
        { value: "yuksek", label: "Yüksek bel" },
        { value: "lastikli", label: "Lastikli bel" }
      ] },
      { name: "legType", label: "Boy / kesim", placeholder: "Mini, midi, maksi, kalem, pileli..." },
      { name: "fit", label: "Kalıp", type: "select", options: [
        { value: "regular", label: "Regular" },
        { value: "slim", label: "Dar" },
        { value: "wide", label: "Bol" }
      ] },
      { name: "sizeRange", label: "Beden aralığı", placeholder: "XS-XL", required: true },
      { name: "colorsText", label: "Renk seçenekleri", placeholder: "Siyah, bej, lacivert..." },
      { name: "useCase", label: "Kullanım alanı", placeholder: "Ofis, günlük, davet..." },
      { name: "season", label: "Sezon", type: "select", options: seasonOptions }
    ]
  },
  telefon: {
    family: "teknoloji",
    label: "Teknoloji / Telefon",
    shortLabel: "Telefon",
    defaultMotivation: "ihtiyac",
    audience: "income",
    exampleName: "128 GB 5G Akıllı Telefon",
    descriptionPlaceholder: "Marka/model, RAM, depolama, kamera, batarya, ekran ve garanti durumunu yazın.",
    fields: [
      { name: "brand", label: "Marka / model", placeholder: "Marka ve model", required: true },
      { name: "ram", label: "RAM", placeholder: "8 GB", required: true },
      { name: "storage", label: "Depolama", placeholder: "128 GB", required: true },
      { name: "processor", label: "İşlemci", placeholder: "Snapdragon / A serisi..." },
      { name: "camera", label: "Kamera", placeholder: "50 MP OIS, 4K video..." },
      { name: "battery", label: "Batarya", placeholder: "5000 mAh" },
      { name: "screenSize", label: "Ekran", placeholder: "6.5 inch AMOLED" },
      { name: "refreshRate", label: "Yenileme hızı", placeholder: "120 Hz" }
    ]
  },
  laptop: {
    family: "teknoloji",
    label: "Teknoloji / Laptop",
    shortLabel: "Laptop",
    defaultMotivation: "profesyonel_kullanim",
    audience: "income",
    exampleName: "16 GB RAM İş Laptopu",
    descriptionPlaceholder: "İşlemci, RAM, depolama, ekran, GPU, batarya, ağırlık ve hangi iş için uygun olduğunu yazın.",
    fields: [
      { name: "brand", label: "Marka / model", placeholder: "Marka ve model", required: true },
      { name: "processor", label: "İşlemci", placeholder: "i5, Ryzen 7, M serisi...", required: true },
      { name: "ram", label: "RAM", placeholder: "16 GB", required: true },
      { name: "storage", label: "Depolama", placeholder: "512 GB SSD", required: true },
      { name: "gpu", label: "Ekran kartı", placeholder: "RTX 4050, entegre..." },
      { name: "screenSize", label: "Ekran", placeholder: "14 inch IPS, 2K..." },
      { name: "battery", label: "Batarya / süre", placeholder: "8 saat, 60 Wh..." },
      { name: "weight", label: "Ağırlık", placeholder: "1.4 kg" },
      { name: "useCase", label: "Kullanım amacı", placeholder: "Ofis, yazılım, oyun, tasarım..." }
    ]
  },
  kulaklik: {
    family: "teknoloji",
    label: "Teknoloji / Kulaklık",
    shortLabel: "Kulaklık",
    defaultMotivation: "ihtiyac",
    audience: "income",
    exampleName: "ANC Bluetooth Kulaklık",
    descriptionPlaceholder: "Bağlantı tipi, pil, ANC, mikrofon, su dayanımı, gecikme ve kullanım alanını yazın.",
    fields: [
      { name: "brand", label: "Marka / model", placeholder: "Marka ve model" },
      { name: "connectionType", label: "Bağlantı", type: "select", options: [
        { value: "bluetooth", label: "Bluetooth" },
        { value: "kablolu", label: "Kablolu" },
        { value: "dongle", label: "2.4 GHz dongle" }
      ] },
      { name: "battery", label: "Pil süresi", placeholder: "30 saat" },
      { name: "noiseCancellation", label: "Aktif gürültü engelleme", type: "checkbox" },
      { name: "microphone", label: "Mikrofon kalitesi", placeholder: "ENC, çift mikrofon..." },
      { name: "waterResistance", label: "Su/ter dayanımı", placeholder: "IPX4, IP54..." },
      { name: "latency", label: "Gecikme", placeholder: "45 ms, düşük gecikme modu..." },
      { name: "useCase", label: "Kullanım amacı", placeholder: "Müzik, oyun, toplantı, spor..." }
    ]
  },
  tablet: {
    family: "teknoloji",
    label: "Teknoloji / Tablet",
    shortLabel: "Tablet",
    defaultMotivation: "ihtiyac",
    audience: "income",
    exampleName: "10.9 inç Kalem Destekli Tablet",
    descriptionPlaceholder: "Marka/model, ekran, RAM, depolama, kalem/klavye desteği, batarya ve kullanım amacını yazın.",
    fields: [
      { name: "brand", label: "Marka / model", placeholder: "Marka ve model", required: true },
      { name: "screenSize", label: "Ekran", placeholder: "10.9 inch IPS/AMOLED", required: true },
      { name: "ram", label: "RAM", placeholder: "6 GB" },
      { name: "storage", label: "Depolama", placeholder: "128 GB", required: true },
      { name: "processor", label: "İşlemci", placeholder: "A serisi, Snapdragon..." },
      { name: "battery", label: "Batarya", placeholder: "8000 mAh, 10 saat" },
      { name: "connectivity", label: "Bağlantı", placeholder: "Wi-Fi, LTE, 5G, kalem destekli..." },
      { name: "useCase", label: "Kullanım amacı", placeholder: "Eğitim, not alma, çizim, medya..." }
    ]
  },
  akilli_saat: {
    family: "teknoloji",
    label: "Teknoloji / Akıllı Saat",
    shortLabel: "Akıllı Saat",
    defaultMotivation: "ihtiyac",
    audience: "income",
    exampleName: "GPS ve AMOLED Ekranlı Akıllı Saat",
    descriptionPlaceholder: "Marka/model, pil, ekran, su dayanımı, sensörler, telefon uyumu ve spor/sağlık kullanımını yazın.",
    fields: [
      { name: "brand", label: "Marka / model", placeholder: "Marka ve model", required: true },
      { name: "screenSize", label: "Ekran boyutu", placeholder: "1.43 inch" },
      { name: "displayType", label: "Ekran tipi", placeholder: "AMOLED, Always-on..." },
      { name: "battery", label: "Pil süresi", placeholder: "7 gün, 14 gün..." },
      { name: "waterResistance", label: "Su dayanımı", placeholder: "5 ATM, IP68..." },
      { name: "sensors", label: "Sensörler", placeholder: "Nabız, SpO2, GPS, uyku takibi..." },
      { name: "connectivity", label: "Bağlantı / uyum", placeholder: "Bluetooth, eSIM, iOS/Android..." },
      { name: "useCase", label: "Kullanım amacı", placeholder: "Spor, sağlık takibi, bildirim..." }
    ]
  }
};

const categoryFamilies = [
  {
    key: "kiyafet",
    label: "Kıyafet",
    icon: Shirt,
    items: ["tisort", "pantolon", "mont", "elbise", "etek"]
  },
  {
    key: "teknoloji",
    label: "Teknolojik Cihaz",
    icon: Smartphone,
    items: ["telefon", "laptop", "kulaklik", "tablet", "akilli_saat"]
  }
];





function getString(formData: FormData, key: string): string | undefined {
  const value = String(formData.get(key) || "").trim();
  return value || undefined;
}

export default function ProductForm({ onSubmit, isLoading }: ProductFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [category, setCategory] = useState<Category>("tisort");
  const [motivation, setMotivation] = useState<PurchaseMotivation>("stil_begeni");
  const [linkStatus, setLinkStatus] = useState<string>("");
  const [isReadingLink, setIsReadingLink] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeCategory = useMemo(() => categoryConfig[category] || categoryConfig.tisort, [category]);

  const handleCategoryChange = (value: string | null) => {
    // Values can come from the link reader, so only accept categories the API knows.
    const nextCategory = (value && value in categoryConfig ? value : "tisort") as Category;
    setCategory(nextCategory);
    setMotivation(categoryConfig[nextCategory].defaultMotivation);
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
      description: String(formData.get("description") || ""),
      targetAudience: {
        ageRange: getString(formData, "ageRange") || "genel",
        gender: getString(formData, "gender") || "unisex",
        incomeLevel: getString(formData, "incomeLevel") || "middle"
      },
      features: {
        fabric: getString(formData, "fabric"),
        innerFilling: getString(formData, "innerFilling"),
        waterproof: formData.get("waterproof") === "on",
        windproof: formData.get("windproof") === "on",
        season: getString(formData, "season"),
        colors: getString(formData, "colorsText")?.split(",").map((item) => item.trim()).filter(Boolean),
        brand: getString(formData, "brand"),
        ram: getString(formData, "ram"),
        storage: getString(formData, "storage"),
        processor: getString(formData, "processor"),
        camera: getString(formData, "camera"),
        battery: getString(formData, "battery"),
        refreshRate: getString(formData, "refreshRate"),
        displayType: getString(formData, "displayType"),
        material: getString(formData, "material"),
        style: getString(formData, "style"),
        fit: getString(formData, "fit"),
        useCase: getString(formData, "useCase"),
        operatingSystem: getString(formData, "operatingSystem"),
        connectivity: getString(formData, "connectivity"),
        sensors: getString(formData, "sensors"),
        compatibleModel: getString(formData, "compatibleModel"),
        dimensions: getString(formData, "dimensions"),
        installationEase: getString(formData, "installationEase"),
        sizeRange: getString(formData, "sizeRange"),
        printType: getString(formData, "printType"),
        collarType: getString(formData, "collarType"),
        sleeveLength: getString(formData, "sleeveLength"),
        waistType: getString(formData, "waistType"),
        legType: getString(formData, "legType"),
        stretch: formData.get("stretch") === "on",
        hood: formData.get("hood") === "on",
        pocketCount: getString(formData, "pocketCount"),
        screenSize: getString(formData, "screenSize"),
        gpu: getString(formData, "gpu"),
        weight: getString(formData, "weight"),
        connectionType: getString(formData, "connectionType"),
        noiseCancellation: formData.get("noiseCancellation") === "on",
        microphone: getString(formData, "microphone"),
        waterResistance: getString(formData, "waterResistance"),
        latency: getString(formData, "latency")
      },
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
            <FieldLabel htmlFor="category" label="Kategori">
              <Select value={category} onValueChange={handleCategoryChange}>
                <SelectTrigger id="category" className="field h-11">
                  <SelectValue placeholder="Kategori seçin" />
                </SelectTrigger>
                <SelectContent>
                  {categoryFamilies.map((family) => (
                    <div key={family.key}>
                      <div className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-muted-foreground">
                        <family.icon className="h-3.5 w-3.5" aria-hidden /> {family.label}
                      </div>
                      {family.items.map((itemKey) => (
                        <SelectItem key={itemKey} value={itemKey}>
                          {categoryConfig[itemKey].shortLabel}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </FieldLabel>
            <FieldLabel htmlFor="motivation" label="Satın alma motivasyonu">
              <Select name="motivation" value={motivation} onValueChange={(val) => setMotivation((val as PurchaseMotivation) || activeCategory.defaultMotivation)}>
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
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
            <FieldLabel htmlFor="productName" label="Ürün adı" required>
              <input id="productName" name="productName" placeholder={activeCategory.exampleName} minLength={4} maxLength={120} required className="field" />
            </FieldLabel>
            <FieldLabel htmlFor="price" label="Fiyat (TL)" required>
              <input id="price" name="price" type="number" min="1" max="10000000" step="0.01" placeholder="1200" required className="field" />
            </FieldLabel>
          </div>

          <FieldLabel htmlFor="description" label="Ürün açıklaması" required hint="En az 40 karakter. Detay arttıkça simülasyon isabeti artar.">
            <textarea
              id="description"
              name="description"
              minLength={40}
              maxLength={4000}
              rows={6}
              placeholder={activeCategory.descriptionPlaceholder}
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
          <Step n={3} title={`${activeCategory.shortLabel} özellikleri`}>
            <div className="grid gap-4 sm:grid-cols-2">
              {activeCategory.fields.map((field) => {
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
              {activeCategory.audience === "full" && (
                <>
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
                </>
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
              <FieldLabel htmlFor="shippingDays" label="Kargo süresi (gün)">
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
          <b className="font-display">{activeCategory.shortLabel}</b> · 500 sentetik tüketici · genelde 30–90 sn
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
  children,
}: {
  htmlFor: string;
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    // gap, not space-y: Radix Select appends a hidden native <select> as the last child.
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm leading-6 font-bold text-foreground-2">
        {label} {required && <span className="text-skip-text" aria-hidden>*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
