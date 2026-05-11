"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PurchaseMotivation, SimulationRequest } from "@/types";
import { Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface ProductFormProps {
  onSubmit: (data: SimulationRequest) => void;
  isLoading: boolean;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function ProductForm({ onSubmit, isLoading }: ProductFormProps) {
  const [category, setCategory] = useState<string>("mont");
  const [motivation, setMotivation] = useState<PurchaseMotivation>("stil_begeni");
  
  const isSparePartOrProblemSolving = motivation === "problem_cozme" || motivation === "yedek_parca_tamir";

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const requestData: SimulationRequest = {
      category: category,
      purchaseMotivation: motivation,
      productName: formData.get("productName") as string,
      price: Number(formData.get("price")),
      description: formData.get("description") as string,
      targetAudience: {
        ageRange: formData.get("ageRange") as string || "18-30",
        gender: formData.get("gender") as string || "unisex",
        incomeLevel: formData.get("incomeLevel") as string || "middle"
      },
      features: {
        fabric: formData.get("fabric") as string,
        innerFilling: formData.get("innerFilling") as string,
        season: formData.get("season") as string,
        waterproof: formData.get("waterproof") === "on",
        
        // Dynamic ones
        compatibleModel: formData.get("compatibleModel") as string,
        dimensions: formData.get("dimensions") as string,
        installationEase: formData.get("installationEase") as string,
      },
      commerce: {
        shippingDays: Number(formData.get("shippingDays") || 3),
        returnAvailable: formData.get("returnAvailable") === "on",
        warranty: formData.get("warranty") === "on"
      }
    };
    
    onSubmit(requestData);
  };

  return (
    <Card className="w-full shadow-2xl border-border/50 dark:border-white/10 glass bg-card/40 backdrop-blur-xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
      
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          Ürün Analizi Başlat
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Ürün bilgilerini girerek AI destekli pazar simülasyonunu çalıştırın.
        </CardDescription>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent>
          <motion.div 
            variants={containerVariants} 
            initial="hidden" 
            animate="show"
            className="space-y-8"
          >
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Kategori Seçimi */}
              <div className="space-y-2 group">
                <Label htmlFor="category" className="group-focus-within:text-primary transition-colors">Ürün Kategorisi</Label>
                <Select name="category" value={category} onValueChange={(val) => setCategory(val || "mont")}>
                  <SelectTrigger id="category" className="focus:ring-primary/50 transition-all">
                    <SelectValue placeholder="Kategori seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mont">Mont / Dış Giyim</SelectItem>
                    <SelectItem value="telefon">Cep Telefonu</SelectItem>
                    <SelectItem value="sapka">Şapka / Aksesuar</SelectItem>
                    <SelectItem value="ev_yasam">Ev & Yaşam</SelectItem>
                    <SelectItem value="yedek_parca">Yedek Parça</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Satın Alma Motivasyonu */}
              <div className="space-y-2 group">
                <Label htmlFor="motivation" className="font-bold text-primary group-focus-within:text-primary-foreground transition-colors">Bu ürün neden satın alınır?</Label>
                <Select name="motivation" value={motivation} onValueChange={(val) => setMotivation((val as PurchaseMotivation) || "stil_begeni")}>
                  <SelectTrigger id="motivation" className="border-primary/50 bg-primary/5 focus:ring-primary transition-all">
                    <SelectValue placeholder="Motivasyon seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stil_begeni">Stil / Beğeni</SelectItem>
                    <SelectItem value="ihtiyac">Günlük İhtiyaç</SelectItem>
                    <SelectItem value="problem_cozme">Problem Çözme</SelectItem>
                    <SelectItem value="yedek_parca_tamir">Yedek Parça / Tamir</SelectItem>
                    <SelectItem value="hediye">Hediye Amaçlı</SelectItem>
                    <SelectItem value="trend">Trend / Sosyal Medya</SelectItem>
                    <SelectItem value="profesyonel_kullanim">Profesyonel Kullanım</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-4">
              <h3 className="text-lg font-semibold border-b border-border/50 pb-2 text-foreground/80">Temel Bilgiler</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 group">
                  <Label htmlFor="productName" className="group-focus-within:text-primary transition-colors">Ürün Adı <span className="text-red-500">*</span></Label>
                  <Input id="productName" name="productName" placeholder="Örn: Oversize Su Geçirmez Mont" required className="focus:ring-primary/50 focus:border-primary transition-all" />
                </div>
                
                <div className="space-y-2 group">
                  <Label htmlFor="price" className="group-focus-within:text-primary transition-colors">Fiyat (TL) <span className="text-red-500">*</span></Label>
                  <Input id="price" name="price" type="number" min="1" placeholder="1800" required className="focus:ring-primary/50 focus:border-primary transition-all" />
                </div>
              </div>

              <div className="space-y-2 group">
                <Label htmlFor="description" className="group-focus-within:text-primary transition-colors">Ürün Açıklaması <span className="text-red-500">*</span></Label>
                <textarea 
                  id="description" 
                  name="description" 
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:border-primary disabled:cursor-not-allowed disabled:opacity-50 transition-all"
                  placeholder={isSparePartOrProblemSolving ? "Ürünün hangi modellere uyumlu olduğunu, ölçülerini ve kullanım amacını net yazın." : "Kısa ürün özellikleri, kumaş, kullanım amacı vs."}
                  required
                />
              </div>
            </motion.div>

            <motion.div variants={itemVariants} className="space-y-4">
              <h3 className="text-lg font-semibold border-b border-border/50 pb-2 text-foreground/80">Hedef Kitle & Operasyon</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2 group">
                  <Label htmlFor="ageRange" className="group-focus-within:text-primary transition-colors">Yaş Aralığı</Label>
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
                      <SelectItem value="kadin">Kadın</SelectItem>
                      <SelectItem value="erkek">Erkek</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 group">
                  <Label htmlFor="shippingDays" className="group-focus-within:text-primary transition-colors">Kargo (Gün)</Label>
                  <Input id="shippingDays" name="shippingDays" type="number" defaultValue="3" className="focus:ring-primary/50 focus:border-primary transition-all" />
                </div>
              </div>
            </motion.div>

            {/* Dinamik Alanlar */}
            <motion.div variants={itemVariants} className="space-y-4">
              <h3 className="text-lg font-semibold border-b border-border/50 pb-2 text-foreground/80">
                Özellikler {isSparePartOrProblemSolving && <span className="text-primary text-sm">(Teknik Detaylar)</span>}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border border-border/50 dark:border-white/5">
                {isSparePartOrProblemSolving ? (
                  <>
                    <div className="space-y-2 group">
                      <Label htmlFor="compatibleModel" className="font-bold text-primary group-focus-within:text-primary-foreground transition-colors">Uyumlu Model / Marka</Label>
                      <Input id="compatibleModel" name="compatibleModel" placeholder="Örn: X Marka Bebek Arabası" className="focus:ring-primary/50 focus:border-primary transition-all" />
                    </div>
                    <div className="space-y-2 group">
                      <Label htmlFor="dimensions" className="font-bold text-primary group-focus-within:text-primary-foreground transition-colors">Ölçüler</Label>
                      <Input id="dimensions" name="dimensions" placeholder="Örn: Çap 5cm, Boy 10cm" className="focus:ring-primary/50 focus:border-primary transition-all" />
                    </div>
                    <div className="space-y-2 group">
                      <Label htmlFor="installationEase" className="group-focus-within:text-primary transition-colors">Montaj Kolaylığı</Label>
                      <Select name="installationEase" defaultValue="kolay">
                        <SelectTrigger id="installationEase" className="focus:ring-primary/50 transition-all"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cok_kolay">Tak Çalıştır</SelectItem>
                          <SelectItem value="kolay">Ev Kullanıcısı Yapabilir</SelectItem>
                          <SelectItem value="zor">Usta Gerektirir</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : category === "mont" ? (
                  <>
                    <div className="space-y-2 group">
                      <Label htmlFor="fabric" className="group-focus-within:text-primary transition-colors">Kumaş Tipi</Label>
                      <Input id="fabric" name="fabric" placeholder="Örn: Polyester" className="focus:ring-primary/50 focus:border-primary transition-all" />
                    </div>
                    <div className="space-y-2 group">
                      <Label htmlFor="season" className="group-focus-within:text-primary transition-colors">Mevsim</Label>
                      <Select name="season" defaultValue="winter">
                        <SelectTrigger id="season" className="focus:ring-primary/50 transition-all"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="winter">Kış</SelectItem>
                          <SelectItem value="summer">Yaz</SelectItem>
                          <SelectItem value="spring">Bahar</SelectItem>
                          <SelectItem value="all">Dört Mevsim</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <div className="col-span-2 text-sm text-muted-foreground italic flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Seçilen kategori ve motivasyona göre ekstra özellik alanları burada listelenecektir. Şimdilik temel bilgileri kullanabilirsiniz.
                  </div>
                )}
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
                  Simülasyon Çalışıyor...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Simülasyonu Başlat <Sparkles className="w-5 h-5" />
                </span>
              )}
            </Button>
          </motion.div>
        </CardFooter>
      </form>
    </Card>
  );
}
