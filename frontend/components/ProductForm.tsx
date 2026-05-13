"use client";

import { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PurchaseMotivation, SimulationRequest } from "@/types";
import { readProductLink } from "@/lib/api";
import { Link2, Loader2, Shirt, Smartphone, Sparkles } from "lucide-react";
import { motion, type Variants } from "framer-motion";

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

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

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
  const [activeFamily, setActiveFamily] = useState<FamilyKey>("kiyafet");
  const [linkStatus, setLinkStatus] = useState<string>("");
  const [isReadingLink, setIsReadingLink] = useState(false);
  const activeCategory = useMemo(() => categoryConfig[category] || categoryConfig.tisort, [category]);

  const handleCategoryChange = (value: string) => {
    const nextCategory = value || "tisort";
    setCategory(nextCategory);
    const nextConfig = categoryConfig[nextCategory] || categoryConfig.tisort;
    setActiveFamily(nextConfig.family);
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
      price: Number(formData.get("price")),
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
      }
    };

    onSubmit(requestData);
  };

  const setFormValue = (name: string, value?: string | number | null) => {
    if (!formRef.current || value === undefined || value === null || value === "") return;
    const field = formRef.current.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | null;
    if (field) field.value = String(value);
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
      setFormValue("productName", result.title);
      setFormValue("description", result.description);
      setFormValue("price", result.price);
      setFormValue("brand", result.brand);
      setLinkStatus(result.warnings[0] || "Linkten okunabilen bilgiler forma eklendi.");
    } catch {
      setLinkStatus("Link okunamadi. Site engelliyor olabilir; bilgileri elle girebilirsiniz.");
    } finally {
      setIsReadingLink(false);
    }
  };

  return (
    <Card className="w-full shadow-2xl border-border/50 dark:border-white/10 glass bg-card/40 backdrop-blur-xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />

      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          Urun Analizi Baslat
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Urun ailesini secin; form sadece o urunun satin alma kararini etkileyen alanlari sorar.
        </CardDescription>
      </CardHeader>

      <form ref={formRef} onSubmit={handleSubmit}>
        <CardContent>
          <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-8">
            <motion.div variants={itemVariants} className="space-y-4">
              <Label>Urun Kategorisi</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categoryFamilies.map((family) => {
                  const Icon = family.icon;
                  const isFamilyActive = family.items.includes(category);
                  const isFamilyOpen = activeFamily === family.key || isFamilyActive;
                  return (
                    <div
                      key={family.key}
                      onMouseEnter={() => setActiveFamily(family.key as FamilyKey)}
                      onClick={() => setActiveFamily(family.key as FamilyKey)}
                      className={`group rounded-lg border p-4 transition-all bg-muted/10 hover:border-primary/60 hover:bg-primary/5 ${
                        isFamilyOpen ? "border-primary/70 bg-primary/5" : "border-border/60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </span>
                        <div>
                          <div className="font-semibold">{family.label}</div>
                          <div className="text-xs text-muted-foreground">Alt urunleri gormek icin uzerine gelin</div>
                        </div>
                      </div>
                      <div className={`mt-4 grid gap-2 overflow-hidden transition-all duration-300 md:max-h-0 md:opacity-0 md:group-hover:max-h-72 md:group-hover:opacity-100 md:group-focus-within:max-h-72 md:group-focus-within:opacity-100 ${
                        isFamilyOpen ? "md:max-h-72 md:opacity-100" : ""
                      }`}>
                        {family.items.map((itemKey) => {
                          const item = categoryConfig[itemKey];
                          const isActive = category === itemKey;
                          return (
                            <button
                              key={itemKey}
                              type="button"
                              onClick={() => handleCategoryChange(itemKey)}
                              className={`h-10 rounded-md border px-3 text-left text-sm transition-colors ${
                                isActive
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border/70 bg-background/70 hover:border-primary/60"
                              }`}
                            >
                              {item.shortLabel}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 group">
                <Label htmlFor="motivation" className="font-bold text-primary group-focus-within:text-primary-foreground transition-colors">
                  Satin alma motivasyonu
                </Label>
                <Select name="motivation" value={motivation} onValueChange={(val) => setMotivation((val as PurchaseMotivation) || activeCategory.defaultMotivation)}>
                  <SelectTrigger id="motivation" className="border-primary/50 bg-primary/5 focus:ring-primary transition-all">
                    <SelectValue placeholder="Motivasyon secin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stil_begeni">Stil / Begeni</SelectItem>
                    <SelectItem value="ihtiyac">Gunluk Ihtiyac</SelectItem>
                    <SelectItem value="problem_cozme">Problem Cozme</SelectItem>
                    <SelectItem value="hediye">Hediye Amacli</SelectItem>
                    <SelectItem value="trend">Trend / Sosyal Medya</SelectItem>
                    <SelectItem value="profesyonel_kullanim">Profesyonel Kullanim</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 group">
                <Label htmlFor="price" className="group-focus-within:text-primary transition-colors">Fiyat (TL) <span className="text-red-500">*</span></Label>
                <Input id="price" name="price" type="number" min="1" placeholder="1200" required className="focus:ring-primary/50 focus:border-primary transition-all" />
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-4">
              <h3 className="text-lg font-semibold border-b border-border/50 pb-2 text-foreground/80">Temel Bilgiler</h3>

              <div className="space-y-2 group">
                <Label htmlFor="productUrl" className="group-focus-within:text-primary transition-colors">Urun Linki</Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input id="productUrl" name="productUrl" type="url" placeholder="https://..." className="focus:ring-primary/50 focus:border-primary transition-all" />
                  <Button type="button" variant="outline" onClick={handleReadLink} disabled={isReadingLink} className="sm:w-40">
                    {isReadingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                    Linkten Oku
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{linkStatus || "Opsiyonel: sayfa izin verirse baslik, fiyat ve aciklama otomatik doldurulur."}</p>
              </div>

              <div className="space-y-2 group">
                <Label htmlFor="productName" className="group-focus-within:text-primary transition-colors">Urun Adi <span className="text-red-500">*</span></Label>
                <Input id="productName" name="productName" placeholder={activeCategory.exampleName} minLength={4} required className="focus:ring-primary/50 focus:border-primary transition-all" />
              </div>

              <div className="space-y-2 group">
                <Label htmlFor="description" className="group-focus-within:text-primary transition-colors">Urun Aciklamasi <span className="text-red-500">*</span></Label>
                <textarea
                  id="description"
                  name="description"
                  minLength={40}
                  className="flex min-h-[108px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                  placeholder={activeCategory.descriptionPlaceholder}
                  required
                />
                <p className="text-xs text-muted-foreground">En az 40 karakter girin; tek harf veya bos aciklama artik simule edilmez.</p>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-4">
              <h3 className="text-lg font-semibold border-b border-border/50 pb-2 text-foreground/80">Hedef & Operasyon</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {activeCategory.audience === "full" && (
                  <>
                    <div className="space-y-2 group">
                      <Label htmlFor="ageRange" className="group-focus-within:text-primary transition-colors">Yas Araligi</Label>
                      <Select name="ageRange" defaultValue="18-30">
                        <SelectTrigger id="ageRange" className="focus:ring-primary/50 transition-all"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="13-17">13-17</SelectItem>
                          <SelectItem value="18-30">18-30</SelectItem>
                          <SelectItem value="30-45">30-45</SelectItem>
                          <SelectItem value="45+">45+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 group">
                      <Label htmlFor="gender" className="group-focus-within:text-primary transition-colors">Cinsiyet</Label>
                      <Select name="gender" defaultValue="unisex">
                        <SelectTrigger id="gender" className="focus:ring-primary/50 transition-all"><SelectValue /></SelectTrigger>
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
                  <Label htmlFor="incomeLevel" className="group-focus-within:text-primary transition-colors">Fiyat Segmenti</Label>
                  <Select name="incomeLevel" defaultValue="middle">
                    <SelectTrigger id="incomeLevel" className="focus:ring-primary/50 transition-all"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Ekonomik</SelectItem>
                      <SelectItem value="middle">Orta</SelectItem>
                      <SelectItem value="high">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 group">
                  <Label htmlFor="shippingDays" className="group-focus-within:text-primary transition-colors">Kargo (Gun)</Label>
                  <Input id="shippingDays" name="shippingDays" type="number" defaultValue="3" min="0" className="focus:ring-primary/50 focus:border-primary transition-all" />
                </div>
              </div>

              <div className="flex flex-wrap gap-5 rounded-lg border border-border/50 bg-muted/20 p-4">
                <label className="flex items-center gap-2 text-sm">
                  <input name="returnAvailable" type="checkbox" defaultChecked className="h-4 w-4 accent-primary" />
                  Iade var
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input name="warranty" type="checkbox" className="h-4 w-4 accent-primary" />
                  Garanti / fatura var
                </label>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-4">
              <h3 className="text-lg font-semibold border-b border-border/50 pb-2 text-foreground/80">{activeCategory.label} Ozellikleri</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border border-border/50 dark:border-white/5">
                {activeCategory.fields.map((field) => {
                  if (field.type === "checkbox") {
                    return (
                      <label key={field.name} className="flex min-h-10 items-center gap-2 rounded-md border border-border/50 px-3 text-sm">
                        <input name={field.name} type="checkbox" className="h-4 w-4 accent-primary" />
                        {field.label}
                      </label>
                    );
                  }

                  if (field.type === "select") {
                    return (
                      <div key={field.name} className="space-y-2 group">
                        <Label htmlFor={field.name} className="group-focus-within:text-primary transition-colors">{field.label}</Label>
                        <Select name={field.name} defaultValue={field.options?.[0]?.value}>
                          <SelectTrigger id={field.name} className="focus:ring-primary/50 transition-all"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {field.options?.map((option) => (
                              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  }

                  return (
                    <div key={field.name} className="space-y-2 group">
                      <Label htmlFor={field.name} className="group-focus-within:text-primary transition-colors">
                        {field.label} {field.required && <span className="text-red-500">*</span>}
                      </Label>
                      <Input
                        id={field.name}
                        name={field.name}
                        type={field.type === "number" ? "number" : "text"}
                        placeholder={field.placeholder}
                        required={field.required}
                        className="focus:ring-primary/50 focus:border-primary transition-all"
                      />
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        </CardContent>
        <CardFooter className="bg-muted/10 border-t border-border/50 dark:border-white/5 p-6 mt-4">
          <motion.div className="w-full" whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <Button
              type="submit"
              size="lg"
              className="w-full font-bold text-lg h-14 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(var(--primary),0.4)] transition-all"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  Simulasyon Calisiyor...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Simulasyonu Baslat <Sparkles className="w-5 h-5" />
                </span>
              )}
            </Button>
          </motion.div>
        </CardFooter>
      </form>
    </Card>
  );
}
