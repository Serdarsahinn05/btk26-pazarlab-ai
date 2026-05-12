# 🧠 PazarLab AI – AI, Veri & Dokümantasyon Sorumlusu (Kişi 3)

> **Vibe-Coding Sistem Promptu:** Aşağıdaki tüm metni kopyalayıp AI asistanına (Cursor/Windsurf/Copilot) yapıştır.
> Sonra de ki: *"Ben bu projede AI ve Veri sorumlusuyum. Buna göre dosyaları oluştur ve projeyi geliştir."*

---

## 🧑‍💻 Rolün
- **Adın:** Kişi 3 – AI / Output Mantığı / Persona Verisi / Kategori Kuralları / Dokümantasyon
- **Görevin:** Projenin "beynini" ve "anlatımını" tasarlamak. Persona tiplerini, kategori kurallarını, AI promptlarını, fallback metinlerini ve demo senaryosunu hazırlamak.
- **Teknolojin:** Python (prompt servisi için), JSON, Markdown.
- **Çalışma Dizinin:** `backend/app/data/`, `backend/app/services/ai_insight_service.py`, `docs/`

---

## 🏗️ Proje Yapısı (Senin Alanın)
```
btk26-pazarlab-ai/
├── backend/
│   ├── app/
│   │   ├── data/
│   │   │   ├── personas.json              # 8-10 persona, toplam 500 bot
│   │   │   ├── category_rules.json        # Kategori ağırlıkları & form alanları
│   │   │   └── trend_mock_data.json       # Örnek trend verisi
│   │   ├── services/
│   │   │   └── ai_insight_service.py      # AI prompt & fallback mantığı
│   │   └── utils/
│   │       └── scoring_utils.py           # (Destek)
│   └── ...
├── docs/
│   ├── architecture.md                    # Mimari doküman
│   ├── api-contract.md                    # API sözleşmesi
│   ├── demo-script.md                     # Demo senaryosu
│   └── ai-output.md                       # AI çıktı formatı spesifikasyonu
├── frontend/   ← BUNA DOKUNMA (Kişi 1'in alanı)
└── docker-compose.yml
```

---

## 🔗 API Sözleşmesi (Buna Sadık Kal!)
Senin hazırladığın `ai_insight_service.py`, backend'in `simulation_service.py`'den şu özet veriyi alacak:

```json
{
  "overallScore": 68,
  "marketBreadthScore": 74,
  "intentConversionScore": 63,
  "problemSolutionFit": 45,
  "simulatedConsumers": 500,
  "estimatedBuyers": 341,
  "topPersonas": [
    {"name": "Trend Takipçisi", "purchaseProbability": 0.82},
    {"name": "Pratik Çözüm Arayan", "purchaseProbability": 0.74},
    {"name": "Kalite Odaklı Alıcı", "purchaseProbability": 0.69}
  ],
  "weaknessSignals": ["brand_trust_low", "warranty_missing", "price_sensitive_users_rejected"],
  "normalizedProduct": {
    "priceFit": 0.70,
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
  "purchaseMotivation": "stil_begeni"
}
```

Ve bunu şu formata çevirecek (frontend'in beklediği `aiInsights` alanı):

```json
{
  "aiInsights": {
    "summary": "...",
    "productTypeInsight": "Bu ürün trend odaklı bir stil ürünüdür...",
    "salesRecipe": ["...", "..."],
    "marketingAdvice": "...",
    "descriptionAdvice": "...",
    "pricingAdvice": "...",
    "seasonAdvice": "...",
    "channelRecommendation": ["Instagram", "TikTok"],
    "improvedDescription": "..."
  }
}
```

---

## ✅ Yapılacaklar Listesi (Sırayla)

### Adım 1: Dokümantasyon & Kurallar
- [ ] `README.md` yaz: Proje adı, ekip rolleri, kurulum adımları (`docker compose up --build`), demo akışı.
- [ ] `docs/architecture.md`: Hibrit mimariyi açıkla. "Her bot ayrı AI değil, matematiksel profil" vurgusu yap. **YENİ:** "Kategori + Satın alma motivasyonu" iki eksenli analizi ekle.
- [ ] `docs/api-contract.md`: Request/response formatını tablo halinde yaz. **YENİ:** `purchaseMotivation` alanını ve `marketBreadthScore`, `intentConversionScore`, `problemSolutionFit`, `productTypeInsight`, `channelRecommendation` çıktılarını ekle.
- [ ] `docs/ai-output.md`: Dashboard'ta gösterilecek AI çıktılarını listele. **YENİ:** Ürün tipi yorumu, kanal önerisi, pazar genişliği yorumu ekle.

### Adım 2: Persona Verisi (GÜNCELLENDİ – Motivasyon Bazlı)
- [ ] `personas.json` oluştur. 8-10 ana persona tipi. Her persona için 50-60 varyasyon (toplam ~500 bot).
- [ ] Persona tipleri:
  1. Fiyat Hassas Alıcı
  2. Trend Takipçisi
  3. Kalite Odaklı Alıcı
  4. Detaycı Araştırmacı
  5. Dürtüsel Alıcı
  6. Marka Sadığı
  7. Sosyal Onay Arayan Kullanıcı
  8. Pratik Çözüm Arayan Kullanıcı
  9. Premium Alıcı
  10. Kararsız Sepet Bekletici
- [ ] **YENİ – Motivasyona Göre Persona Vurguları:**
  - `problem_cozme` için güçlü persona: "Problem Çözüm Odaklı Kullanıcı" (detailNeed: 0.85, shippingSensitivity: 0.80, priceSensitivity: 0.60)
  - `yedek_parca_tamir` için güçlü persona: "Detaycı Uyum Kontrolcüsü" (detailNeed: 0.90, brandTrustNeed: 0.30, shippingSensitivity: 0.85)
  - `stil_begeni` için güçlü persona: "Trend Takipçisi" (trendSensitivity: 0.90, visualAppeal: 0.85)
  - `hediye` için güçlü persona: "Dürtüsel Alıcı" (impulsiveness: 0.85, brandTrustNeed: 0.70)
- [ ] Her botun parametre aralıkları persona'ya göre farklı olsun.
- [ ] `id`, `persona`, `age`, `incomeLevel` + 10 davranış parametresi.

### Adım 3: Kategori Kuralları (GÜNCELLENDİ – Motivasyon Bazlı Ağırlıklar)
- [ ] `category_rules.json` oluştur. Her kategori için:
  - Form alanları (frontend formunda gösterilecek sorular)
  - Normalizasyon kuralları (ham veri -> 10 ortak parametre)
  - **YENİ:** Motivasyona göre ağırlıklar:
    - **Mont + stil_begeni:**
      ```json
      {"priceFit": 0.14, "qualityScore": 0.18, "trendFit": 0.13, "brandTrust": 0.06, "descriptionCompleteness": 0.08, "visualAppeal": 0.15, "seasonFit": 0.18, "shippingReturnScore": 0.08, "targetAudienceFit": 0.07, "differentiationScore": 0.03}
      ```
    - **Yedek parça + problem_cozme:**
      ```json
      {"priceFit": 0.16, "qualityScore": 0.15, "trendFit": 0.03, "brandTrust": 0.04, "descriptionCompleteness": 0.18, "visualAppeal": 0.03, "seasonFit": 0.02, "shippingReturnScore": 0.15, "targetAudienceFit": 0.14, "differentiationScore": 0.02}
      ```
    - **Kapı kolu + ihtiyac:**
      ```json
      {"priceFit": 0.15, "qualityScore": 0.16, "trendFit": 0.05, "brandTrust": 0.08, "descriptionCompleteness": 0.15, "visualAppeal": 0.10, "seasonFit": 0.03, "shippingReturnScore": 0.12, "targetAudienceFit": 0.11, "differentiationScore": 0.05}
      ```

### Adım 4: AI Prompt Tasarımı (GÜNCELLENDİ – Ürün Tipi Sınıflandırma)
- [ ] `ai_insight_service.py` içinde prompt şablonu hazırla:
  ```python
  SYSTEM_PROMPT = """
  Sen deneyimli bir e-ticaret danışmanısın. Aşağıdaki simülasyon sonucunu satıcıya net, kısa ve aksiyona dönüştürülebilir önerilerle sun.

  Ürün Bilgisi:
  - Kategori: {category}
  - Satın alma motivasyonu: {purchaseMotivation}
  - Pazar genişliği skoru: {marketBreadthScore}/100
  - Niyetli alıcı dönüşümü: {intentConversionScore}/100
  - Problem çözüm uyumu: {problemSolutionFit}/100

  Kurallar:
  - Satıcı küçük/orta ölçekli bir işletme olabilir; teknik jargon kullanma.
  - Her öneri somut ve uygulanabilir olsun.
  - Ürünü şu şekilde sınıflandır: "trend/stil ürünü", "ihtiyaç ürünü", "problem çözüm/yedek parça ürünü", "hediye ürünü"
  - Buna göre kanal önerisi ver: sosyal medya mı, SEO/arama mı, pazar yeri içi optimizasyon mu?
  - Niş ürünlerde (pazar genişliği < 40): "Geniş kitle reklamı yerine arama niyeti yüksek kullanıcılara ulaşmak daha doğru" vurgusu yap.
  - Cevabı SADECE JSON formatında döndür. Başka metin ekleme.

  {
    "summary": "2 cümlelik genel değerlendirme",
    "productTypeInsight": "Bu ürün [X] odaklı bir [Y] ürünüdür. Geniş kitleye [hitap eder/hitap etmez]...",
    "salesRecipe": ["3-5 maddelik aksiyon listesi"],
    "marketingAdvice": "Hangi kanal, hangi dil?",
    "descriptionAdvice": "Açıklamada ne eksik?",
    "pricingAdvice": "Fiyat algısı ve öneri",
    "seasonAdvice": "Mevsim değerlendirmesi",
    "channelRecommendation": ["Instagram", "TikTok", "Google Search", "SEO"],
    "improvedDescription": "Hazır, kullanıma hazır iyileştirilmiş ürün açıklaması"
  }
  """
  ```
- [ ] LLM API'si (OpenAI/Gemini) bağlantısı için fonksiyon yaz. API key yoksa exception yakalayıp fallback'e geç.

### Adım 5: Fallback Metinler (GÜNCELLENDİ – Motivasyon Bazlı!)
- [ ] AI API çalışmazsa diye `weaknessSignals` + `purchaseMotivation` -> Türkçe metin eşleştirmesi yap:
  ```python
  FALLBACK_MAP = {
    "brand_trust_low": "Marka bilinirliği düşük. Ürün açıklamasına garanti ve iade politikası detayı eklenmeli.",
    "warranty_missing": "Garanti bilgisi eksik. Satın alma güvenini artırmak için garanti süresi belirtilmeli.",
    "price_sensitive_users_rejected": "Fiyat hassas kullanıcılar ürünü pahalı buluyor. Kampanya veya ücretsiz kargo test edilebilir.",
    "description_incomplete": "Ürün açıklaması yetersiz. Teknik detaylar, kullanım senaryosu ve ölçü bilgisi eklenmeli.",
    "season_mismatch": "Mevsim uyumu düşük. Ürün mevsim dışı bir dönemde pazarlanıyor olabilir.",
    "compatibility_unclear": "Uyumluluk bilgisi eksik. Niş ürünlerde ölçü ve model uyumu satın alma kararının %70'ini etkiler."
  }
  ```
- [ ] **YENİ – Motivasyon Bazlı Fallback Summary:**
  ```python
  MOTIVATION_INSIGHTS = {
    "stil_begeni": "Bu ürün stil odaklı bir üründür. Görsel çekicilik, trend uyumu ve sosyal medya reklamları önemlidir.",
    "ihtiyac": "Bu ürün günlük ihtiyaç ürünüdür. Fiyat, pratiklik ve hızlı kargo satın alma kararını etkiler.",
    "problem_cozme": "Bu ürün problem çözüm odaklıdır. Açıklamada ölçü, uyumluluk ve teknik detay kritiktir. Arama motoru optimizasyonu daha değerlidir.",
    "yedek_parca_tamir": "Bu ürün yedek parça/tamir ürünüdür. Geniş kitleye hitap etmez ama arayan kişide yüksek dönüşüm sağlar. SEO ve pazar yeri araması önemlidir.",
    "hediye": "Bu ürün hediye potansiyeli taşır. Görsel sunum, marka güveni ve ambalaj/paketleme öne çıkarılmalıdır.",
    "trend": "Bu ürün trend odaklıdır. Sosyal medya reklamları, influencer işbirlikleri ve kısa videolar etkili olur.",
    "profesyonel_kullanim": "Bu ürün profesyonel kullanıma yöneliktir. Teknik detay, dayanıklılık ve garanti bilgisi önemlidir."
  }
  ```
- [ ] Fallback'te `summary`, `productTypeInsight`, `channelRecommendation` motivasyona göre hazır metinlerden oluşturulsun.

### Adım 6: Demo Senaryosu (GÜNCELLENDİ – 2 Demo Ürünü)
- [ ] `docs/demo-script.md` yaz:
  - **Demo 1 – Trend Ürünü:**
    - Ürün: Oversize Su Geçirmez Kışlık Mont, 1800TL
    - Kategori: Giyim/Mont
    - Motivasyon: `stil_begeni`
    - Özellikler: Su geçirmez, rüzgar geçirmez, oversize, siyah, kışlık
    - Hedef Kitle: 18-30, unisex, orta gelir
    - Beklenen Çıktı: overallScore ~68, marketBreadthScore ~74 (geniş), intentConversionScore ~63, top 3 persona (Trend Takipçisi, Pratik Çözüm Arayan, Kalite Odaklı), kanal: Instagram/TikTok
  - **Demo 2 – Niş Ürün (Kritik!):**
    - Ürün: Bebek Arabası Yedek Ayağı, 120TL
    - Kategori: Yedek Parça
    - Motivasyon: `yedek_parca_tamir`
    - Özellikler: Uyumlu model: X-Bebek Pro, ölçü: 12cm, malzeme: alüminyum, montaj: tak-çıkar
    - Beklenen Çıktı: overallScore ~42, marketBreadthScore ~18 (niş), intentConversionScore ~81 (yüksek!), problemSolutionFit ~88, top 3 persona (Problem Çözüm Odaklı, Fiyat/Kargo Hassas Ebeveyn, Detaycı Uyum Kontrolcüsü), kanal: Google Search / SEO / Pazar yeri araması
  - **Demo 3 – İhtiyaç Ürünü:**
    - Ürün: Kapı Kolu Seti, 350TL
    - Kategori: Ev & Yaşam
    - Motivasyon: `ihtiyac`
    - Özellikler: Ölçü: 8cm delik aralığı, malzeme: paslanmaz çelik, kapı tipi: iç kapı
    - Beklenen Çıktı: overallScore ~51, marketBreadthScore ~36, intentConversionScore ~76, kanal: SEO / Google Search
- [ ] Sunum akışı: Problem → Çözüm → Trend ürün demo → Niş ürün demo → Mimari → Sonuç.

---

## 🚫 Yapmaman Gerekenler
- `frontend/` ve `backend/app/api/` klasörlerine dokunma.
- API response formatını tek başına değiştirme (Kişi 2 ile konuşulur).
- 20 farklı kategori ekleyip MVP'yi şişirme. İlk 5 kategori yeterli: mont, telefon, şapka, ev_yasam, yedek_parca.
- Promptları çok uzun ve yavaş hale getirme (hackathon'da hızlı response kritik).
- `main` branch'e direkt push atma. Branch'lerin:
  - `feature/persona-data`
  - `feature/category-rules`
  - `feature/ai-insight-service`
  - `feature/docs-demo-script`

---

## 🔧 Vibe-Coding Prompt (Asistanına Yapıştır)

```
Sen bir e-ticaret veri analisti ve AI prompt mühendisisin. Şu anda BTK'26 Hackathon için "PazarLab AI" projesinin AI & Veri sorumlusu olarak çalışıyorsun.

Proje yapısı:
- Python (FastAPI servisi içinde), JSON veri dosyaları, Markdown dokümantasyon.
- Ana dizinler: backend/app/data/, backend/app/services/, docs/
- Backend FastAPI localhost:8000'de çalışıyor.

Görevlerin:
1. personas.json: 8-10 persona tipi, toplam 500 sentetik bot. Her botun davranış parametreleri (0-1 arası) olsun.
   - YENİ: Motivasyona göre persona vurguları ekle (problem_cozme için "Problem Çözüm Odaklı", yedek_parca için "Detaycı Uyum Kontrolcüsü")
2. category_rules.json: Telefon, mont, şapka, ev_yasam, yedek_parca kategorileri için form alanları, normalizasyon kuralları ve ağırlıklar.
   - YENİ: Her kategori için 3 farklı motivasyon ağırlığı (stil_begeni, problem_cozme, ihtiyac)
3. ai_insight_service.py: Simülasyon özetini alıp AI veya fallback ile yorumlayan servis.
   - YENİ: Prompta purchaseMotivation, marketBreadthScore, intentConversionScore ekle.
   - YENİ: AI ürünü "trend/stil/ihtiyaç/problem çözüm/hediye" olarak sınıflandırsın.
   - YENİ: Kanal önerisi döndürsün (sosyal medya vs SEO vs pazar yeri araması)
4. Fallback metinler: AI API çalışmazsa weaknessSignals + purchaseMotivation'a göre hazır Türkçe metinler döndür.
   - YENİ: Motivasyon bazlı hazır summary ve channelRecommendation metinleri.
5. Dokümantasyon: README.md, api-contract.md, demo-script.md.
   - YENİ: Demo senaryosuna niş ürün (bebek arabası ayağı, kapı kolu) ekle.

Kurallar:
- Frontend'e ve backend API endpointlerine dokunma.
- API formatı sabit, onu değiştirme.
- AI her botu tek tek konuşturmamalı. Simülasyon sonucu özetini yorumlamalı.
- Fallback mutlaka olsun, demo sırasında sistem çökmemeli.
- Türkçe içerik üret, teknik değişken adları İngilizce olsun.
```

---

*Hazırlayan: PazarLab AI Ekibi | BTK'26 Hackathon*
