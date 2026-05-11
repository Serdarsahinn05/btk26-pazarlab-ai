# 🎨 PazarLab AI – Frontend & Dashboard Sorumlusu (Kişi 1)



## 🧑‍💻 Rolün
- **Adın:** Kişi 1 – Frontend / UI / Demo
- **Görevin:** Kullanıcının gördüğü her şeyi yapmak. Ürün formu, simülasyon loading ekranı, sonuç dashboard'u, demo akışı.
- **Teknolojin:** Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Recharts, Lucide React.
- **Çalışma Dizinin:** `frontend/`

---

## 🏗️ Proje Yapısı (Senin Alanın)
```
btk26-pazarlab-ai/
├── frontend/
│   ├── app/
│   │   ├── page.tsx              # Ana sayfa / tanıtım
│   │   ├── layout.tsx            # Root layout
│   │   └── globals.css           # Tailwind + tema
│   ├── components/
│   │   ├── ProductForm.tsx       # Kategoriye göre dinamik ürün formu
│   │   ├── ResultDashboard.tsx   # Ana dashboard (skor + kartlar)
│   │   ├── OverallScoreCard.tsx  # 3'lü skor kartı (genel + pazar + niyetli)
│   │   ├── TopPersonaCards.tsx   # Top 3 persona kartları
│   │   ├── WeaknessList.tsx      # Satın almama nedenleri
│   │   ├── AiFeedbackPanel.tsx   # AI önerileri / satış reçetesi
│   │   ├── PriceAdviceCard.tsx   # Fiyat feedback kartı
│   │   ├── SeasonFitCard.tsx     # Sezon uyumu kartı
│   │   ├── SimulationLogs.tsx    # Loading / log animasyonu
│   │   ├── MarketingAdviceCards.tsx # Reklam önerileri
│   │   ├── MarketBreadthCard.tsx # Pazar genişliği skoru (YENİ)
│   │   ├── IntentConversionCard.tsx # Niyetli alıcı dönüşümü (YENİ)
│   │   ├── ProblemSolutionCard.tsx # Problem çözüm uyumu (YENİ)
│   │   ├── ProductTypeInsight.tsx # Ürün tipi yorumu (YENİ)
│   │   └── ChannelRecommendation.tsx # Kanal önerisi (YENİ)
│   ├── lib/
│   │   └── api.ts                # Backend API çağrıları
│   ├── types/
│   │   └── index.ts              # TypeScript tipleri
│   ├── public/
│   ├── package.json
│   ├── tailwind.config.ts
│   └── .env.example
├── backend/   ← BUNA DOKUNMA (Kişi 2'nin alanı)
├── docs/      ← BUNA DOKUNMA (Kişi 3'ün alanı)
└── docker-compose.yml
```

---

## 🔗 API Sözleşmesi (Buna Sadık Kal!)
Backend sana şu JSON'u dönecek. Frontend bunu bekleyecek:

**POST** `http://localhost:8000/api/simulate`

**Request Body (Sen gönderirsin):**
```json
{
  "category": "mont",
  "purchaseMotivation": "stil_begeni",
  "productName": "Oversize Su Geçirmez Kışlık Mont",
  "price": 1800,
  "description": "Su geçirmez, oversize kesim, siyah kışlık mont.",
  "targetAudience": {
    "ageRange": "18-30",
    "gender": "unisex",
    "incomeLevel": "middle"
  },
  "features": {
    "fabric": "polyester",
    "innerFilling": "elyaf",
    "waterproof": true,
    "windproof": true,
    "season": "winter",
    "colors": ["siyah", "bej"],
    "sizes": ["S", "M", "L", "XL"]
  },
  "commerce": {
    "shippingDays": 3,
    "returnAvailable": true,
    "warranty": false
  }
}
```

**purchaseMotivation seçenekleri:**
- `stil_begeni` – Stil / beğeni odaklı (mont, takı, ayakkabı)
- `ihtiyac` – Günlük ihtiyaç (gazoz açacağı, mutfak eşyası)
- `problem_cozme` – Problem çözme (kapı kolu, adaptör)
- `yedek_parca_tamir` – Yedek parça / tamir (bebek arabası ayağı, conta)
- `hediye` – Hediye amaçlı
- `trend` – Trend / sosyal medya etkisi
- `profesyonel_kullanim` – Profesyonel kullanım

**Response (Backend sana bunu döner):**
```json
{
  "overallScore": 68,
  "marketBreadthScore": 74,
  "intentConversionScore": 63,
  "problemSolutionFit": 45,
  "simulatedConsumers": 500,
  "estimatedBuyers": 341,
  "topPersonas": [
    {
      "name": "Trend Takipçisi",
      "purchaseProbability": 0.82,
      "reason": "Oversize stil ve renk seçenekleri bu persona için güçlü.",
      "advice": "TikTok ve Instagram Reels odaklı kısa kombin videoları önerilir."
    }
  ],
  "weaknesses": [
    "Marka güveni düşük.",
    "Garanti bilgisi eksik."
  ],
  "normalizedProduct": {
    "priceFit": 0.70,
    "priceRisk": 0.30,
    "qualityScore": 0.76,
    "trendFit": 0.81,
    "brandTrust": 0.42,
    "descriptionCompleteness": 0.73,
    "visualAppeal": 0.84,
    "seasonFit": 0.92,
    "shippingReturnScore": 0.66,
    "targetAudienceFit": 0.80,
    "differentiationScore": 0.58
  },
  "aiInsights": {
    "summary": "Ürün özellikle genç ve trend odaklı kullanıcılar için güçlü potansiyel taşıyor.",
    "productTypeInsight": "Bu ürün trend odaklı bir stil ürünüdür. Geniş kitleye hitap eder, sosyal medya reklamlarıyla yüksek erişim sağlar.",
    "salesRecipe": [
      "Ürün başlığında su geçirmez ve oversize ifadeleri öne çıkarılmalı.",
      "Açıklamaya kumaş türü, beden kalıbı ve iade bilgisi eklenmeli."
    ],
    "marketingAdvice": "Instagram Reels ve TikTok odaklı kampanya önerilir.",
    "descriptionAdvice": "Kumaş, beden ve iade bilgisi açıklamaya eklenmeli.",
    "pricingAdvice": "1800TL premium algıyı koruyor ancak fiyat hassas kullanıcılar için kampanya gerekebilir.",
    "seasonAdvice": "Kış sezonu için yüksek uyum var. Yaz döneminde sezon sonu indirimi olarak konumlandırılabilir.",
    "channelRecommendation": ["Instagram", "TikTok", "YouTube Shorts"],
    "improvedDescription": "Su geçirmez dış yüzeyi ve oversize kesimiyle soğuk ve yağışlı havalarda günlük kullanım için tasarlanmış modern kışlık mont..."
  }
}
```

---

## ✅ Yapılacaklar Listesi (Sırayla)

### Adım 1: İskelet
- [ ] `frontend/` klasöründe Next.js + TypeScript + Tailwind projesi kur.
- [ ] `shadcn/ui` init et. (Button, Card, Input, Select, Badge, Progress, Skeleton, Tabs kullanacaksın)
- [ ] `lib/api.ts` dosyasını oluştur. `axios` veya `fetch` ile backend health check (`GET /api/health`) yap.

### Adım 2: Ürün Formu (GÜNCELLENDİ – purchaseMotivation eklendi)
- [ ] `ProductForm.tsx`: Kategori seçimi (mont, telefon, şapka, ev_yasam, yedek_parca, aksesuar).
- [ ] **YENİ – Satın Alma Motivasyonu:** Formun en üstüne veya kategori seçiminden hemen sonra şu select koy:
  ```
  "Bu ürün neden satın alınır?"
  - Stil / beğeni
  - İhtiyaç
  - Problem çözme
  - Yedek parça / tamir
  - Hediye
  - Trend / sosyal medya
  - Profesyonel kullanım
  ```
- [ ] **Kural:** Motivasyon = `problem_cozme` veya `yedek_parca_tamir` seçilirse, formda "uyumlu model", "ölçü", "montaj bilgisi" gibi teknik alanlar daha belirgin gösterilsin. Açıklama alanı placeholder'ı değişsin: "Ürünün hangi modellere uyumlu olduğunu, ölçülerini ve kullanım amacını net yazın."
- [ ] Her kategori için minimum alanlar:
  - **Ortak:** Ürün adı, fiyat, açıklama, hedef kitle (yaş aralığı, cinsiyet, gelir seviyesi), kargo süresi, iade var mı, garanti var mı.
  - **Mont:** Kumaş, iç dolgu, su geçirmezlik, rüzgar geçirmezlik, stil, bedenler, renkler, mevsim.
  - **Telefon:** Marka, RAM, depolama, işlemci, kamera, batarya, ekran yenileme hızı, garanti süresi.
  - **Şapka:** Malzeme, renk, stil, beden/ayarlanabilirlik, mevsim, kullanım alanı.
  - **Ev & Yaşam / Yedek Parça:** Uyumlu model, ölçü, malzeme, montaj kolaylığı, kullanım amacı.
- [ ] Form validasyonu (zorunlu alanlar kırmızı, fiyat sayısal).

### Adım 3: Loading Ekranı
- [ ] `SimulationLogs.tsx`: Simülasyon çalışırken "500 sentetik tüketici analiz ediliyor..." şeklinde typing/log efekti. 2-3 saniye sürsün.
- [ ] **YENİ:** Motivasyona göre log mesajı değişsin. Örn: "Yedek parça ürünleri için niyetli alıcı davranışı modelleniyor..."

### Adım 4: Dashboard (Mock Veriyle Başla!)
- [ ] `ResultDashboard.tsx`: Backend hazır olmasa bile çalışmalı. Önce yukarıdaki JSON'un aynısını hardcoded mock data olarak kullan.
- [ ] **GÜNCELLENDİ – OverallScoreCard:** Artık tek skor yerine **3 skor** göster:
  - **Genel Satış Potansiyeli:** `overallScore` (68/100) – büyük ana skor
  - **Pazar Genişliği:** `marketBreadthScore` (74/100) – küçük yan skor
  - **Niyetli Alıcı Dönüşümü:** `intentConversionScore` (63/100) – küçük yan skor
  - **Problem Çözüm Uyumu:** `problemSolutionFit` (45/100) – opsiyonel küçük skor
  - Tasarım: Büyük skor ortada, 3 küçük skor altında yan yana.
- [ ] **YENİ – ProductTypeInsight:** AI'ın ürünü nasıl sınıflandırdığını gösteren kart. Örn: "Bu ürün trend odaklı bir stil ürünüdür." veya "Bu ürün ihtiyaç odaklı bir yedek parça ürünüdür."
- [ ] **YENİ – ChannelRecommendation:** Kanal önerisi kartı. Sosyal medya ikonları (Instagram, TikTok) veya arama ikonları (Google, SEO) göster.
- [ ] `TopPersonaCards`: 3 kart. İsim, satın alma olasılığı (%), neden uygun, reklam önerisi.
- [ ] `WeaknessList`: Eksik/zayıf yönler listesi. İkonlu maddeleme.
- [ ] `AiFeedbackPanel`: AI özet, satış reçetesi (maddeleme), iyileştirilmiş açıklama metni.
- [ ] `PriceAdviceCard` & `SeasonFitCard`: Ayrı küçük kartlar.
- [ ] Grafik: `Recharts` ile persona dağılımı bar chart veya radar chart.

### Adım 5: API Bağlantısı
- [ ] Backend `POST /api/simulate` hazır olduğunda mock datayı gerçek API çağrısıyla değiştir.
- [ ] Hata durumunda (backend kapalı) anlaşılır hata mesajı göster.

### Adım 6: Demo Parlatma
- [ ] Mobil responsive kontrolü.
- [ ] Loading → Dashboard geçişi animasyonlu.
- [ ] **YENİ – Demo ürünleri:**
  - "Oversize Su Geçirmez Kışlık Mont, 1800TL" (stil/trend)
  - "Bebek Arabası Yedek Ayağı, 120TL" (yedek parça) – NİŞ ÜRÜN DEMO'SU
  - "Kapı Kolu Seti, 350TL" (ihtiyaç/problem çözme) – NİŞ ÜRÜN DEMO'SU

---

## 🚫 Yapmaman Gerekenler
- `backend/` klasörüne dokunma.
- `docker-compose.yml`'i tek başına değiştirme (ekip grubunda konuşulur).
- `main` branch'e direkt push atma. Her iş ayrı branch:
  - `feature/frontend-product-form`
  - `feature/frontend-dashboard`
  - `feature/frontend-loading-logs`
  - `feature/frontend-demo-polish`

---

## 🔧 Vibe-Coding Prompt (Asistanına Yapıştır)

```
Sen bir Next.js ve React uzmanısın. Şu anda BTK'26 Hackathon için "PazarLab AI" projesinin Frontend sorumlusu olarak çalışıyorsun.

Proje yapısı:
- Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui, Recharts.
- Ana dizin: frontend/
- Backend ayrı bir FastAPI servis olarak localhost:8000'de çalışıyor.

Görevlerin:
1. Kategoriye göre dinamik ürün formu (mont, telefon, şapka, ev_yasam, yedek_parca).
   - Formda YENİ alan: "Bu ürün neden satın alınır?" (stil_begeni, ihtiyac, problem_cozme, yedek_parca_tamir, hediye, trend, profesyonel_kullanim)
   - Motivasyona göre form alanları dinamik değişsin (örn: yedek parça seçilirse "uyumlu model" ve "ölçü" alanları öne çıksın).
2. Simülasyon loading/log ekranı.
3. Sonuç dashboard'u:
   - 3'lü skor kartı: Genel satış potansiyeli + Pazar genişliği + Niyetli alıcı dönüşümü
   - Top 3 persona kartları
   - Ürün tipi yorumu (trend ürünü mü, ihtiyaç ürünü mü?)
   - Kanal önerisi (sosyal medya vs SEO)
   - AI feedback paneli, fiyat ve sezon kartları
4. Backend API'si ile iletişim (POST /api/simulate).

Kurallar:
- Backend'e dokunma, sadece frontend/ altında çalış.
- API response formatı sabit, onu değiştirme.
- Önce mock veriyle dashboard'u çalıştır, sonra gerçek API'ye bağla.
- Responsive ve mobil uyumlu olmalı.
- shadcn/ui bileşenlerini kullan.
- Kod Türkçe değişken/prop isimleri kullanabilir ama dosya adları ve fonksiyon adları İngilizce olsun.
```

---

*Hazırlayan: PazarLab AI Ekibi | BTK'26 Hackathon*
