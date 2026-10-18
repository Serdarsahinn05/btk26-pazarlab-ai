# API Sözleşmesi

- **Taban URL:** `http://localhost:8000`. Frontend bu adresi `NEXT_PUBLIC_API_URL` değişkeninden okur.
- **İçerik tipi:** `application/json`.
- **Alan adları:** camelCase (Pydantic alias). Kaynak modeller `backend/app/models/` altında.

## Endpoint'ler

| Method | Yol | İstek | Yanıt |
|---|---|---|---|
| GET | `/api/health` | – | `{ status, ai: { configured, model, lastSuccessAt, lastErrorAt, lastError, cache: { entries, hits, misses }, dailyCallsPerIp }, research: { configured } }` (ağa çıkmaz; `model`, ilk AI çağrısına kadar `null` olabilir; `last*` bu process'teki son AI çağrısı, UTC ISO zaman; `lastError` yalnızca tür veya `HTTP 429` gibi durum kodu) |
| POST | `/api/analyze-input` | `SimulationRequest` | `InputAnalysisResponse` |
| POST | `/api/read-product-link` | `{ "url": string }` (8–2048 karakter) | `ProductLinkReadResponse` |
| POST | `/api/simulate` | `SimulationRequest` | `SimulationResponse` (+ `simulationId`, `engineVersion` = 2, `buyersRange { low, high, runs }` = alıcı sayısının 30 Monte Carlo turundaki %10–%90 aralığı; v1 motoruyla kaydedilmiş sonuçlarda bu iki alan yok); Faz 12c: `adoptionCurve[4]` (haftalık kümülatif alıcı: 1. hafta doğrudan, 2–4 arkadaş etkisi), `segments { age, gender, incomeLevel, cityType: [{ label, residents, buyRate }] }`, `representatives[5] { id, name, age, city, occupation, persona, story, buyProbability, decision, reason }` (kurgusal sakinler), `improvements[≤3] { key, label, deltaBuyers, deltaRevenue }`. `normalizedProduct.priceRisk` = kasabada fiyatı ödeme isteğinin üstünde kalan sakinlerin oranı, `priceFit` = 1 − priceRisk |
| POST | `/api/price-sweep` | `SimulationRequest` | `{ points: SweepPoint[9], bestRevenue, bestBuyers }`; SweepPoint = `{ factor, price, estimatedBuyers, buyRate, overallScore, revenue }` |
| POST | `/api/compare` | `{ base: SimulationRequest, variant: SimulationRequest }` | `{ base: CoreMetrics, variant: CoreMetrics }`; CoreMetrics = `{ price, overallScore, estimatedBuyers, simulatedConsumers, decisionDistribution, marketBreadthScore, intentConversionScore, problemSolutionFit, topPersona, weaknesses }` |
| POST | `/api/simulate/stream` | `SimulationRequest` | SSE: `event: step` `{ step, label }` (input_analysis, research, benchmark, simulate, debate) … `event: result` `SimulationResponse` |
| POST | `/api/persona-chat` | `{ simulationId, persona, messages: [{ role: user\|persona, text ≤600 }] (1–12, son mesaj user) }` | SSE: `event: delta` `{ text }` … `event: done` (`{}`; AI yoksa veya günlük AI hakkı dolduysa persona simülasyon verisinden cevap verir ve `done` = `{ ruleBased: true, reason: quota\|unavailable }`) · hata: `event: error` `{ detail }` (AI cevabı yarıda kesilirse); kayıt yoksa 404, bilinmeyen persona 422 |
| GET | `/api/simulations/{id}` | – | `{ id, createdAt, productName, category, response: SimulationResponse, request: SimulationRequest | null, competitors: CompetitorInput[] }` (request görselsiz); bilinmeyen/süresi dolmuş → 404 |
| POST | `/api/competitor-choice` | `{ simulationId, competitors: CompetitorInput[1–3] }`; CompetitorInput = `{ name (4–120), price, url?, description?, features?, rating?, reviewCount?, shippingDays?, returnAvailable?, warranty? }` (boş alan = satıcının ürünüyle aynı) | `{ competitors, result }`; result = `{ options: [{ key: own\|c1…, name, price, share, low, high, residents, assumed[], equalQuality, reasons?: [{ key: price\|fit, label, detail?, share }] }], none: { share, low, high, residents }, personas: [{ persona, residents, shares: [own, rakipler…, none] }], bestChanges[≤3] { key, label, deltaBuyers, deltaShare, deltaRevenue }, simulatedConsumers, runs }`. AI yok, deterministik; rakipler kayda yazılır. Kayıt yok → 404, eski (request'siz) kayıt → 409 |
| GET | `/api/competitor-choice/{id}` | – | Kayıtlı rakipler ve payları yeniden hesaplanmış hâliyle `{ competitors, result }`; rakip yoksa `{ competitors: [], result: null }` |

**MCP:** `POST /mcp` (Streamable HTTP, JSON-RPC). Araçlar ve ayarlar: [mcp-connector.md](mcp-connector.md).

**Hatalar** (her yanıtta `X-Request-ID` başlığı vardır):

| Kod | Gövde | Ne zaman |
|---|---|---|
| 400 | `{ detail }` | `/read-product-link`: link herkese açık bir http/https sayfası değil |
| 411 / 413 | `{ detail, requestId }` | `Content-Length` yok / gövde 10 MB'tan büyük |
| 422 | `{ detail: [{ loc, msg, type }], requestId }` | Doğrulama hatası (girdi yansıtılmaz) |
| 429 | `{ detail }` + `Retry-After` | IP başına dakikalık limit (simulate 5, analyze 10, link 10) |
| 500 | `{ detail, requestId }` | Beklenmeyen hata (ayrıntı yalnızca sunucu logunda) |

---

## SimulationRequest

| Alan | Tip | Kural |
|---|---|---|
| `category` | enum | `tisort, pantolon, mont, elbise, etek, telefon, laptop, kulaklik, tablet, akilli_saat, ayakkabi, canta, kozmetik`; başka değer 422 (gruplar: `backend/app/models/category.py`) |
| `purchaseMotivation` | enum | `stil_begeni, ihtiyac, problem_cozme, yedek_parca_tamir, hediye, trend, profesyonel_kullanim` |
| `productName` | string | 4–120 karakter |
| `productUrl` | string? | ≤ 2048 karakter |
| `price` | number | 0 < fiyat ≤ 10.000.000, `inf/nan` yok |
| `description` | string | 40–4000 karakter |
| `targetAudience` | `{ ageRange, gender, incomeLevel }` | her biri ≤ 40 karakter |
| `features` | object | Kategoriye özel isteğe bağlı alanlar (`fabric`, `ram`, `storage`, `screenSize` …; tam liste `ProductFeatures`'ta). Metin ≤ 200 karakter, liste ≤ 20 öğe; bilinmeyen anahtarlar atılır |
| `commerce` | `{ shippingDays: 0–60, returnAvailable: bool, warranty: bool, warrantyMonths?: 0–120 }` | |
| `images` | string[] | En fazla 6; URL veya data URL, öğe başına ≤ 1,5 M karakter |
| `inputAnalysis` | `InputAnalysisResponse?` | `/analyze-input` sonucu; gönderilirse sunucu yeniden hesaplamaz |

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
| `simulationId` | string? | Paylaşım kimliği (12 karakter). Kayıt yapılamadıysa `null` |

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

### AiInsights

`summary`, `productTypeInsight`, `salesRecipe[]`, `marketingAdvice`, `descriptionAdvice`, `pricingAdvice`, `seasonAdvice`, `channelRecommendation[]`, `improvedDescription`, `personaFeedback[{ name, feedback, action }]`, `aiGenerated` (`false` = AI kullanılamadı, metinler kural tabanlı), `aiFallbackReason` (`quota` = bu ziyaretçinin günlük AI hakkı doldu, `unavailable` = AI erişilemedi; AI yazdıysa `null`).
