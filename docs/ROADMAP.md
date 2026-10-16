# Yol Haritası

- **Repo:** [Serdarsahinn05/btk26-pazarlab-ai](https://github.com/Serdarsahinn05/btk26-pazarlab-ai). `upstream` = OsmanerdemDutar/btk26-pazarlab-ai, salt okunur.
- **Akış:** Her faz kendi dalında yapılır, PR veya merge ile `main`'e girer.
- **Sıradaki iş:** bkz. [Şu an neredeyiz](#şu-an-neredeyiz). Her fazdan sonra bu dosya, [IMPROVEMENTS.md](IMPROVEMENTS.md) ve gerekiyorsa [SECURITY_AUDIT.md](SECURITY_AUDIT.md) / [../DESIGN.md](../DESIGN.md) güncellenir.
- **Kaynaklar:** Ayrıntılar [SECURITY_AUDIT.md](SECURITY_AUDIT.md), [IMPROVEMENTS.md](IMPROVEMENTS.md) ve [../DESIGN.md](../DESIGN.md) dosyalarında.

## Genel bakış

| Faz | Dal | Kapsam | Efor | Durum |
|---|---|---|---|---|
| 0 | – | Repo senkronizasyonu | 15 dk | ✅ |
| 1 | `chore/docs-roadmap` | Dokümanlar, repo temizliği | 0,5 gün | ✅ |
| 2 | `fix/security-hardening` | S1–S13 | 1–1,5 gün | ✅ |
| 3 | `fix/core-bugs` | B1–B7, F1–F7, temel testler | 1 gün | ✅ |
| 4 | `feat/redesign-canli-pazar` | DESIGN.md uygulaması ("Canlı pazar yeri"), F8–F14 | 2–3 gün | ✅ |
| 5a | `feat/history-share` | Geçmiş, paylaşım, export | 1 gün | ✅ |
| 5b | `feat/price-sweep-ab` | Fiyat eğrisi, A/B karşılaştırma | 1 gün | ✅ |
| 5c | `feat/persona-chat-sse` | Persona sohbeti, canlı ilerleme | 1,5 gün | ✅ |
| 5d | `ci/pipeline` | CI, bağımlılık taraması | 0,5 gün | ✅ |
| 6 | `chore/next16-upgrade` | Next 14 → 16 (S14) | 0,5–1 gün | ✅ |
| 7 | `chore/tailwind4` | Tailwind 3 → 4 (S15) | 0,5 gün | ✅ |
| 8a | `feat/persona-chat-history` | F19: sohbet geçmişi | 0,25 gün | ✅ |
| 8b | `docs/deployment` | F20: dağıtım dokümanı | 0,25 gün | ✅ |
| 8c | `feat/observability` | B.8: JSON log, sağlık bilgisi | 0,25 gün | ✅ |
| 8d | `feat/categories-more` | B.9: ayakkabı, çanta, kozmetik | 0,5 gün | ✅ |
| 8e | `chore/language-cleanup` | B.10: dil tutarlılığı | 0,25 gün | ✅ |
| 9 | `feat/llm-providers` | B.12: Gemini + Claude + GPT, yedekli zincir | 1 gün | ⏸ API anahtarı yok, bekliyor |
| 10a | `feat/ai-budget` | AI önbelleği, IP başına günlük AI kotası | 0,5 gün | ✅ |
| 10b | `feat/offline-persona-chat` | AI'sız (kural tabanlı) persona sohbeti | 0,5 gün | ✅ |
| 11 | `feat/mcp-connector` | PazarLab MCP sunucusu (Claude connector) | 1–1,5 gün | ⬜ |
| 11b | `spike/claude-artifact` | Claude-powered artifact araştırması | 0,5 gün | ⬜ |
| 12 | `feat/engine-v2-town` | Motor v2 + AI kasabası + Big Five | 3–4 gün | ⬜ |
| 13 | `feat/product-entry-v2` | Ürün ekleme ekranı: link öncelikli akış + yeni yerleşim | 2 gün | ⬜ |
| 14 | `feat/link-reader-v2` | Site okuyucuları, kayıtlı HTML testleri, "HTML ver" ucu | 2 gün | ⬜ |
| 15 | `feat/layout-pass` | Diğer ekranların yerleşimi (audit → critique → ponytail-review) | 1,5 gün | ⬜ |
| 16 | `feat/insight-features` | İlan yeniden yazma, rakip kartı, segment grafiği, görsel analizi | 2–3 gün | ⬜ |
| 17 | `chore/cleanup-e2e` | Ölü kod temizliği, Playwright testleri CI'da | 1 gün | ⬜ |
| 18 | `feat/browser-extension` | "PazarLab'a gönder" tarayıcı eklentisi | 1–2 gün | ⬜ |
| 19 | `feat/bring-your-population` | Kendi nüfusunu yükle + kalibrasyon (hesap sistemi, KVKK) | 3+ gün | ⬜ |

Sıralamanın gerekçesi: Önce güvenlik geliyor, çünkü açık CORS ve SSRF ile kota ve iç ağ riski demo sırasında bile var. Sonra B1 geliyor; AI katmanı çalışmıyorsa tasarımın gösterecek içeriği olmaz. Tasarım bunların üzerine kurulur.

---

## Faz 0: Senkronizasyon ✅
- [x] Yarım kalan merge iptal edildi. Önceki durum `backup/pre-sync` dalında ve patch olarak yedeklendi.
- [x] `origin` artık Serdarsahinn05 reposunu, `upstream` eski repoyu gösteriyor.
- [x] Yerel `main` = `origin/main` (`4f3441e8`).

## Faz 1: Dokümantasyon ✅
- [x] `DESIGN.md`: tasarım otoritesi.
- [x] `docs/SECURITY_AUDIT.md`, `docs/IMPROVEMENTS.md`, `docs/ROADMAP.md`.
- [x] `docs/api-contract.md`: gerçek HTTP sözleşmesine göre yeniden yazıldı.
- [x] README düzeltmeleri: bot sayısı, kişisel dosya yolu, venv adı, ortam değişkenleri, doküman linkleri.
- [x] Temizlik: `frontend/build_error.txt` ve kopya `pp_icons/` silindi; `.gitignore` artık `.env.*` kalıbını da kapsıyor.

## Faz 2: Güvenlik sertleştirmesi ✅
Kabul kriteri: SECURITY_AUDIT.md'deki doğrulama listesi geçer. Sonuç: 8 maddeden 6'sı otomatik testle doğrulandı. Kalan 2 madde (yük altında health yanıt süresi, Docker'da root olmayan kullanıcı) ölçülemedi.

- [x] **S2** CORS allowlist: `CORS_ALLOWED_ORIGINS`, credentials kapalı. (`main.py`)
- [x] **S11a** `load_dotenv(override=False)`.
- [x] **S7** Handler'lar `def` oldu. (`api/*.py`)
- [x] **S4** Pydantic sınırları, `Literal` kategori, gövde boyutu kontrolü. (`models/product.py`, `security.py`)
- [x] **S1** SSRF: IP pinleme (urllib3 kancası), port kısıtı, redirect'ler elle izlenip doğrulanıyor, tek tip hata, toplam süre ≤ 15 sn. (`safe_http.py`)
- [x] **S3** Rate limit (kendi `RateLimit` sınıfı, `slowapi` yerine), `maxOutputTokens`, LLM timeout, model zinciri ≤ 2.
- [x] **S5** Prompt'lar system mesajı + `<data>` JSON yapısına geçti, alanlar kırpılıyor. (`prompt_safety.py`)
- [x] **S6** Genel hata mesajları + `X-Request-ID`.
- [x] **S8** `x-goog-api-key` başlığı, anahtar logu kaldırıldı.
- [x] **S9** `aiRoleplayPrompt` response'tan çıkarıldı, log injection düzeltildi.
- [x] **S10** Prod'da `/docs` kapalı.
- [x] **S11b** `USER`, `HEALTHCHECK`, Next `standalone` + güvenlik başlıkları, pinli bağımlılıklar, `langchain` kaldırıldı, compose sertleştirildi.
- [x] **S12** (yeni) 422 yanıtları girdiyi yansıtmıyor; `inf` kaynaklı 500 düzeltildi.
- [x] **S13** (yeni) Link okuyucu ve form API sınırlarına uyduruldu; yüklenen görseller tarayıcıda küçültülüyor.
- [x] `.env.example` güncellendi. `requirements-dev.txt` ve `pytest.ini` eklendi.
- [x] `backend/tests/test_security.py`: 32 test geçiyor.
- [ ] Docker imajlarının build'i ve `whoami` kontrolü. Daemon kapalı olduğu için yapılamadı; `docker compose up --build` ile elle denenmeli.

Ölü kod temizliğinden iki parça bu fazda yapıldı, çünkü değişen kodla çakışıyordu: `MOCK_SIMULATION_RESPONSE` ve `debate_node` v1.

## Faz 3: Çekirdek hatalar ✅
Kabul kriteri: Gerçek bir anahtarla `/api/simulate` yanıtında `aiInsights` şablon değil, gerçek LLM çıktısı olmalı; backend kapalıyken UI görünür bir hata göstermeli.
Sonuç: Gerçek anahtarla yapılan denemede `aiInsights.aiGenerated=true`, `inputAnalysis.aiUsed=true` döndü ve tartışma gerçek LLM metni içeriyordu (61 sn). Bu fazdan önce üçü de sessizce şablona düşüyordu.

- [x] **B1** `app/services/llm_client.py`: tek Gemini istemcisi. Graph, AI yorumları, girdi analizi ve link okuyucu bunu kullanıyor. `langchain-google-genai` kaldırıldı (graph orkestrasyonu için yalnızca `langgraph` kaldı). Model `GEMINI_MODEL` değişkeninden ya da otomatik keşifle seçiliyor (kararlı > preview, flash > lite > pro, yeniden eskiye). 429 ve 5xx alan model 2 dk soğumaya alınıyor. Zaman aşımında başka modele geçilmiyor. Çıktı sınırı 8192 token.
- [x] **B2** İstemciden gelen `inputAnalysis` yeniden hesaplanmıyor.
- [x] **B3** `Category` `Literal`'i backend'de, `CATEGORIES` sabiti frontend'de. Link okuyucunun yalnızca bu değerleri döndürdüğü testle doğrulanıyor.
- [x] **B4–B6** Graph bir kez derleniyor. Çift log doğrulaması, `build_ai_insights`, `scoring_utils` içindeki kullanılmayan fonksiyonlar, `trend_mock_data.json`, iki ayrı model yöneticisi ve `AIQuotaError` silindi.
- [ ] **B8** Bozuk `backend/venv`: dokunulmadı (kullanıcının yerel ortamı). Silip `py -3.11 -m venv venv` ile yeniden kurulmalı.
- [x] **B9** Python sürümü README'de belirtildi (Faz 2).
- [x] **F1** `StatusToast` + "Tekrar dene"; `apiErrorMessage()` 429/422/413/ağ/timeout durumlarını Türkçe mesaja çeviriyor. Girdi analizi başarısız olursa simülasyon devam ediyor. axios timeout 180 sn. AI kullanılamadıysa bilgi toast'u çıkıyor.
- [x] **F1b** (yeni) Simülasyon hata verdiğinde veya uyarı iptal edildiğinde formdaki **tüm girdi siliniyordu**; form artık yükleme sırasında unmount edilmiyor, gizleniyor.
- [x] **F2–F3** Tailwind v4 sınıfları v3'e çevrildi (odak halkaları artık görünüyor). `rgba(var())` 8 yerde düzeltildi. `@tailwindcss/typography` eklendi. `font-sans` ve `font-mono` artık `next/font` değişkenlerini kullanıyor.
- [x] **F4** `body`'deki `overflow-hidden h-screen` kaldırıldı, dashboard'daki çift padding giderildi, mobil menü link tıklanınca kapanıyor, ikon düğmelerine `aria-label` eklendi.
- [x] **F5** StatusBar `/api/health` sonucunu gösteriyor (API, model, rakip araması). `/api/health` ağa çıkmadan önbellekten cevap veriyor. Sabit kategori sayısı kaldırıldı.
- [x] **F6–F7** Persona renkleri `personas.json` sırasına göre 12 renkle eşleniyor. Tiplere `weaknessSignals`, `aiGenerated`, `HealthStatus` ve `Category` eklendi; `aiRoleplayPrompt` kaldırıldı.
- [x] **F7b** (yeni) Link okuyucu fiyatı virgüllü yazdığı için `type=number` alanı boş kalıyordu; düzeltildi. Formdaki alanlara backend sınırları kadar `maxLength` eklendi ve linkten gelen uzun başlıklar kırpılıyor.
- [x] **B7** `tests/test_core.py`: deterministiklik, toplamlar, fiyat monotonluğu, fallback işareti, model sıralaması, 429'da yedek modele geçiş, health'in ağa çıkmaması, mock'lu graph akışı ve kategori sözleşmesi. Toplam 42 test.
- [x] `prefers-reduced-motion`: animasyonlar kısalıyor, confetti çalışmıyor.

## Faz 4: Yeniden tasarım — "Canlı pazar yeri" ✅
Kabul kriteri: DESIGN.md'deki tüm kalıplar uygulanmış; bileşenlerde ham renk sınıfı kalmamış (`rg "zinc-|violet-|text-white|rgba\(" frontend/components frontend/app` boş döner, `ui/` hariç); her iki tema ve 375 px genişlik kontrol edilmiş; `impeccable audit` ardından `ponytail-review` çalıştırılmış.

0. [x] **Yerleşim:** DESIGN.md §9'daki yeni dashboard düzeni (rapor akışı, yan panel kaldırılır, tek kaydırma alanı, iki sütunlu form). Detaylar IMPROVEMENTS.md F11'de.
1. [x] **Token'lar:** `globals.css` (`:root` + `.dark`), `tailwind.config.ts` (renkler, `fontFamily`), `layout.tsx` (Fraunces, `defaultTheme="system"`), defter zemini. Neon, glass ve glow sınıfları silinir.
2. [x] **Kabuk:** `LayoutShell`, `Sidebar` ve `StatusBar` sade bir üst bara dönüşür: marka, sekmeli nav, tema düğmesi, gerçek API durumu. Mobilde sekmeler yatay kaydırılabilir.
3. [x] **Skor bileşenleri:** `RingChart` ve `SegmentRing` (saf SVG, ek kütüphane yok). `OverallScoreCard` ile `DecisionDistributionChart` birleşir. Persona halka kartları tıklanınca tartışmaya gider (flash efekti). Normalize skorlar ince barlarla gösterilir.
4. [x] **İçerik kartları:** Kanal önerileri, zayıflıklar ve benchmark renkli başlıklı karta; tartışma mesajları sol kenarlı satır kalıbına; `AnalysisWarning` not kutusuna veya erişilebilir dialog'a geçer.
5. [x] **Form:** `ProductForm` input stilleri, Türkçe etiketler, `aria`, klavyeyle erişilebilir yükleme alanı.
6. [x] **Landing:** Fraunces hero ve italik alt satır, mono sayaçlar (500 · 12 · 10), örnek segmentli halka, numaralı adımlar.
7. [x] **Hareket ve erişilebilirlik:** reduced-motion, odak halkaları, kontrast kontrolü.
8. [x] **Temizlik (F9–F10):** kullanılmayan bileşen ve bağımlılıklar silinir, `output: 'standalone'`.

**Faz 4 sonucu**
- Stil, karşılaştırma sayfasında 6 yön arasından kullanıcı tarafından seçildi: **E. Canlı pazar yeri**. Renk iterasyonları DESIGN.md §10'da. Token'lar DESIGN.md §2'de ve `globals.css`'te.
- Fontlar: Bricolage Grotesque (başlık, rakam), Nunito (gövde), Caveat (el yazısı not); `next/font` ile.
- Kabuk: Sidebar ve StatusBar kaldırıldı. Yerlerine sekmeli `TopBar`, gerçek `/api/health` gösteren `ApiStatusDot` ve `ThemeToggle` geldi. İçerik 1180 px okuma sütununda, tek sayfa kaydırması.
- Sonuç ekranı (§9.3): karar kartı (`SegmentRing` + el yazısı not), "Ne yapmalı?" (özet, 3 aksiyon, kritik risk, yazdır/PDF), 4 KPI, 12 persona halka kartı (tıklanınca tartışmada o persona), tırtıklı başlıklı zayıflık ve kanal kartları, 11 parametre barı, kopyalanabilir iyileştirilmiş açıklama (Markdown).
- Form (§9.2): 4 numaralı adım, iki sütun, yapışkan gönder çubuğu, klavyeyle erişilebilir yükleme, Türkçe etiketler.
- Erişilebilirlik: uyarı penceresi gerçek dialog (Esc, odak tuzağı, odak geri dönüşü); ikon düğmelerinde `aria-label`; küçük renkli metinde koyu tonlar; reduced-motion.
- Silinenler: OverallScoreCard, DecisionDistributionChart, NormalizedScoresPanel, ChannelRecommendation, WeaknessList, TopPersonaCards, ProductTypeInsight, Sidebar, StatusBar.
- Doğrulama: `tsc` ve `next build` temiz. Kabul taraması (ham palet renkleri, `rgba`, `zinc/violet/text-white`) boş; tek istisna confetti'nin canvas renkleri. Headless Chrome ile açık/koyu landing, form, sonuç ve personalar görüntülendi. 375 px'de landing, form ve sonuç için yatay taşma 0.
- Yapılmadı: `impeccable audit` → `ponytail-review` denetimi (ayrı bir oturumda önerilir). Gerçek cihazda ekran okuyucu testi yapılmadı.

## Faz 5: Yeni özellikler
- [x] **5a** Geçmiş ve paylaşım:
  - Backend: `history_store.py` (stdlib sqlite3). `/api/simulate` sonucu kaydeder ve `simulationId` döner; `GET /api/simulations/{id}` sonucu getirir. Listeleme uç noktası yok (giriş sistemi olmadığı için sonuçlar yalnızca linki bilen tarafından açılır). 12 karakterlik rastgele kimlik; base64 görseller kaydedilmez; 90 gün / 5000 satır saklama; kayıt hatası simülasyonu bozmaz; `HISTORY_ENABLED=false` ile kapatılır. Docker'da `pazarlab-data` volume'u.
  - Frontend: paylaşım linki `/dashboard?r=<id>` (ayrı sayfa yerine dashboard; sekmeler ve persona linkleri `r`'yi koruyor). Tarayıcı geçmişi (`lib/history.ts`, 20 kayıt, tam sonuçla birlikte; kota dolarsa en eskiler düşer), "Son simülasyonlar" kartı (aç / sil / yedek indir / yedekten yükle), "Linki kopyala" ve "Markdown" rapor indirme (`lib/report.ts`), mevcut Yazdır/PDF.
  - Doğrulama: `tests/test_history.py` (5 test, toplam 50). Puppeteer uçtan uca 11/11: URL'de kimlik, yenilemede kalıcılık, sekme değişiminde korunma, boş tarayıcıda sunucudan açılma, bilinmeyen kimlikte hata, geçmiş listesi.
- [x] **5b** Fiyat eğrisi ve A/B:
  - Çekirdek: `simulate_core()` (LLM'siz, deterministik); `run_simulation` bunun üstüne AI yorumlarını ekliyor. Rastgelelik tohumu artık fiyatı (ve görselleri, girdi analizini) içermiyor: aynı sentetik kalabalık her fiyatı görüyor.
  - `POST /api/price-sweep` (fiyatın %60–140'ı, 9 nokta; alıcı, skor, ciro; en çok ciro / alıcı noktası) ve `POST /api/compare` (A ve B için çekirdek metrikler). İkisi de LLM çağırmıyor, IP başına 20/dk.
  - Geçmiş kaydı artık isteği de (görseller hariç) saklıyor; paylaşılan linkte de araçlar çalışıyor (eski kayıtlar için şema geçişi).
  - Frontend: sonuç ekranında "Ne olur?" bölümü. Alıcı sayısı çizgi grafiği ("şu an" işaretli, hover ipucu) + ayrı ciro çubukları (iki eksenli grafik yerine iki grafik) + tablo görünümü. A/B formu: ad, fiyat, kargo, açıklama, iade, garanti; iki mini segment halka ve fark tablosu. Metin değişirse iki taraf da aynı kural tabanlı analizle karşılaştırılıyor.
  - Doğrulama: `tests/test_whatif.py` (6 test, toplam 56; LLM çağrılırsa test düşer). Puppeteer: eğrinin "şu an" noktası ana sonuçla aynı (317 = 317), tarama tek istek, A/B sonucu görünüyor, 375 px taşma yok.
- [x] **5c** Canlı ilerleme ve persona sohbeti:
  - `iter_agentic_simulation()`: LangGraph `stream(stream_mode="updates")` ile her düğüm bitince adım üretiyor; `run_agentic_simulation` bunun üstüne kurulu.
  - `POST /api/simulate/stream` (SSE): `step` olayları + son `result`; sonuç geçmişe kaydediliyor. Frontend `fetch` + stream okuyucu (`lib/sse.ts`); akış hiç olay gelmeden koparsa normal `/api/simulate`'e düşüyor. İlerleme ekranı artık tahmini süre değil gerçek adım gösteriyor.
  - `POST /api/persona-chat` (SSE): ürün ve persona bağlamı **sunucudaki kayıttan** (`simulationId`) alınıyor, istemciden değil. Persona karakteri `personas.json`'dan, simülasyon sonucu kayıttan. En fazla 12 tur, mesaj başına 600 karakter, 1024 token, IP başına 15/dk. AI yoksa `error` olayı. `llm_client.stream_chat()` Gemini `streamGenerateContent?alt=sse` kullanıyor; parça sınırlarındaki boşluklar korunuyor, "thought" parçaları atlanıyor.
  - Frontend: Tartışma sekmesinde "Personaya sor" paneli (persona seçici, hazır sorular, akışlı cevap, durdur düğmesi). Yalnızca tarayıcıda saklanan sonuçlarda açıklama gösteriliyor.
  - Doğrulama: `tests/test_stream.py` (11 test, toplam 67). Gerçek Gemini ile Puppeteer: ilerleme sonuçtan önce birden çok adımda ilerledi, sonuç akıştan geldi ve kaydedildi, persona cevabı parça parça geldi (375 karakter, karakter içinde).
- [x] **5d** CI ve bağımlılık taraması:
  - `.github/workflows/ci.yml`: `main`'e push ve her PR'da iki iş. Backend (Python 3.11, Dockerfile ile aynı): `ruff check`, `pytest`, `pip-audit`. Frontend (Node 20): `npm ci`, `lint`, `tsc --noEmit`, `build`, `npm audit --omit=dev`.
  - `npm audit` adımı Faz 5d'de bloklamıyordu (S14); Faz 6'dan beri bloklayıcı.
  - `.github/dependabot.yml`: pip ve npm haftalık (npm minor/patch tek PR'da gruplu), GitHub Actions aylık.
  - `pip-audit` bulguları için güncellendi: `fastapi` 0.115 → 0.143, `starlette` 1.8 (açıkça pinli), `uvicorn` 0.54, `pydantic` 2.14, `python-dotenv` 1.2. Dev'e `ruff` ve `pip-audit` eklendi.
  - Frontend: `shadcn` CLI'ı runtime bağımlılığından çıkarıldı; `@types/canvas-confetti` ve `tailwindcss-animate` devDependencies'e taşındı.
  - Ruff temizliği: `backend/ruff.toml` (`main.py`'de E402 kasıtlı: `.env` importlardan önce yükleniyor), kullanılmayan importlar, 16 tek satırlık `if x: ...` bölündü.
  - Doğrulama (yerelde): ruff temiz, pytest 67/67, `pip-audit` açık yok, lint/tsc/build temiz. `npm audit`: 1 kritik (next), 1 yüksek (next'in postcss'i). Workflow GitHub'da henüz koşmadı.

## Faz 6: Next 16 yükseltmesi ✅
- [x] `next` 14.2.35 → 16.4.2, `eslint-config-next` 16.4.2, React 18 → 19.3 (`react`, `react-dom`, tipleri). Next 16 React 18.2'yi de kabul ediyor ama App Router içeride React 19 kullanıyor; sürümleri eşitlemek için 19'a geçildi. Kodda async `params` veya kaldırılan API kullanımı yoktu.
- [x] `next lint` Next 16'da kaldırıldı: `eslint .` + `eslint.config.mjs` (flat config, ESLint 9). `.eslintrc.json` silindi. `next build` `tsconfig.json`'ı kendisi güncelledi (`jsx: react-jsx`, `target: ES2017`).
- [x] Yeni `react-hooks` v7 kuralları (React Compiler) 12 hata buldu. Kural kapatmak yerine düzeltildi:
  - `ui/ring.tsx`: render sırasında `offset` yeniden atanıyordu; segment başlangıçları önceden hesaplanıyor.
  - `WhatIf` ve `DebateLogs`: effect içinde senkron state sıfırlama yerine, state'in hangi girdiye ait olduğu etiketleniyor ve render'da türetiliyor.
  - `ThemeToggle`: `useMounted()`; `DebateLogs`: `useMediaQuery()` (yeni `lib/hooks.ts`, `useSyncExternalStore`).
  - `tailwind.config.ts`: `require` yerine `import`; `types` içinde `any` kaldırıldı.
  - İki gerekçeli istisna (`eslint-disable` + yorum): dashboard'un `?r=` URL senkronu ve geçmişin hydration sonrası localStorage'dan okunması.
  - `Date.now` için compiler yanlış alarm veriyordu (çağrı async handler'da); modül seviyesinde `now()` yardımcısı.
- [x] CI'daki `continue-on-error` kaldırıldı; `npm audit --omit=dev` bloklayıcı.
- Doğrulama: lint, `tsc`, `next build` (standalone) temiz. `npm audit --omit=dev`: **0 açık**. Puppeteer + gerçek Gemini ile production build'de 10/10: landing, tema değişimi, halka ofsetleri, fiyat eğrisi, tartışmanın adım adım açılması ve "Tümünü göster", reduced-motion'da tek seferde, "Son simülasyonlar" kartı, 375 px taşma yok, konsolda hata/hydration uyarısı yok.
- Yapılmadı: Docker imajı build edilmedi (`node:20-slim` Next 16'nın istediği ≥ 20.9'u karşılıyor). Dev araçlarındaki açıklar: S15.

## Faz 7: Tailwind 4 ✅
- [x] `@tailwindcss/upgrade` ile geçiş: `tailwind.config.ts` silindi, token eşlemesi `globals.css` içinde `@theme`, PostCSS `@tailwindcss/postcss` (autoprefixer gereksiz), 14 bileşende sınıf yeniden adlandırmaları (`!px-3` → `px-3!`, `outline-none` → `outline-hidden`, `backdrop-blur-sm` → `-xs`, `w-[15rem]` → `w-60`…).
- [x] Aracın bıraktığı/kaçırdığı sorunlar elle düzeltildi:
  - Eklentiler taşınmamıştı: `@plugin "@tailwindcss/typography"`; `tailwindcss-animate` yerine `tw-animate-css` (Select açılış animasyonları).
  - `--font-sans: var(--font-sans)` döngüsü ve `@theme` değişkenlerinin `:root`'ta çözülmesi yüzünden **tüm fontlar yedek fonta düşüyordu**. next/font değişkenleri `--font-nunito/-bricolage/-caveat` oldu, blok `@theme inline` (değişken, kullanıldığı elementte çözülüyor; v3 davranışı).
  - Aracın eklediği `gray-200` kenarlık uyumluluk bloğu kaldırıldı (`* { border-border }` zaten var).
  - `space-y` davranış değişikliği (margin-top → son çocuk hariç margin-bottom): dashboard'un gizli formu ve Radix Select'in gizli `<select>`'i fazladan 32/6 px boşluk açıyordu; `sr-only` legend'lı kartlarda başlık üstü 16 px kayboluyordu; inline etiketlerde aralık hiç uygulanmıyordu. `flex flex-col gap-*`, `mt-4` ve `leading-6` ile v3 görünümü korundu.
  - `text-sm` birimsiz satır yüksekliği A/B formundaki textarea'yı 4 px uzatıyordu: etiketlere `leading-5`.
  - `components.json` artık config dosyası göstermiyor. DESIGN.md §2, §3 ve §8 güncellendi (yeni kural: gizli/inline çocuk varsa `gap`).
- Doğrulama: Ana daldaki Tailwind 3 build'i ayrı bir worktree'de 3001 portunda, yeni build 3000'de çalıştırıldı. 6 ekran × açık/koyu × 1280/375 = 24 tam sayfa görüntü; aynı build'in iki çekimi 0,00% fark (gürültü yok). Element bazında konum/stil karşılaştırması (`getBoundingClientRect` + computed style).
  - Landing, benchmark, tartışma, personalar: **piksel piksel aynı** (0,00%).
  - Form: tek fark açıklama textarea'sının altı 7 px daha sıkı (v3'te inline-block taban çizgisi boşluğuydu). Analiz: "Tablo olarak göster" 3 px aşağıda; fiyat grafiğinde "şu an" çubuğunun çerçevesi artık görünüyor (kod bunu istiyordu, v3'te çizilmiyordu).
  - Select menüsü iki sürümde aynı konum/boyutta, tam opak açılıyor. `animate-in`, `fade-in-0`, `zoom-in-95`, `prose-invert` CSS'te var.
  - lint, `tsc`, build temiz; Puppeteer uçtan uca 10/10; `npm audit --omit=dev` 0, tam audit 11 → 7 (S15).

## Faz 8: Kalan iyileştirmeler
- [x] **8a** F19, persona sohbet geçmişi (`feat/persona-chat-history`):
  - Sohbetler sonucun tarayıcı geçmişi kaydında (`HistoryEntry.chats`, persona adına göre) tutuluyor. Ayrı depo yok; yedek indirme/yükleme, kayıt silme ve kota taşmasında eski kayıtların düşmesi sohbetleri de kapsıyor. Sunucuya sohbet kaydedilmiyor.
  - Her persona kendi sohbetini koruyor (önceden persona değiştirmek sohbeti siliyordu). Cevap akışı bitince kaydediliyor, her parçada değil. "Sohbeti temizle" düğmesi.
  - Cevap hiç gelmezse (AI hatası, durdur) soru sohbetten çıkarılıp yazı kutusuna geri konuyor; cevapsız soru kaydedilmiyor. Cevap akarken persona değiştirilir veya temizlenirse yeni sohbete dokunulmuyor.
  - Doğrulama: `/api/persona-chat` sahte SSE ile Puppeteer 13/13 (akış, yenileme, önceki turların gönderilmesi, persona başına ayrı kayıt, hata yolu, temizleme). Gerçek Gemini o sırada 429 / zaman aşımı veriyordu; arayüz hatayı doğru gösterdi. Genel uçtan uca test 10/10.
- [x] **8b** F20, dağıtım dokümanı (`docs/deployment.md`): nginx örneği (SSE yollarında `proxy_buffering off`, `gzip off`, 300 sn okuma süresi; 10 MB gövde), aynı alan adından frontend + API, `NEXT_PUBLIC_API_URL`'in build anında gömülmesi, `FORWARDED_ALLOW_IPS` ile gerçek istemci IP'si, tek worker kısıtı, kontrol listesi.
  - Bulunan risk: proxy arkasında `FORWARDED_ALLOW_IPS` doğru verilmezse bütün kullanıcılar tek rate limit kotasını paylaşıyor. Dokümana eklendi.
  - Doğrulama: uvicorn `--proxy-headers` ile güvenilen proxy'den gelen `X-Forwarded-For` istemci başına sayıldı (aynı IP 3. istekte 429, başka IP 404). Güvenilmeyen kaynaktan gelen başlık yok sayıldı, yani sahte başlıkla limit aşılamıyor. nginx config'i çalıştırılarak doğrulanmadı (bu makinede nginx yok, Docker daemon kapalı).
- [x] **8c** B.8, gözlemlenebilirlik (`feat/observability`):
  - `app/observability.py` (stdlib): request id bir `ContextVar`'da; log kaydı oluşturulurken her satıra ekleniyor. Threadpool'daki handler'lar ve LLM uyarıları da isteğin kimliğini taşıyor (ör. `[c26475e56b0b] Gemini … HTTP 429`).
  - `LOG_FORMAT=json`: satır başına bir JSON nesnesi. Metin formatına da `[requestId]` eklendi.
  - İstek başına tek erişim satırı: yöntem, yol (sorgu dizesi hariç), durum, süre (ms). 411/413 erken redleri ve 500'ler dahil. SSE'de süre, ilk byte'a kadar geçen zaman. Başarılı `/api/health` DEBUG'da (Docker healthcheck gürültüsü). Dockerfile'da uvicorn'un kendi erişim logu kapatıldı (`--no-access-log`), satırlar çift olmuyor.
  - `/api/health` → `ai.lastSuccessAt`, `ai.lastErrorAt`, `ai.lastError` (yalnızca tür / `HTTP 429`; mesaj gövdesi yok). Kota sorunu log okumadan görülüyor.
  - Doğrulama: `tests/test_observability.py` (5 test, toplam 72): erişim satırı ve kimlik eşleşmesi, sorgu dizesinin loglanmaması, 413 satırı, threadpool'da kimliğin taşınması, JSON formatı, sağlıkta son 429. JSON çıktısı gerçek uvicorn ile görüldü. ruff temiz.
- [x] **8d** B.9, yeni kategoriler: ayakkabı, çanta, kozmetik (`feat/categories-more`):
  - `app/models/category.py`: `Category` ve gruplar (`CLOTHING`, `TECH`, `FASHION_ACCESSORIES`, `FASHION`, `BEAUTY`, `SEASONAL`). Önceden altı dosyada elle yazılmış küme kopyaları vardı; her kullanım yerinde yeni kategorilerin hangi yola gireceğine açıkça karar verildi (ör. ayakkabı sezona duyarlı, çanta ve kozmetik değil; kozmetikte marka eksikse uyarı).
  - `category_rules.json`: ortalama fiyat, pazar genişliği, varsayılan ağırlıklar ve motivasyon ağırlıkları (ayakkabı: stil/ihtiyaç/trend; çanta: stil/ihtiyaç/hediye; kozmetik: ihtiyaç/problem çözme/trend/hediye; hepsinin toplamı 1). `meta.categories` güncellendi (eskiden 6 kategori yazıyordu).
  - 8 yeni özellik: `soleMaterial`, `heelHeight`, `compartments`, `strapType`, `skinType`, `ingredients`, `volume`, `certifications`. Kalite puanı, girdi analizi (anahtar kelimeler, önemli alanlar), kural tabanlı tavsiye metinleri ve "iyileştirilmiş açıklama" bunları kullanıyor.
  - Link okuyucu: yeni kategoriler listenin başında ("laptop çantası" → çanta, "24 saat kalıcı ruj" → kozmetik); 4 harf ve altı anahtar kelimeler kelime sınırıyla aranıyor ("bot" ≠ "robot"); "krem" yerine "kremi" ("krem rengi tişört" giyimde kalıyor). Yeni özellik anahtarları (taban, bölme, cilt tipi, hacim…) eşleniyor.
  - Frontend: "Aksesuar & Bakım" ailesi ve üç kategori için form alanları; landing'deki kategori sayısı artık `CATEGORIES.length` (elle "10" yazıyordu).
  - Bulunan hata **B17** (Türkçe karakterler kategori uyumunu düşürüyordu) bu fazda düzeltildi. Yazım sırasında düzenleme script'i bir regex'e görünmez backspace karakteri soktu; test yakaladı, düzeltildi, kod tabanında başka örnek yok.
  - Doğrulama: `tests/test_categories.py` (30 test, toplam 102): kategori/kural/anahtar kelime tutarlılığı, 13 × 7 ağırlık normalizasyonu, üç yeni kategoriyle uçtan uca simülasyon (kategori uyumu ≥ 0,6, yanlış kategori önerisi yok), yeni alanların kalite puanını artırması, Türkçe = ASCII uyumu, link eşleme vakaları. Puppeteer 10/10: açılır listede 13 kategori ve yeni aile, her kategoride alanlar, istekte yeni alanlar, sonuç ekranı. Genel uçtan uca test 10/10.
- [x] **8e** B.10, dil tutarlılığı (`chore/language-cleanup`):
  - "TASK INTELLIGENCE" gibi İngilizce başlıklar Faz 4'te zaten kalkmıştı. Asıl sorun backend'deydi: kullanıcıya görünen ~100 metin ASCII'ye çevrilmiş Türkçeydi (uyarılar, öneriler, kural tabanlı tavsiyeler, zayıflık mesajları, persona yorumları, hata mesajları).
  - **LLM prompt'ları** (AI yorumları, girdi analizi, persona tartışması, güvenlik kuralı) Türkçe karakterlerle yeniden yazıldı ve "Türkçe karakterlerle yaz" kuralı eklendi. Faz 7 ekran görüntülerinde AI'ın kendi ürettiği metinler de ASCII'ydi ("Kumas kartini hazirlayin"); sebebi prompt'tu.
  - `personas.json` (iki kopya): `displayName` eklendi, `name` kimlik olarak kaldı (sohbet anahtarı, URL, API); `reason`/`advice` düzeltildi. Frontend'deki elle yazılmış eşleme tablosu kalktı, `personaLabel()` veriden okuyor. Dosyalar metin düzeyinde düzenlendi (JSON'u yeniden yazmak 1300 satırlık biçim gürültüsü üretiyordu).
  - `category_rules.json` etiketleri ("Kıyafet / Tişört") ve `services/labels.py` (kategori, motivasyon, gelir seviyesi, persona): kullanıcı metnine artık ham kimlik girmiyor.
  - Bulunan ve düzeltilen hatalar: **B18** (model Türkçe isim yazınca tartışma mesajı başka personaya gidiyordu), **B19** (Türkçe profillerle hiç eşleşmeyen ASCII anahtar kelimeler; metne sızan ham kimlikler). `"KARARSIZ".lower()` → "kararsiz" sorunu için karar ifadeleri açıkça yazıldı. Persona yükleyici, içe aktarma döngüsünü kırmak için `normalization_service`'e taşındı.
  - Anahtar kelime listeleri bilerek ASCII kaldı (`fold_text` ile eşleşiyorlar, B17).
  - Doğrulama: `tests/test_language.py` (4 test, toplam 106): AI kapalıyken bütün çıktı metinlerinde ASCII Türkçe kelime ve ham kimlik yok; iki persona dosyası aynı ve her `displayName` katlandığında kimliğine eşit; Türkçe yazılmış model isimleri doğru personaya bağlanıyor; API hata mesajı Türkçe. Testteki regex bilerek büyük/küçük harfe duyarlı (`re.IGNORECASE` Unicode'da "ı" ile "i"yi eşit sayıp doğru metni işaretliyordu). Puppeteer 10/10 + kategori 10/10; AI kapalı sonuç ekranı elle kontrol edildi.

## Şu an neredeyiz

- **Son tamamlanan:** Faz 10b (AI'sız persona sohbeti). Tüm dallar `main`'e merge edildi ve `origin`'e push'landı.
- **Sıradaki:** Faz 11 (MCP connector) → 11b → 12 … (sıra aşağıdaki tabloda). Her faz kendi dalında, bitince bu bölüm güncellenir.
- **Bekleyen kararlar:** kategori genişletme (hangi aileler) Faz 13'e gelince konuşulacak; Faz 9 için API anahtarı yok.
- **Ortam notları:** `backend/venv` bozuk (eski bir kullanıcı yolunu gösteriyor). Testler geçici bir venv ile koşuyor. Gemini sık sık 429 veriyor; arayüz testlerinde AI kapalı ya da sahte SSE kullanılıyor. `gh`, nginx ve Docker daemon yok.

## Yol haritası v2 (2026-10-17'de kararlaştırıldı)

**Verilen kararlar**
- **Abonelik ile AI:** PazarLab sitesi kullanıcının Claude aboneliğini kullanamaz. Anthropic, abonelik oturum anahtarlarının üçüncü taraf ürünlerde kullanılmasını yasaklıyor (Şubat 2026). Bunun meşru yolları: **MCP connector** (kullanıcı PazarLab'ı kendi Claude'una ekler; yorumlar onun aboneliğinden düşer) ve **Claude-powered artifact** (açan kişinin hesabıyla çalışır). Web sitesi herkes için çalışmaya devam eder: simülasyon AI'sız, yorumlar sunucudaki Gemini anahtarıyla, kota dolunca kural tabanlı.
- **B15 / fiyat modeli:** "ödeme isteği" (willingness-to-pay) modeline geçilecek (Faz 12). Skorlar değişir; eski kayıtlı sonuçlar yeni motorla birebir karşılaştırılamaz. Bu not sonuç ekranında belirtilecek (motor sürümü kayda yazılır).
- **Kişilik:** 16Personalities/MBTI doğrudan kullanılmayacak (iki kutuplu tiplerin güvenilirliği düşük, tip adları ve metinleri telifli, "MBTI" tescilli marka). Temel **Big Five (OCEAN)** olacak (kamuya açık IPIP ölçekleri, sürekli değerler). İstenirse arayüzde Big Five'tan hesaplanan, kendi metinlerimizle anlatılan 4 harfli bir "kişilik kodu" gösterilir.
- **Tarayıcı eklentisi:** en sona (Faz 18). Koşul: Faz 14'te "URL ver" ucunun yanına "HTML ver" ucu eklenecek; eklenti yalnızca sayfayı gönderen ince bir katman olacak.
- **Gerçek kullanıcı verisi:** kişi bazında ham veri (isim, iletişim, adres) asla alınmaz. Yalnızca anonim veya toplu segmentler kabul edilir; açık rıza ve silme hakkı olmalı (KVKK). Hesap sistemi ön koşul (Faz 19).
- **Çoklu LLM (Faz 9):** API anahtarı alınana kadar bekliyor; abonelik bu fazın yerine geçmez.

### Faz 10a: AI bütçesi ✅
- [x] `llm_client` içinde süreli önbellek (LRU + TTL, `AI_CACHE_TTL_SECONDS` = 6 sa, `AI_CACHE_MAX_ENTRIES` = 500). Anahtar: istem + veri + sıcaklık + token sınırı (SHA-256). Tek seferlik çağrıların hepsini kapsıyor: AI yorumları, tartışma, girdi analizi, araştırma özeti, link okuyucunun AI tamamlaması. JSON cevaplar ayrıştırıldıktan **sonra** saklanıyor (yarım cevap önbellekte kalmıyor, sonraki istekte yeniden deneniyor); çağırana kopya veriliyor.
- [x] IP başına **günlük** gerçek AI çağrısı kotası (`AI_DAILY_CALLS_PER_IP` = 60, Türkiye saatine göre gün, 0 = kapalı). Önbellek isabeti kota harcamıyor. Persona sohbeti önbelleğe alınmıyor ama kotadan düşüyor. İstemci IP'si middleware'de bir `ContextVar`'a yazılıyor (`observability.client_ip_var`); istek dışındaki çağrılar (betikler) sınırlanmıyor.
- [x] Kota aşımı `AIQuotaExceeded` (bir `LLMUnavailable` alt sınıfı) olarak yükseliyor, yani mevcut bütün kural tabanlı geri dönüşler kod değişikliği olmadan devreye giriyor. `aiInsights.aiFallbackReason` = `quota` | `unavailable`; arayüzde bildirim, "kural tabanlı" etiketinin açıklaması ve Markdown rapor notu nedene göre ("Bugünkü AI hakkın doldu; … Simülasyon sonuçları etkilenmedi.").
- [x] `/api/health` → `ai.cache { entries, hits, misses }`, `ai.dailyCallsPerIp`.
- Plandan sapma: önbellekten gelen sonucu ayrıca işaretlemek gereksiz görüldü (kullanıcı için fark yok; isabet oranı health'te).
- Doğrulama: `tests/test_ai_budget.py` (8 test, toplam 114): aynı çağrıda tek ağ isteği ve kopya dönmesi, bozuk JSON'un saklanmaması, önbelleğin kapatılabilmesi, IP başına kota + önbellek isabetinin bedava olması + sohbetin de kotaya takılması, istek dışı ve kota kapalı durumlar, API'de `aiFallbackReason=quota` (bu test istemci IP'sinin threadpool'daki servislere taşındığını da kanıtlıyor), `unavailable`, health alanları. lint/tsc temiz; AI kapalı Puppeteer 10/10.
- Risk: paylaşılan NAT arkasındaki kullanıcılar aynı kotayı paylaşır (deployment.md'ye yazıldı). Önbellek ve kota process belleğinde; yeniden başlatınca sıfırlanır.

### Faz 10b: AI'sız persona sohbeti ✅
- [x] `services/persona_offline.py`: AI yoksa (`LLMUnavailable`, günlük kota dahil) persona, kayıttaki kendi sonucundan (karar, ihtimal, öneri), kişilik verisinden (`values`, `biggestFear`), ürünün zayıflıklarından ve ürün verisinden (fiyat ↔ kategori ortalaması, kargo süresi, iade, garanti) cevap kuruyor. Konu, katlanmış anahtar kelimelerle seçiliyor: fiyat, kargo/iade, güven/garanti, açıklama/görsel, öneri, neden, genel.
- [x] SSE sözleşmesi aynı (`delta` … `done`); yalnızca `done` = `{ ruleBased: true, reason }` eklendi. AI cevabı yarıda kesilirse şablon eklenmiyor, hata olayı gidiyor.
- [x] Arayüz: cevapta "kural tabanlı" etiketi (açıklaması nedene göre); işaret, kaydedilen sohbette de saklanıyor (`ChatMessage.ruleBased`).
- Yazım notları: persona `reason` metinleri üçüncü şahıs ("bu persona için…") olduğundan birinci şahıs cevapta kullanılmadı; yerine `values` alanı. "En büyük korku" yalnızca güven ihtiyacı yüksek personalarda (`brandTrustNeed` orta değeri ≥ 0,7) gösteriliyor, yoksa konuyla ilgisiz düşüyordu.
- Doğrulama: `tests/test_offline_chat.py` (17 test, toplam 130): AI yokken ve kota dolunca kural tabanlı cevap + neden, yarım AI cevabına şablon eklenmemesi, 9 konu tespiti vakası, fiyat karşılaştırması (pahalı/uygun/ucuz), ürün verisinin cevaba yansıması, korkunun yalnızca güvene duyarlı personada çıkması. Eski "AI yoksa hata olayı" testi kaldırıldı (davranış bilerek değişti). Puppeteer (gerçek backend, AI kapalı, sahte yanıt yok) 5/5: cevap geliyor, etiketli, hata notu yok, yenilemede kalıyor; genel test 10/10. Örnek cevaplar elle okundu.

### Faz 11: MCP connector
- [ ] Backend'e uzak MCP sunucusu (Streamable HTTP): `simulate`, `price_sweep`, `compare_ab`, `read_product_link`, `list_personas`, `get_simulation`. Araçlar deterministik çekirdeği kullanır; sunucu tarafında LLM çağrılmaz.
- [ ] Kötüye kullanım koruması: rate limit, gövde sınırı, SSRF korumasının link aracında da geçerli olması; gerekirse OAuth / erişim anahtarı.
- [ ] Dokümantasyon: Claude.ai'de "+" → "Add custom connector" ile kurulum; örnek konuşmalar.
- Kabul: MCP protokol testleri; kullanıcının Claude aboneliğiyle uçtan uca elle deneme (sunucunun internetten erişilebilir olması gerekir: geçici tünel veya dağıtım).

### Faz 11b: Claude-powered artifact (araştırma)
- [ ] Artifact'ın dış API'ye (PazarLab backend'i) erişip erişemediği kontrol edilir.
- [ ] Erişiyorsa hafif bir demo (form → sonuç → persona sohbeti, AI çağrıları görüntüleyenin hesabından); erişemiyorsa çekirdeğin JS'e taşınması için efor notu.
- Kabul: karar ve gerekçe bu dosyaya yazılır.

### Faz 12: Motor v2 + AI kasabası
- [ ] **Ödeme isteği (WTP):** her sakine kategori fiyatı × persona/gelir çarpanıyla log-normal bir üst fiyat. Fiyat düştükçe alma ihtimali artar; "çok ucuz şüphesi" yalnızca kalite odaklı sakinlerde. B15 kapanır.
- [ ] **Lojistik karar:** `P = 1 / (1 + e^-fayda)`; ağırlıklar ve parametreler tek bir yapılandırma dosyasında, belgelenmiş varsayımlar olarak.
- [ ] **Kasaba nüfusu (500 sakin):** ad, yaş, meslek, hane, gelir, şehir büyüklüğü, hobiler, alışveriş alışkanlıkları, kısa hikâye. Bir kez üretilir ve JSON olarak saklanır; simülasyon sırasında AI çağrılmaz.
- [ ] **Üç katman:** hayat hikâyesi + **Big Five** + alışveriş tipi (mevcut 12 persona, artık sakin kümeleri). Sayısal özellikler bu üçünden birlikte türetilir; hikâye ↔ sayı tutarlılığı testle denetlenir.
- [ ] **Arkadaşlık ağı:** her sakinin birkaç arkadaşı; alan sakinler arkadaşlarının ihtimalini artırır (ağızdan ağıza yayılma, graf algoritması, AI yok). Trend ürünlerde 30 günlük benimseme eğrisi.
- [ ] **Rakipli seçim (multinomial logit):** ürün, benchmark'tan gelen 1–3 rakip ve "almamak" arasında seçim; "tahmini pazar payı".
- [ ] **Monte Carlo:** 20–50 tohum, sonuç aralıkla ("%58 ± 4"). Döngü numpy ile vektörleştirilir; sonuçlar istek özetine göre önbelleğe alınır.
- [ ] **"En etkili iyileştirme":** tek tek değişkenler (kargo, iade, garanti, fiyat −%10, açıklama tamamlama) denenir; alıcı kazancına göre sıralanır.
- [ ] Sonuç ekranında "kasabadan 5 temsilci" (tek AI çağrısı; AI yoksa şablon). Persona sohbeti belirli bir sakinle de yapılabilir (hikâyesi prompt'a girer).
- [ ] Klişe ve önyargı denetimi: demografi tek başına tercihi belirlemez; çeşitlilik testleri. Arayüzde sakinlerin sentetik olduğu açıkça yazılır.
- [ ] Kayda motor sürümü (`engineVersion`) yazılır; eski sonuçlar açılınca "eski motorla hesaplandı" notu.
- Kabul: fiyat düştükçe fiyat hassas sakinlerde alıcı sayısı artıyor (test); aynı girdi + tohum deterministik; 500 sakin × 30 tohum simülasyonu < 1 sn; mevcut API sözleşmesi geriye uyumlu (yeni alanlar ek).

### Faz 13: Ürün ekleme ekranı v2 (link + form + yerleşim)
- [ ] Önce `impeccable audit` / `critique` (kural: önce doğruluk ve kalite), sonra tasarım; en sonda `ponytail-review`.
- [ ] Link öncelikli akış: "Linki yapıştır → doldurduk → kontrol et"; elle giriş ikinci yol.
- [ ] Adım adım form, canlı kalite göstergesi ("bu alan skora +X katkı veriyor"), eksik alan ipuçları, taslak kaydetme, önceki ürünü kopyalama.
- [ ] Kategori sistemi veriye dayalı: alanlar, ağırlıklar, anahtar kelimeler ve ortalama fiyat tek bir paylaşılan dosyada; form bu dosyadan üretilir. **Hangi yeni kategori ailelerinin ekleneceği bu fazın başında konuşulacak.**
- Kabul: DESIGN.md'ye uygun; 375 px'te taşma yok; mevcut uçtan uca testler geçiyor; kullanıcı onayı.

### Faz 14: Link okuma v2
- [ ] `product_link_service.py` (1.509 satır) site başına okuyuculara bölünür: Trendyol, Hepsiburada, Amazon TR, n11, Çiçeksepeti (+ genel okuyucu). Yapısal veri (JSON-LD, sayfa içi state) öncelikli.
- [ ] Kayıtlı HTML ile testler (CI'da canlı siteye gidilmez).
- [ ] **"HTML ver" ucu** (eklenti için; SSRF yüzeyi yok, boyut sınırı var) ve "sayfa metnini yapıştır" yedeği.
- [ ] Yorum sayısı ve puanın okunması (Faz 12'nin sosyal kanıt girdisi).
- Not: pazar yerlerini sunucudan taramak çoğu zaman kullanım şartlarına aykırı; uzun vadeli yol eklenti (Faz 18) ve resmî API'ler.

### Faz 15: Diğer ekranların yerleşimi
- [ ] Sonuç sayfası mobilde ~5.800 px; sabit karar özeti, bölümler arası atlama menüsü, ikincil analizlerin katlanması. Benchmark, tartışma ve personalar ekranları.
- [ ] Sıra: `impeccable audit` → `critique` → düzeltme → `ponytail-review`.

### Faz 16: Yeni özellikler
- [ ] İlan yeniden yazma + öncesi/sonrası simülasyonu.
- [ ] Rakip kartı (benchmark fiyatları, pazar payı).
- [ ] Segment grafiği (hangi yaş/gelir grubu alıyor).
- [ ] Görsel analizi (AI, isteğe bağlı), paylaşım görseli.

### Faz 17: Temizlik ve CI testleri
- [ ] Kullanılmayan `components/ui/` bileşenleri (`button`, `card`, `badge`, `input`), takip edilen `backend/scratch/test_backend.py`.
- [ ] Tek `personas.json` kaynağı (şu an backend ve frontend'de iki kopya; test eşitliği denetliyor).
- [ ] LangGraph gerekliliği `ponytail-audit` ile değerlendirilir (5 adımlı düz boru hattı).
- [ ] Puppeteer betikleri (şu an oturum dışında, geçici klasörde) Playwright testleri olarak repoya ve CI'a.
- [ ] Docker imaj build'inin doğrulanması.

### Faz 18: Tarayıcı eklentisi
- [ ] "PazarLab'a gönder": kullanıcının kendi tarayıcısında açık ürün sayfasını Faz 14'teki "HTML ver" ucuna gönderir. Engellemeye takılmaz; sunucudan tarama gerekmez.

### Faz 19: Kendi nüfusunu yükle + kalibrasyon
- [ ] Satıcı kendi sipariş dökümünden (Trendyol satıcı paneli, Shopify vb.) **anonim/toplu segmentler** yükler (JSON/CSV şeması); kasaba bu dağılımlara göre üretilir.
- [ ] Gerçek dönüşüm verisiyle motor ağırlıklarının kalibrasyonu ve geriye dönük test.
- [ ] Ön koşullar: hesap sistemi, satıcı başına ayrı veri, açık rıza, silme. Ham kişisel veri kabul edilmez (KVKK).

## Riskler
- **Gemini model adları sık değişiyor.** B1'de model env'den okunacak; varsayılan seçilirken o günkü güncel model listesi kontrol edilecek.
- **Tam yeniden tasarım geniş bir değişiklik.** Faz 4'teki adımlar ayrı commit'ler halinde ilerleyecek; her adımdan sonra `npm run build` çalıştırılacak.
- **SSRF düzeltmesi bazı site okumalarını bozabilir.** cloudscraper redirect zinciri değişiyor; Trendyol, Hepsiburada ve Amazon TR ile elle test edilecek.
