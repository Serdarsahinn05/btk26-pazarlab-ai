"use client";

import { useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PurchaseMotivation, SimulationRequest } from "@/types";
import { readProductLink } from "@/lib/api";
import { Image as ImageIcon, Link2, Loader2, Plus, Shirt, Smartphone, Sparkles, Trash2, Upload } from "lucide-react";
import { motion, type Variants } from "framer-motion";

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
  { value: "winter", label: "Kis" },
  { value: "spring", label: "Bahar" },
  { value: "all", label: "Dort mevsim" }
];

const categoryConfig: Record<string, CategoryConfig> = {
  tisort: {
    family: "kiyafet",
    label: "Kiyafet / Tisort",
    shortLabel: "Tisort",
    defaultMotivation: "stil_begeni",
    audience: "full",
    exampleName: "Oversize Pamuklu Baskili Tisort",
    descriptionPlaceholder: "Kumas, kalip, yaka tipi, baski kalitesi, beden araligi ve kombin/kullanim senaryosunu yazin.",
    fields: [
      { name: "fabric", label: "Kumas icerigi", placeholder: "%100 pamuk, modal, polyester karisim...", required: true },
      { name: "fit", label: "Kalip", type: "select", options: [
        { value: "regular", label: "Regular" },
        { value: "oversize", label: "Oversize" },
        { value: "slim", label: "Slim" }
      ] },
      { name: "sizeRange", label: "Beden araligi", placeholder: "XS-XXL", required: true },
      { name: "collarType", label: "Yaka tipi", type: "select", options: [
        { value: "bisiklet", label: "Bisiklet yaka" },
        { value: "v_yaka", label: "V yaka" },
        { value: "polo", label: "Polo yaka" }
      ] },
      { name: "sleeveLength", label: "Kol tipi", type: "select", options: [
        { value: "kisa", label: "Kisa kol" },
        { value: "uzun", label: "Uzun kol" }
      ] },
      { name: "printType", label: "Baski / desen", placeholder: "Nakis, dijital baski, duz renk..." },
      { name: "colorsText", label: "Renk secenekleri", placeholder: "Siyah, beyaz, lacivert..." },
      { name: "season", label: "Sezon", type: "select", options: seasonOptions }
    ]
  },
  pantolon: {
    family: "kiyafet",
    label: "Kiyafet / Pantolon",
    shortLabel: "Pantolon",
    defaultMotivation: "ihtiyac",
    audience: "full",
    exampleName: "Regular Fit Keten Pantolon",
    descriptionPlaceholder: "Kumas, bel tipi, paca formu, esneklik, beden/olcu ve kullanim alanini yazin.",
    fields: [
      { name: "fabric", label: "Kumas icerigi", placeholder: "Denim, keten, gabardin...", required: true },
      { name: "fit", label: "Kalip", type: "select", options: [
        { value: "regular", label: "Regular" },
        { value: "slim", label: "Slim" },
        { value: "wide", label: "Wide leg" }
      ] },
      { name: "waistType", label: "Bel tipi", type: "select", options: [
        { value: "normal", label: "Normal bel" },
        { value: "yuksek", label: "Yuksek bel" },
        { value: "lastikli", label: "Lastikli bel" }
      ] },
      { name: "legType", label: "Paca tipi", type: "select", options: [
        { value: "duz", label: "Duz paca" },
        { value: "dar", label: "Dar paca" },
        { value: "bol", label: "Bol paca" }
      ] },
      { name: "stretch", label: "Esneklik var", type: "checkbox" },
      { name: "sizeRange", label: "Beden/olcu araligi", placeholder: "30-38 veya S-XL", required: true },
      { name: "useCase", label: "Kullanim alani", placeholder: "Ofis, gunluk, spor..." },
      { name: "season", label: "Sezon", type: "select", options: seasonOptions }
    ]
  },
  mont: {
    family: "kiyafet",
    label: "Kiyafet / Mont",
    shortLabel: "Mont",
    defaultMotivation: "stil_begeni",
    audience: "full",
    exampleName: "Su Gecirmez Oversize Kislik Mont",
    descriptionPlaceholder: "Kumas, ic dolgu, sezon, su/ruzgar korumasi, kapuson, cep ve beden bilgisini yazin.",
    fields: [
      { name: "fabric", label: "Dis kumas", placeholder: "Polyester, softshell...", required: true },
      { name: "innerFilling", label: "Ic dolgu", placeholder: "Elyaf, kaz tuyu, polar...", required: true },
      { name: "season", label: "Sezon", type: "select", options: seasonOptions },
      { name: "fit", label: "Kalip", type: "select", options: [
        { value: "regular", label: "Regular" },
        { value: "oversize", label: "Oversize" },
        { value: "slim", label: "Slim" }
      ] },
      { name: "sizeRange", label: "Beden araligi", placeholder: "S-XXL" },
      { name: "waterproof", label: "Su gecirmez", type: "checkbox" },
      { name: "windproof", label: "Ruzgar gecirmez", type: "checkbox" },
      { name: "hood", label: "Kapuson var", type: "checkbox" },
      { name: "pocketCount", label: "Cep sayisi", type: "number", placeholder: "4" }
    ]
  },
  elbise: {
    family: "kiyafet",
    label: "Kiyafet / Elbise",
    shortLabel: "Elbise",
    defaultMotivation: "stil_begeni",
    audience: "full",
    exampleName: "Midi Boy Keten Elbise",
    descriptionPlaceholder: "Kumas, kesim, astar, boy, beden araligi, sezon ve hangi ortamda kullanilacagini yazin.",
    fields: [
      { name: "fabric", label: "Kumas icerigi", placeholder: "Keten, viskon, saten...", required: true },
      { name: "fit", label: "Kesim / kalip", type: "select", options: [
        { value: "regular", label: "Regular" },
        { value: "slim", label: "Slim" },
        { value: "oversize", label: "Rahat kesim" }
      ] },
      { name: "sizeRange", label: "Beden araligi", placeholder: "XS-XL", required: true },
      { name: "sleeveLength", label: "Kol / askili tipi", type: "select", options: [
        { value: "askili", label: "Askili" },
        { value: "kisa", label: "Kisa kol" },
        { value: "uzun", label: "Uzun kol" }
      ] },
      { name: "legType", label: "Boy / kesim", placeholder: "Mini, midi, maksi, yirtmacli..." },
      { name: "colorsText", label: "Renk secenekleri", placeholder: "Siyah, yesil, ekru..." },
      { name: "useCase", label: "Kullanim alani", placeholder: "Gunluk, ofis, davet, tatil..." },
      { name: "season", label: "Sezon", type: "select", options: seasonOptions }
    ]
  },
  etek: {
    family: "kiyafet",
    label: "Kiyafet / Etek",
    shortLabel: "Etek",
    defaultMotivation: "stil_begeni",
    audience: "full",
    exampleName: "Yuksek Bel Midi Etek",
    descriptionPlaceholder: "Kumas, bel tipi, etek boyu, kalip, beden araligi, kombin ve sezon bilgisini yazin.",
    fields: [
      { name: "fabric", label: "Kumas icerigi", placeholder: "Denim, keten, saten...", required: true },
      { name: "waistType", label: "Bel tipi", type: "select", options: [
        { value: "normal", label: "Normal bel" },
        { value: "yuksek", label: "Yuksek bel" },
        { value: "lastikli", label: "Lastikli bel" }
      ] },
      { name: "legType", label: "Boy / kesim", placeholder: "Mini, midi, maksi, kalem, pileli..." },
      { name: "fit", label: "Kalip", type: "select", options: [
        { value: "regular", label: "Regular" },
        { value: "slim", label: "Dar" },
        { value: "wide", label: "Bol" }
      ] },
      { name: "sizeRange", label: "Beden araligi", placeholder: "XS-XL", required: true },
      { name: "colorsText", label: "Renk secenekleri", placeholder: "Siyah, bej, lacivert..." },
      { name: "useCase", label: "Kullanim alani", placeholder: "Ofis, gunluk, davet..." },
      { name: "season", label: "Sezon", type: "select", options: seasonOptions }
    ]
  },
  telefon: {
    family: "teknoloji",
    label: "Teknoloji / Telefon",
    shortLabel: "Telefon",
    defaultMotivation: "ihtiyac",
    audience: "income",
    exampleName: "128 GB 5G Akilli Telefon",
    descriptionPlaceholder: "Marka/model, RAM, depolama, kamera, batarya, ekran ve garanti durumunu yazin.",
    fields: [
      { name: "brand", label: "Marka / model", placeholder: "Marka ve model", required: true },
      { name: "ram", label: "RAM", placeholder: "8 GB", required: true },
      { name: "storage", label: "Depolama", placeholder: "128 GB", required: true },
      { name: "processor", label: "Islemci", placeholder: "Snapdragon / A serisi..." },
      { name: "camera", label: "Kamera", placeholder: "50 MP OIS, 4K video..." },
      { name: "battery", label: "Batarya", placeholder: "5000 mAh" },
      { name: "screenSize", label: "Ekran", placeholder: "6.5 inch AMOLED" },
      { name: "refreshRate", label: "Yenileme hizi", placeholder: "120 Hz" }
    ]
  },
  laptop: {
    family: "teknoloji",
    label: "Teknoloji / Laptop",
    shortLabel: "Laptop",
    defaultMotivation: "profesyonel_kullanim",
    audience: "income",
    exampleName: "16 GB RAM Is Laptopu",
    descriptionPlaceholder: "Islemci, RAM, depolama, ekran, GPU, batarya, agirlik ve hangi is icin uygun oldugunu yazin.",
    fields: [
      { name: "brand", label: "Marka / model", placeholder: "Marka ve model", required: true },
      { name: "processor", label: "Islemci", placeholder: "i5, Ryzen 7, M serisi...", required: true },
      { name: "ram", label: "RAM", placeholder: "16 GB", required: true },
      { name: "storage", label: "Depolama", placeholder: "512 GB SSD", required: true },
      { name: "gpu", label: "Ekran karti", placeholder: "RTX 4050, entegre..." },
      { name: "screenSize", label: "Ekran", placeholder: "14 inch IPS, 2K..." },
      { name: "battery", label: "Batarya / sure", placeholder: "8 saat, 60 Wh..." },
      { name: "weight", label: "Agirlik", placeholder: "1.4 kg" },
      { name: "useCase", label: "Kullanim amaci", placeholder: "Ofis, yazilim, oyun, tasarim..." }
    ]
  },
  kulaklik: {
    family: "teknoloji",
    label: "Teknoloji / Kulaklik",
    shortLabel: "Kulaklik",
    defaultMotivation: "ihtiyac",
    audience: "income",
    exampleName: "ANC Bluetooth Kulaklik",
    descriptionPlaceholder: "Baglanti tipi, pil, ANC, mikrofon, su dayanimi, gecikme ve kullanim alanini yazin.",
    fields: [
      { name: "brand", label: "Marka / model", placeholder: "Marka ve model" },
      { name: "connectionType", label: "Baglanti", type: "select", options: [
        { value: "bluetooth", label: "Bluetooth" },
        { value: "kablolu", label: "Kablolu" },
        { value: "dongle", label: "2.4 GHz dongle" }
      ] },
      { name: "battery", label: "Pil suresi", placeholder: "30 saat" },
      { name: "noiseCancellation", label: "Aktif gurultu engelleme", type: "checkbox" },
      { name: "microphone", label: "Mikrofon kalitesi", placeholder: "ENC, cift mikrofon..." },
      { name: "waterResistance", label: "Su/ter dayanimi", placeholder: "IPX4, IP54..." },
      { name: "latency", label: "Gecikme", placeholder: "45 ms, dusuk gecikme modu..." },
      { name: "useCase", label: "Kullanim amaci", placeholder: "Muzik, oyun, toplanti, spor..." }
    ]
  },
  tablet: {
    family: "teknoloji",
    label: "Teknoloji / Tablet",
    shortLabel: "Tablet",
    defaultMotivation: "ihtiyac",
    audience: "income",
    exampleName: "10.9 Inc Kalem Destekli Tablet",
    descriptionPlaceholder: "Marka/model, ekran, RAM, depolama, kalem/klavye destegi, batarya ve kullanim amacini yazin.",
    fields: [
      { name: "brand", label: "Marka / model", placeholder: "Marka ve model", required: true },
      { name: "screenSize", label: "Ekran", placeholder: "10.9 inch IPS/AMOLED", required: true },
      { name: "ram", label: "RAM", placeholder: "6 GB" },
      { name: "storage", label: "Depolama", placeholder: "128 GB", required: true },
      { name: "processor", label: "Islemci", placeholder: "A serisi, Snapdragon..." },
      { name: "battery", label: "Batarya", placeholder: "8000 mAh, 10 saat" },
      { name: "connectivity", label: "Baglanti", placeholder: "Wi-Fi, LTE, 5G, kalem destekli..." },
      { name: "useCase", label: "Kullanim amaci", placeholder: "Egitim, not alma, cizim, medya..." }
    ]
  },
  akilli_saat: {
    family: "teknoloji",
    label: "Teknoloji / Akilli Saat",
    shortLabel: "Akilli Saat",
    defaultMotivation: "ihtiyac",
    audience: "income",
    exampleName: "GPS ve AMOLED Ekranli Akilli Saat",
    descriptionPlaceholder: "Marka/model, pil, ekran, su dayanimi, sensorler, telefon uyumu ve spor/saglik kullanimini yazin.",
    fields: [
      { name: "brand", label: "Marka / model", placeholder: "Marka ve model", required: true },
      { name: "screenSize", label: "Ekran boyutu", placeholder: "1.43 inch" },
      { name: "displayType", label: "Ekran tipi", placeholder: "AMOLED, Always-on..." },
      { name: "battery", label: "Pil suresi", placeholder: "7 gun, 14 gun..." },
      { name: "waterResistance", label: "Su dayanimi", placeholder: "5 ATM, IP68..." },
      { name: "sensors", label: "Sensorler", placeholder: "Nabiz, SpO2, GPS, uyku takibi..." },
      { name: "connectivity", label: "Baglanti / uyum", placeholder: "Bluetooth, eSIM, iOS/Android..." },
      { name: "useCase", label: "Kullanim amaci", placeholder: "Spor, saglik takibi, bildirim..." }
    ]
  }
};

const categoryFamilies = [
  {
    key: "kiyafet",
    label: "Kiyafet",
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




const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

function getString(formData: FormData, key: string): string | undefined {
  const value = String(formData.get(key) || "").trim();
  return value || undefined;
}

export default function ProductForm({ onSubmit, isLoading }: ProductFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [category, setCategory] = useState<string>("tisort");
  const [motivation, setMotivation] = useState<PurchaseMotivation>("stil_begeni");
  const [linkStatus, setLinkStatus] = useState<string>("");
  const [isReadingLink, setIsReadingLink] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeCategory = useMemo(() => categoryConfig[category] || categoryConfig.tisort, [category]);

  const handleCategoryChange = (value: string) => {
    const nextCategory = value || "tisort";
    setCategory(nextCategory);
    const nextConfig = categoryConfig[nextCategory] || categoryConfig.tisort;
    setMotivation(nextConfig.defaultMotivation);
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
    
    const trySet = (attempt = 0) => {
      if (!formRef.current || attempt > 20) return; // 2 saniye boyunca dene
      
      const field = formRef.current.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
      if (field) {
        field.value = String(value);
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
      setLinkStatus("Once urun linkini girin.");
      return;
    }

    setIsReadingLink(true);
    setLinkStatus("Link okunuyor...");
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
        
        // Fiyat null degilse virgullu formatta set et
        if (result.price) {
          setFormValue("price", result.price.toString().replace(".", ","));
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
      setLinkStatus(result.warnings[0] || "Linkten tum bilgiler, kategori ve teknik detaylar okundu.");
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { detail?: string } } };
      const errorMsg = apiError.response?.data?.detail || "Link okunamadı. Site erişimi engelliyor olabilir.";
      setLinkStatus(errorMsg);
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
        setLinkStatus("Gorsel okunamadi.");
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
    <div className="bento-card border-primary/20 glow-blue overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

      <div className="mb-8">
        <h2 className="text-2xl font-black tracking-tighter flex items-center gap-3">
          <Sparkles className="w-6 h-6 text-primary" />
          Ürün Analizi Başlat
        </h2>
        <p className="text-muted-foreground text-sm font-medium mt-1">
          Ürün ailesini seçin; PazarLab pazar uyumunu saniyeler içinde analiz etsin.
        </p>
      </div>

      <form ref={formRef} onSubmit={handleSubmit}>
        <div className="space-y-10">
            
            {/* 1. ADIM: HIZLI BASLANGIC (Link & Gorseller) */}
            <motion.div variants={itemVariants} className="space-y-6 p-6 rounded-2xl bg-primary/5 border border-primary/20 relative overflow-hidden">
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
              <div className="flex items-center gap-2 text-lg font-bold text-primary border-b border-primary/20 pb-3 mb-4">
                <Link2 className="w-5 h-5" />
                Hizli Baslangic
              </div>

              <div className="space-y-2 group">
                <Label htmlFor="productUrl" className="text-sm font-semibold text-foreground/80">Urun Linki (Opsiyonel)</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input 
                    id="productUrl" 
                    name="productUrl" 
                    type="url" 
                    placeholder="Trendyol, Amazon, n11 linki yapistirin..." 
                    className="h-12 bg-background/50 border-primary/20 focus:ring-primary/50 focus:border-primary transition-all text-base" 
                  />
                  <Button 
                    type="button" 
                    onClick={handleReadLink} 
                    disabled={isReadingLink} 
                    className="h-12 sm:w-48 bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
                  >
                    {isReadingLink ? (
                      <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Okunuyor...</span>
                    ) : (
                      <span className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Linkten Oku</span>
                    )}
                  </Button>
                </div>
                <p className="text-[11px] text-primary/70 font-medium px-1 uppercase tracking-wider">{linkStatus || "Linkten okunan bilgiler asagidaki alanlara otomatik dolar."}</p>
              </div>

              {/* Product Images Section */}
              <div className="space-y-3 pt-2">
                <Label className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-primary" />
                  Urun Gorselleri
                </Label>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {/* Upload Area */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all ${
                      isDragging ? "border-primary bg-primary/20" : "border-primary/20 bg-background/40 hover:bg-primary/5 hover:border-primary/40"
                    }`}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    onDrop={onDrop}
                  >
                    <Upload className="w-5 h-5 text-primary/60" />
                    <span className="text-[9px] font-bold text-primary/60 uppercase text-center px-1">Yukle</span>
                    <input 
                      type="file" multiple accept="image/*" className="hidden" 
                      ref={fileInputRef} onChange={(e) => handleFileUpload(e.target.files)} 
                    />
                  </motion.div>

                  {images.map((url, idx) => (
                    <div key={idx} className="group relative aspect-square rounded-xl overflow-hidden border border-border/40 bg-background shadow-sm">
                      <img src={url} alt={`Urun ${idx}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button type="button" onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                          className="bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {/* URL Add Button (Small) */}
                  <Button 
                    type="button" variant="outline" size="icon"
                    onClick={() => {
                      const url = prompt("Gorsel URL'si girin:");
                      if (url && !images.includes(url)) setImages(prev => [...prev, url].slice(0, MAX_IMAGES));
                    }}
                    className="aspect-square h-auto rounded-xl border-dashed border-primary/20 bg-background/40"
                  >
                    <Plus className="h-4 w-4 text-primary/60" />
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* 2. ADIM: KATEGORI VE MOTIVASYON */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <div className="space-y-2 group">
                <Label htmlFor="category" className="text-sm font-bold text-primary uppercase tracking-wider">Urun Kategorisi</Label>
                <Select value={category} onValueChange={handleCategoryChange}>
                  <SelectTrigger id="category" className="h-12 border-border/60 bg-muted/5 focus:ring-primary transition-all text-base font-medium">
                    <SelectValue placeholder="Kategori Secin" />
                  </SelectTrigger>
                  <SelectContent className="glass border-primary/20">
                    {categoryFamilies.map((family) => (
                      <div key={family.key}>
                        <div className="px-3 py-2 text-[10px] font-black text-primary/50 uppercase tracking-[0.2em] bg-primary/5 flex items-center gap-2">
                          <family.icon className="w-3 h-3" /> {family.label}
                        </div>
                        {family.items.map((itemKey) => (
                          <SelectItem key={itemKey} value={itemKey} className="py-2.5 cursor-pointer">
                            {categoryConfig[itemKey].shortLabel}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 group">
                <Label htmlFor="motivation" className="text-sm font-bold text-primary uppercase tracking-wider">Satin Alma Motivasyonu</Label>
                <Select name="motivation" value={motivation} onValueChange={(val) => setMotivation((val as PurchaseMotivation) || activeCategory.defaultMotivation)}>
                  <SelectTrigger id="motivation" className="h-12 border-border/60 bg-muted/5 focus:ring-primary transition-all text-base font-medium">
                    <SelectValue placeholder="Motivasyon secin" />
                  </SelectTrigger>
                  <SelectContent className="glass border-primary/20">
                    <SelectItem value="stil_begeni">Stil / Begeni</SelectItem>
                    <SelectItem value="ihtiyac">Gunluk Ihtiyac</SelectItem>
                    <SelectItem value="problem_cozme">Problem Cozme</SelectItem>
                    <SelectItem value="hediye">Hediye Amacli</SelectItem>
                    <SelectItem value="trend">Trend / Sosyal Medya</SelectItem>
                    <SelectItem value="profesyonel_kullanim">Profesyonel Kullanim</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </motion.div>

            {/* 3. ADIM: TEMEL BILGILER */}
            <motion.div variants={itemVariants} className="space-y-6">
              <div className="flex items-center gap-3 border-b border-border/40 pb-3 mb-6">
                <div className="w-1.5 h-6 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                <h3 className="text-xl font-bold tracking-tight">Temel Bilgiler</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-3 space-y-2 group">
                  <Label htmlFor="productName" className="font-semibold text-foreground/90">Urun Adi <span className="text-red-500">*</span></Label>
                  <Input id="productName" name="productName" placeholder={activeCategory.exampleName} minLength={4} required className="h-12 focus:ring-primary/50 focus:border-primary transition-all" />
                </div>
                <div className="space-y-2 group">
                  <Label htmlFor="price" className="font-semibold text-foreground/90">Fiyat (TL) <span className="text-red-500">*</span></Label>
                  <Input id="price" name="price" type="number" min="1" placeholder="1200" required className="h-12 focus:ring-primary/50 focus:border-primary transition-all" />
                </div>
              </div>

              <div className="space-y-2 group">
                <Label htmlFor="description" className="font-semibold text-foreground/90">Urun Aciklamasi <span className="text-red-500">*</span></Label>
                <textarea
                  id="description"
                  name="description"
                  minLength={40}
                  className="flex min-h-[140px] w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all resize-none shadow-inner"
                  placeholder={activeCategory.descriptionPlaceholder}
                  required
                />
                <p className="text-[11px] text-muted-foreground italic px-1">En az 40 karakter girilmelidir. Daha detayli aciklama, daha dogru simulasyon demektir.</p>
              </div>
            </motion.div>

            {/* 4. ADIM: HEDEF & OPERASYON */}
            <motion.div variants={itemVariants} className="space-y-6 pt-4">
              <div className="flex items-center gap-3 border-b border-border/40 pb-3 mb-6">
                <div className="w-1.5 h-6 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                <h3 className="text-xl font-bold tracking-tight">Hedef & Operasyon</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                {activeCategory.audience === "full" && (
                  <>
                    <div className="space-y-2 group">
                      <Label htmlFor="ageRange" className="text-xs font-bold text-muted-foreground uppercase">Yas Araligi</Label>
                      <Select name="ageRange" defaultValue="18-30">
                        <SelectTrigger id="ageRange" className="h-11 focus:ring-primary/50 transition-all"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="13-17">13-17</SelectItem>
                          <SelectItem value="18-30">18-30</SelectItem>
                          <SelectItem value="30-45">30-45</SelectItem>
                          <SelectItem value="45+">45+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 group">
                      <Label htmlFor="gender" className="text-xs font-bold text-muted-foreground uppercase">Cinsiyet</Label>
                      <Select name="gender" defaultValue="unisex">
                        <SelectTrigger id="gender" className="h-11 focus:ring-primary/50 transition-all"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unisex">Unisex</SelectItem>
                          <SelectItem value="kadin">Kadin</SelectItem>
                          <SelectItem value="erkek">Erkek</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                <div className="space-y-2 group">
                  <Label htmlFor="incomeLevel" className="text-xs font-bold text-muted-foreground uppercase">Fiyat Segmenti</Label>
                  <Select name="incomeLevel" defaultValue="middle">
                    <SelectTrigger id="incomeLevel" className="h-11 focus:ring-primary/50 transition-all"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Ekonomik</SelectItem>
                      <SelectItem value="middle">Orta</SelectItem>
                      <SelectItem value="high">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 group">
                  <Label htmlFor="shippingDays" className="text-xs font-bold text-muted-foreground uppercase">Kargo (Gun)</Label>
                  <Input id="shippingDays" name="shippingDays" type="number" defaultValue="3" min="0" className="h-11 focus:ring-primary/50 focus:border-primary transition-all" />
                </div>
              </div>

              <div className="flex gap-4 p-4 rounded-xl bg-muted/20 border border-border/40">
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input name="returnAvailable" type="checkbox" defaultChecked className="h-4 w-4 accent-primary rounded border-primary/20" />
                  Iade imkani var
                </label>
                <div className="w-px h-5 bg-border/60 mx-2" />
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input name="warranty" type="checkbox" className="h-4 w-4 accent-primary rounded border-primary/20" />
                  Garanti / Fatura mevcut
                </label>
              </div>
            </motion.div>

            {/* 5. ADIM: DINAMIK OZELLIKLER */}
            <motion.div variants={itemVariants} className="space-y-6 pt-4">
              <div className="flex items-center gap-3 border-b border-border/40 pb-3 mb-6">
                <div className="w-1.5 h-6 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
                <h3 className="text-xl font-bold tracking-tight">{activeCategory.shortLabel} Teknik Detaylari</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5 bg-muted/10 p-6 rounded-2xl border border-border/50 shadow-inner">

                {activeCategory.fields.map((field) => {
                  if (field.type === "checkbox") {
                    return (
                      <label key={field.name} className="flex min-h-12 items-center gap-3 rounded-xl border border-border/50 bg-background/40 px-4 text-sm font-medium cursor-pointer hover:border-primary/40 transition-colors shadow-sm">
                        <input name={field.name} type="checkbox" className="h-4 w-4 accent-primary rounded" />
                        {field.label}
                      </label>
                    );
                  }

                  if (field.type === "select") {
                    return (
                      <div key={field.name} className="space-y-1.5 group">
                        <Label htmlFor={field.name} className="text-xs font-bold text-muted-foreground/80 uppercase">{field.label}</Label>
                        <Select name={field.name} defaultValue={field.options?.[0]?.value}>
                          <SelectTrigger id={field.name} className="h-10 bg-background/50 focus:ring-primary/30 transition-all text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent className="glass">
                            {field.options?.map((option) => (
                              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  }

                  return (
                    <div key={field.name} className="space-y-1.5 group">
                      <Label htmlFor={field.name} className="text-xs font-bold text-muted-foreground/80 uppercase">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </Label>
                      <Input
                        id={field.name}
                        name={field.name}
                        type={field.type === "number" ? "number" : "text"}
                        placeholder={field.placeholder}
                        required={field.required}
                        className="h-10 bg-background/50 focus:ring-primary/30 transition-all text-sm"
                      />
                    </div>
                  );
                })}
              </div>
            </motion.div>
        </div>

        <div className="bg-primary/5 border-t border-border/50 p-8 mt-10">
          <motion.div className="w-full" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <Button
              type="submit"
              size="lg"
              className="w-full font-black text-xl h-16 bg-primary hover:bg-primary/90 text-primary-foreground glow-blue transition-all rounded-2xl group overflow-hidden relative"
              disabled={isLoading}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              {isLoading ? (
                <span className="flex items-center gap-3">
                  <Loader2 className="h-7 w-7 animate-spin" />
                  SİMÜLASYON HAZIRLANIYOR...
                </span>
              ) : (
                <span className="flex items-center gap-3">
                  SİMÜLASYONU BAŞLAT <Sparkles className="w-6 h-6 animate-pulse" />
                </span>
              )}
            </Button>
          </motion.div>
        </div>

      </form>
    </div>

  );
}
