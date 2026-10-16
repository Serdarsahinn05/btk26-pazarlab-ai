# API Sözleşmesi

- **Taban URL:** `http://localhost:8000`. Frontend bu adresi `NEXT_PUBLIC_API_URL` değişkeninden okur.
- **İçerik tipi:** `application/json`.
- **Alan adları:** camelCase (Pydantic alias). Kaynak modeller `backend/app/models/` altında.

## Endpoint'ler

| Method | Yol | İstek | Yanıt |
|---|---|---|---|
| GET | `/api/health` | – | `{ "status": "ok" }` |
| POST | `/api/analyze-input` | `SimulationRequest` | `InputAnalysisResponse` |
| POST | `/api/read-product-link` | `{ "url": string }` (8–2048 karakter) | `ProductLinkReadResponse` |
| POST | `/api/simulate` | `SimulationRequest` | `SimulationResponse` |

**Hatalar:**
- `422`: Pydantic doğrulama hatası.
- `400`: `/read-product-link` linki okuyamadı.

Planlanan değişiklikler (bkz. [SECURITY_AUDIT.md](SECURITY_AUDIT.md)): `429` (rate limit), tek tip hata gövdesi `{ "detail": string, "requestId": string }`, alanlarda üst sınırlar.

---

## SimulationRequest

| Alan | Tip | Kural |
|---|---|---|
| `category` | string | `tisort, pantolon, mont, elbise, etek, telefon, laptop, kulaklik, tablet, akilli_saat`. Bilinmeyen değer şu an `tisort` kabul ediliyor. |
| `purchaseMotivation` | enum | `stil_begeni, ihtiyac, problem_cozme, yedek_parca_tamir, hediye, trend, profesyonel_kullanim` |
| `productName` | string | ≥ 4 karakter |
| `productUrl` | string? | |
| `price` | number | > 0 |
| `description` | string | ≥ 40 karakter |
| `targetAudience` | `{ ageRange, gender, incomeLevel }` | string'ler |
| `features` | object | Kategoriye özel isteğe bağlı alanlar (`fabric`, `ram`, `storage`, `screenSize` …; tam liste `ProductFeatures`'ta) |
| `commerce` | `{ shippingDays: 0–60, returnAvailable: bool, warranty: bool, warrantyMonths?: 0–120 }` | |
| `images` | string[] | URL veya data URL |
| `inputAnalysis` | `InputAnalysisResponse?` | `/analyze-input` sonucu (şu an sunucu bunu yeniden hesaplıyor) |

## InputAnalysisResponse

| Alan | Tip |
|---|---|
| `aiUsed` | bool |
| `shouldWarn` | bool |
| `confidence` | 0–1 |
| `warnings`, `suggestions` | string[] |
| `suspectedCategory`, `correctedProductName` | string? |
| `signals` | `{ plausibility, categoryFit, brandTrust, descriptionCompleteness, specCompleteness, qualitySignal, visualAppealSignal, targetFitSignal }`; her biri 0–1 |

## ProductLinkReadResponse

`url`, `title?`, `description?`, `price?`, `original_price?`, `currency?`, `image?`, `images[]`, `brand?`, `category?`, `features{}`, `availability?`, `sku?`, `mpn?`, `gtin?`, `variants[]`, `source`, `warnings[]`.

`variants[]` öğeleri şu alanları taşır: `name`, `color`, `size`, `material`, `price`, `currency`, `availability`, `sku`.

> Not: Bu yanıt snake_case kullanıyor (`original_price`). Diğer yanıtlar camelCase.

## SimulationResponse

| Alan | Tip | Açıklama |
|---|---|---|
| `overallScore` | int 0–100 | Botların ortalama satın alma olasılığı × 100 |
| `marketBreadthScore` | int 0–100 | Kategori ve motivasyona göre pazar genişliği |
| `intentConversionScore` | int 0–100 | Niyetli alıcı dönüşümü |
| `problemSolutionFit` | int 0–100 | Problem-çözüm uyumu |
| `simulatedConsumers` | int | Toplam bot sayısı (500) |
| `estimatedBuyers` | int | "Aldı" kararı veren bot sayısı |
| `decisionDistribution` | `{ buy, watch, skip }` | Bot sayıları; toplamı `simulatedConsumers` |
| `topPersonas` | `PersonaResult[]` | En yüksek olasılıklı 3 persona |
| `allPersonas` | `PersonaResult[]` | 12 personanın tamamı, sıralı |
| `weaknesses` | string[] | Kullanıcıya gösterilen zayıflık metinleri |
| `weaknessSignals` | string[] | Makine okunur zayıflık kodları |
| `normalizedProduct` | object | 11 parametre, her biri 0–1: `priceFit, priceRisk, qualityScore, trendFit, brandTrust, descriptionCompleteness, visualAppeal, seasonFit, shippingReturnScore, targetAudienceFit, differentiationScore` |
| `aiInsights` | `AiInsights` | Ayrıntılar aşağıda ve [ai-output.md](ai-output.md) dosyasında |
| `debateLogs` | `{ name, text }[]` | Persona tartışması. `name` ≤ 50, `text` ≤ 500 karakter. |
| `benchmarkAnalysis` | string? | Markdown rakip/pazar analizi |
| `images` | string[] | İstekteki görseller (yankı) |
| `inputAnalysis` | `InputAnalysisResponse?` | |

### PersonaResult

| Alan | Tip |
|---|---|
| `name` | string |
| `purchaseProbability` | 0–1 |
| `reason`, `advice` | string |
| `rank` | int |
| `buyerCount`, `sampleSize` | int |
| `decision` | `buy` \| `watch` \| `skip` |
| `decisionLabel` | `ALDI` (≥ 0.55) \| `KARARSIZ` (≥ 0.42) \| `ALMADI` |
| `microFeedback` | string |
| `aiComment` | string? |
| `personalityType` | string? |
| `personalityTraits` | object |
| `aiRoleplayPrompt` | string? (**kaldırılacak**, bkz. S9) |

### AiInsights

`summary`, `productTypeInsight`, `salesRecipe[]`, `marketingAdvice`, `descriptionAdvice`, `pricingAdvice`, `seasonAdvice`, `channelRecommendation[]`, `improvedDescription`, `personaFeedback[{ name, feedback, action }]`.
