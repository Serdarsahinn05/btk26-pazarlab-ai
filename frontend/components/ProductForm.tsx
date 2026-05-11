"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PurchaseMotivation, SimulationRequest } from "@/types";
import { Loader2 } from "lucide-react";

interface ProductFormProps {
  onSubmit: (data: SimulationRequest) => void;
  isLoading: boolean;
}

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
    <Card className="w-full shadow-lg border-primary/10">
      <CardHeader>
        <CardTitle className="text-2xl">Ürün Analizi Başlat</CardTitle>
        <CardDescription>
          Ürün bilgilerini girerek AI destekli pazar simülasyonunu çalıştırın.
        </CardDescription>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Kategori Seçimi */}
            <div className="space-y-2">
              <Label htmlFor="category">Ürün Kategorisi</Label>
              <Select name="category" value={category} onValueChange={(val) => setCategory(val || "mont")}>
                <SelectTrigger id="category">
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
            <div className="space-y-2">
              <Label htmlFor="motivation" className="font-bold text-primary">Bu ürün neden satın alınır?</Label>
              <Select name="motivation" value={motivation} onValueChange={(val) => setMotivation((val as PurchaseMotivation) || "stil_begeni")}>
                <SelectTrigger id="motivation" className="border-primary/50 bg-primary/5">
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
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Temel Bilgiler</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="productName">Ürün Adı <span className="text-red-500">*</span></Label>
                <Input id="productName" name="productName" placeholder="Örn: Oversize Su Geçirmez Mont" required />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="price">Fiyat (TL) <span className="text-red-500">*</span></Label>
                <Input id="price" name="price" type="number" min="1" placeholder="1800" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Ürün Açıklaması <span className="text-red-500">*</span></Label>
              <textarea 
                id="description" 
                name="description" 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder={isSparePartOrProblemSolving ? "Ürünün hangi modellere uyumlu olduğunu, ölçülerini ve kullanım amacını net yazın." : "Kısa ürün özellikleri, kumaş, kullanım amacı vs."}
                required
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Hedef Kitle & Operasyon</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ageRange">Yaş Aralığı</Label>
                <Select name="ageRange" defaultValue="18-30">
                  <SelectTrigger id="ageRange"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="13-17">13-17</SelectItem>
                    <SelectItem value="18-30">18-30</SelectItem>
                    <SelectItem value="30-45">30-45</SelectItem>
                    <SelectItem value="45+">45+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Cinsiyet</Label>
                <Select name="gender" defaultValue="unisex">
                  <SelectTrigger id="gender"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unisex">Unisex</SelectItem>
                    <SelectItem value="kadin">Kadın</SelectItem>
                    <SelectItem value="erkek">Erkek</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="shippingDays">Kargo (Gün)</Label>
                <Input id="shippingDays" name="shippingDays" type="number" defaultValue="3" />
              </div>
            </div>
          </div>

          {/* Dinamik Alanlar */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">
              Özellikler {isSparePartOrProblemSolving && <span className="text-primary text-sm">(Teknik Detaylar)</span>}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
              {isSparePartOrProblemSolving ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="compatibleModel" className="font-bold text-primary">Uyumlu Model / Marka</Label>
                    <Input id="compatibleModel" name="compatibleModel" placeholder="Örn: X Marka Bebek Arabası" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dimensions" className="font-bold text-primary">Ölçüler</Label>
                    <Input id="dimensions" name="dimensions" placeholder="Örn: Çap 5cm, Boy 10cm" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="installationEase">Montaj Kolaylığı</Label>
                    <Select name="installationEase" defaultValue="kolay">
                      <SelectTrigger id="installationEase"><SelectValue /></SelectTrigger>
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
                  <div className="space-y-2">
                    <Label htmlFor="fabric">Kumaş Tipi</Label>
                    <Input id="fabric" name="fabric" placeholder="Örn: Polyester" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="season">Mevsim</Label>
                    <Select name="season" defaultValue="winter">
                      <SelectTrigger id="season"><SelectValue /></SelectTrigger>
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
                <div className="col-span-2 text-sm text-muted-foreground italic">
                  Seçilen kategori ve motivasyona göre ekstra özellik alanları burada listelenecektir. Şimdilik temel bilgileri kullanabilirsiniz.
                </div>
              )}
            </div>
          </div>

        </CardContent>
        <CardFooter className="bg-muted/20 border-t p-6">
          <Button 
            type="submit" 
            size="lg" 
            className="w-full font-bold text-lg h-14" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                Simülasyon Çalışıyor...
              </>
            ) : (
              "Simülasyonu Başlat"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
