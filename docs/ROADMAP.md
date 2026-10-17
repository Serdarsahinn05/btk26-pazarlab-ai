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
| 11 | `feat/mcp-connector` | PazarLab MCP sunucusu (Claude connector) | 1–1,5 gün | ✅ (Claude.ai denemesi bekliyor) |
| 11b | `spike/claude-artifact` | Claude-powered artifact araştırması | 0,5 gün | ✅ karar: Motor v2'den sonra |
| 12a | `feat/town-population` | Kasaba nüfusu: 500 sakin, hikâye, Big Five, türetilen özellikler | 0,5 gün | ✅ |
| 12b | `feat/engine-v2` | Motor v2: ödeme isteği, lojistik karar, Monte Carlo, `engineVersion` | 1 gün | ✅ |
| 12c | `feat/town-dynamics` | Arkadaşlık ağı ve yayılma, "en etkili iyileştirme", segmentler | 1 gün | ✅ |
| 12d | `feat/engine-v2-ui` | Arayüz: ± aralık, kasaba temsilcileri, segment grafiği, iyileştirme kartı | 1 gün | ✅ |
| 13a | `feat/category-families` | 12 kategori ailesi + alt türler + Diğer, tek veri dosyası, linkten kategori tanıma | 1 gün | ✅ |
| 13b | `feat/product-entry-v2` | Ürün ekleme ekranı: link öncelikli akış, canlı Hazırlık paneli, taslak | 1,5 gün | ✅ |
| 14 | `feat/link-reader-v2` | Okuyucu paketi, "HTML/metin ver" ucu, puan ve değerlendirme (sosyal kanıt), kayıtlı sayfa testleri | 2 gün | ✅ (siteye özel kurallar gerçek sayfa geldikçe) |
| 15 | `feat/layout-pass` | Diğer ekranların yerleşimi (audit → critique → ponytail-review) | 1,5 gün | ⬜ |
| 16 | `feat/insight-features` | İlan yeniden yazma, rakip kartı, segment grafiği, görsel analizi | 2–3 gün | ⬜ |
| 17 | `chore/cleanup-e2e` | Ölü kod temizliği, Playwright testleri CI'da | 1 gün | ⬜ |
| 18 | `feat/browser-extension` | "PazarLab'a gönder" tarayıcı eklentisi | 1–2 gün | ⬜ |
| 19 | `feat/bring-your-population` | Kendi nüfusunu yükle + kalibrasyon (hesap sistemi, KVKK) | 3+ gün | ⬜ |
| 20 | `feat/claude-artifact` | Claude içinde bağımsız PazarLab sayfası (11b, seçenek B) | 1,5 gün | ⬜ isteğe bağlı |

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

- **Son tamamlanan:** Faz 14 (link okuma v2): okuyucu `app/services/link_reader/` paketine bölündü, tek yanıt modeli (MCP'nin link aracı artık çökmüyor), `POST /api/read-product-page` (sayfa HTML'i veya kopyalanmış metin; sunucu hiçbir yere istek atmaz), mağaza puanı + değerlendirme sayısı okunuyor ve simülasyonda güvene küçük bir etki yapıyor, kayıtlı sayfa test düzeneği. Siteye özel kurallar bilerek yazılmadı (aşağıda).
- **Ara iş (2026-10-17, `chore/deploy-vercel-render`):** Vercel (website) + Render (API) ile yayın hazırlığı: `render.yaml` Blueprint, [deployment.md §6](deployment.md#6-vercel--render) (adımlar, ücretsiz planın kısıtları, ne zaman VPS), `CLIENT_IP_HEADER` (platform proxy'sinin yazdığı IP başlığı; Render'da `CF-Connecting-IP`, ilk deploy'da `/api/health`'teki `clientIp` ile doğrulanacak). 2 test (toplam 257). Gerçek bir Render/Vercel hesabında denenmedi.
- **Sıradaki:** Faz 15 (diğer ekranların yerleşimi: sonuç sayfası mobilde çok uzun, benchmark/tartışma/personalar; sıra audit → critique → düzeltme → ponytail-review). 12'nin ertelenen maddeleri (rakipli seçim, belirli bir sakinle sohbet) Faz 16'da değerlendirilebilir.
- **Kullanıcıdan beklenen (isteğe bağlı):** Trendyol, Hepsiburada, Amazon TR, n11, Çiçeksepeti'den birer ürün sayfasını tarayıcıda "Farklı kaydet → Yalnızca HTML" ile kaydedip `backend/tests/fixtures/links/` altına koymak; siteye özel okuma kuralları bu gerçek sayfalara göre yazılır.
- **Ertelenen (kullanıcı kararı, 2026-10-17):** Faz 11'in Claude.ai denemesi sonra birlikte yapılacak. Gerekenler: `cloudflared` kurulumu (`winget install Cloudflare.cloudflared`), tünel adresinin `MCP_ALLOWED_HOSTS`'a yazılması, Claude'da connector eklenmesi; açık soru `?key=` sorgu dizesinin korunup korunmadığı. Adımlar: docs/mcp-connector.md. (sıra aşağıdaki tabloda). Her faz kendi dalında, bitince bu bölüm güncellenir.
- **Bekleyen kararlar:** Faz 9 için API anahtarı yok. Süpermarket/gıda, pet shop, otomotiv, kitap/kırtasiye aileleri bilerek dışarıda ("Diğer"e düşüyorlar); talep olursa eklenecek.
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

### Faz 11: MCP connector ✅ (Claude.ai denemesi bekliyor)
- [x] `app/mcp_server.py`, `mcp==2.3.0` (2 Ekim 2026; 2.x'te `FastMCP` → `MCPServer` olmuş, API kaynak koddan doğrulandı). 7 araç: `list_categories`, `list_personas`, `read_product_link`, `simulate_product`, `price_sweep`, `compare_variants`, `get_simulation`. Türkçe başlık/açıklamalar, okuma/yazma ipuçları (`ToolAnnotations`), Claude için kullanım talimatı.
- [x] **Sunucu tarafında AI yok:** `llm_client.without_ai()` (ContextVar). İçinde bütün AI çağrıları "anahtar yok" gibi davranıyor ve kural tabanlı yollar çalışıyor; kontrol önbellekten önce yapılıyor, yani eski bir AI cevabı da dönmüyor. Gemini anahtarı tanımlıyken gerçek HTTP denemesinde sıfır Gemini çağrısı.
- [x] Ürün girdisi için MCP'ye özel `ProductInput` şeması (görsel ve iç analiz alanları yok, alanlar açıklamalı). `simulate_product` sonucu kaydediyor ve `PUBLIC_SITE_URL` varsa sitede açılacak linki dönüyor; persona adları Türkçe.
- [x] FastAPI'ye `/` altında en son mount (API rotaları önce eşleşiyor; MCP yalnızca `/mcp`'ye cevap veriyor). Starlette mount edilen uygulamanın lifespan'ini çalıştırmadığı için oturum yöneticisi `main.py`'deki lifespan'de başlatılıyor. Durumsuz, JSON yanıtlı; hem 2026-07-28 protokolü hem eski `initialize` akışı çalışıyor.
- [x] Koruma: `MCP_ALLOWED_HOSTS` (Host allowlist, aksi 421), isteğe bağlı `MCP_ACCESS_KEY` (`?key=`, sabit zamanlı karşılaştırma, aksi 401), tek ortak `MCP_RATE_LIMIT_PER_MIN` (Claude'un istekleri Anthropic IP'lerinden geldiği için IP başına limit anlamsız). Beklenen hatalar `ToolError` ile modele okunur mesaj olarak dönüyor; beklenmeyenlerin ayrıntısı SDK tarafından gizleniyor. `read_product_link` SSRF korumasını kullanıyor.
- [x] Dokümantasyon: [mcp-connector.md](mcp-connector.md) (araçlar, ayarlar, tünel ile yerel deneme, Claude'a ekleme, örnek istekler, güvenlik). `deployment.md`'deki nginx örneğine `location = /mcp` eklendi; önceki örnek `/mcp`'yi frontend'e gönderirdi.
- Doğrulama: `tests/test_mcp.py` (9 test, toplam 139): araç listesi ve şema, kategori/persona araçları, sunucu AI'ı çağrılırsa test düşecek şekilde simülasyon + kayıt + `get_simulation`, fiyat eğrisi ve karşılaştırma, hatalı girdi / bilinmeyen kimlik / iç IP'nin araç hatası olması, ortak rate limit, HTTP'de API ile yan yana çalışma, erişim anahtarı ve bilinmeyen Host. Resmî `mcp` istemcisiyle gerçek uvicorn üzerinden uçtan uca deneme (anahtarlı/anahtarsız). `pip check` ve `pip-audit` temiz.
- **Bekleyen:** Claude.ai'de kullanıcının aboneliğiyle gerçek deneme (tünel + `MCP_ALLOWED_HOSTS`). Belirsiz nokta: Claude'un connector URL'sindeki `?key=` sorgu dizesini koruyup korumadığı; korumuyorsa geçici olarak anahtarsız denenir, uzun vadede OAuth.

### Faz 11b: Claude-powered artifact (araştırma) ✅
Kaynak: claude.ai yayınlanmış artifact çalışma zamanı sözleşmesi 0.2.84'ün tip tanımları (`sample.d.ts`, `mcp.d.ts`, `claude.d.ts`).

**Bulgular**
- **Sayfanın ağ erişimi engelli.** Artifact, PazarLab backend'ine `fetch` ile doğrudan ulaşamaz (sözleşme: "its network is blocked").
- **`sample` yeteneği:** sayfa, **açan kişinin Claude hesabıyla** Claude'a soru sorabiliyor; kullanım izleyicinin planından düşüyor, ilk çağrıda izin isteniyor, aynı istek 5 dk önbellekten dönüyor. AI yorumları ve persona sohbeti için birebir uygun.
- **`mcp` yeteneği:** sayfa, **izleyicinin kendi connector'larını** onun kimliğiyle çağırabiliyor. İzleyici PazarLab connector'ını eklediyse simülasyon backend'de çalışabilir; eklemediyse `server_not_connected` döner. `mcp` beyan eden bir sayfa herkese açık linkle paylaşılamıyor.
- Not: claude.ai sohbetinde üretilen "chat artifact"ların çalışma zamanı farklı (düz `window.claude`); bu araştırma yayınlanmış artifact'lar içindir.

**Seçenekler**
- **A. Connector'a dayanan sayfa:** `mcp` (PazarLab araçları) + `sample`. Tek motor (backend), ama izleyicinin connector'ı eklemiş olması, connector'ın internette yayında olması gerekir ve sayfa herkese açık paylaşılamaz.
- **B. Bağımsız sayfa:** deterministik motor JavaScript'e taşınır ve sayfanın içine gömülür; AI kısmı `sample`. Connector gerekmez, herhangi bir Claude kullanıcısı açabilir, paylaşılabilir. Bedeli iki dilde motor; Python ile JS'nin aynı sonucu verdiğini ortak test girdileriyle (Python'un ürettiği referans çıktılar) denetlemek gerekir.

**Karar:** Şimdi yapılmıyor. Faz 12 motoru baştan değiştireceği için bugün JS'e taşımak işi iki kez yapmak olur. Motor v2 oturduktan sonra **B** seçeneğiyle Faz 20 (isteğe bağlı). Motor v2, parametreleri veri dosyalarında (kurallar, personalar, kasaba nüfusu) ve algoritması küçük kalacak şekilde tasarlanacak; böylece JS'e taşımak kolaylaşır. A seçeneği, connector yayına alındığında hızlı bir demo olarak ayrıca denenebilir.

### Faz 12: Motor v2 + AI kasabası
Dört alt faza bölündü (12a–12d); her biri ayrı dalda, ayrı testlerle. Aşağıdaki maddeler fazın tamamını tanımlar.

**12a ✅ Kasaba nüfusu** (`feat/town-population`)
- `scripts/generate_town.py` → `app/data/town.json` (500 sakin, 551 KB). Deterministik (sabit tohum), AI yok: hikâyeler şablonlardan kuruluyor, ücretsiz ve tekrar üretilebilir. `--check` ile dosyanın üreticiyle uyumu denetlenir.
- Sakin: ad, yaş (18–65), cinsiyet, şehir ve şehir tipi (büyükşehir / şehir / ilçe), hane (ailesiyle, yurt, ev arkadaşı, yalnız, eşiyle, eşi ve çocukları, tek ebeveyn), meslek (yaş ve gelire göre; öğrenci, emekli, kendi işi), gelir, iki hobi, alışveriş personası, Big Five, kişisel sapmalar, hikâye. Persona başına gelir ağırlıkları ve yaş aralıkları personas.json'daki kullanılmayan `personaTemplates` bloğundan alındı (eksik iki persona tamamlandı, alt yaş 18).
- `services/town.py`: alışveriş özellikleri **çalışma anında** türetiliyor: persona aralığının merkezi + Big Five + demografi (gelir, yaş, çocuk) + kişisel sapma; persona kimliği korunsun diye aralığın en fazla ±0,12 dışına çıkabiliyor. Katsayılar varsayım olarak belgelendi (ör. sorumluluk → detay ihtiyacı ↑, dürtüsellik ↓; açıklık → yenilik arayışı ↑).
- Klişe önlemi: cinsiyet personadan, meslekten ve hobilerden bağımsız; yaş yalnızca hobileri hafifçe etkiliyor. Türkçe dilbilgisi: şehir ekleri ünlü uyumu ve sert ünsüzle üretiliyor (İstanbul'da, Gaziantep'te, Akçaabat'ta); ekleri düzensiz bileşik adlar listeye alınmadı. Aynı kelimeyle biten hobiler yan yana gelmiyor; "yaşıyor" tekrarı önlendi.
- Doğrulama: `tests/test_town.py` (13 test, toplam 152): dosya = üretici çıktısı, persona sayıları, yaşam bilgisi tutarlılığı (öğrenci ≤ 24, emekli ≥ 60, yurt → öğrenci, çocuk ↔ hane), her personada kadın oranı %30–70, persona ↔ gelir eğilimi, çeşitlilik (500 farklı hikâye, ≥ 25 şehir, ≥ 35 hobi, ≥ 40 meslek ifadesi), hikâyelerde ASCII Türkçe yok, türetilen özellikler sınırlar içinde, her personanın içinde Big Five → özellik ilişkilerinin belgelendiği yönde olması, gelir → fiyat hassasiyeti. Örnek hikâyeler elle okundu.

**12b ✅ Motor v2** (`feat/engine-v2`)
- `services/engine.py`: her sakin için fiyat dışı uyum (v1'in ağırlık yapısı, fiyat çıkarıldı), **ödeme isteği** (kategori ortalaması × gelir × fiyat hassasiyeti × ürün kalitesi × sakine ve kategoriye sabit log-normal sapma), fayda = sabit + uyum + `β·ln(ödeme isteği / fiyat)` − "çok ucuz" şüphesi (yalnızca fiyat ortalamanın %60'ının altındaysa ve kalite beklentisiyle orantılı) + motivasyon + hedef kitle; `P = sigmoid(fayda + gürültü)`, **30 Monte Carlo turu**. v1'in bot döngüsü (`_generate_bot`, `_purchase_probability`, `_non_buyer_decision`) kaldırıldı.
- **Hedef kitle artık sakinleri etkiliyor:** satıcının hedeflediği yaş/cinsiyet/gelir segmentindeki sakinler + , dışındakiler −; kategorinin geçerli kitle alanlarına uyuluyor (teknolojide yalnızca gelir).
- **B15 tamamen kapandı:** `normalizedProduct.priceFit/priceRisk` artık simetrik formülden değil kasabadan geliyor (fiyatı ödeme isteğini aşan sakinlerin oranı). Niyet skoru, "fiyat hassas kullanıcılar" zayıflık sinyali, fiyat tavsiyesi ve arayüzdeki "Fiyat uyumu" aynı tutarlı değeri kullanıyor. Fiyat tavsiyesi metni yeni anlama göre yazıldı ("Kasabanın %X'i için fiyat, ödemeye razı oldukları tutarın üstünde").
- Yanıta `engineVersion` (2) ve `buyersRange { low, high, runs }` (alıcı sayısının turlar arası %10–%90 aralığı) eklendi; karar dağılımı turların ortalaması, toplamı 500 olacak şekilde yuvarlanıyor. MCP `simulate_product` aralığı da dönüyor. Sabitler, tipik bir ilan v1 ile aynı skor aralığına düşecek şekilde kalibre edildi; hepsi `engine.py`'de belgelenmiş varsayımlar.
- Kalibrasyon (aynı girdiler, fiyat çarpanına göre alıcı): tişört v1 `251 / 256 / 275 / 282 / 293 / 268` (0,3× → 2×; fiyat arttıkça artıyordu) → v2 `282 / 290 / 287 / 263 / 233 / 182`; telefon ve kozmetik de aynı biçimde. Tipik fiyatta skor 57 → 53. Fiyat Hassas Alıcı %53 → %35. Simülasyon ~10 ms.
- Doğrulama: `tests/test_engine.py` (8 test, toplam 160): fiyat düştükçe alıcı artıyor (0,6×–2×), fiyat hassas personanın fiyata tepkisi premium personadan büyük, çok ucuz fiyattan yalnızca kalite odaklı sakinler kaçınıyor, fiyat riski = fiyatın dışında kalan sakin oranı, hedef cinsiyet giyimde etkili ama teknolojide etkisiz, determinizm ve 500 toplamı, yanıtta sürüm ve aralık, 5 fiyatlık tarama < 1 sn. Eski 152 test değişmeden geçti. Puppeteer genel 10/10 ve kategori 10/10 (v1 kaydı ve yeni simülasyonlar birlikte).
- Bilinen: arayüz henüz aralığı ve sürümü göstermiyor (12d); v1 ile kaydedilmiş sonuçlar açılınca "eski motor" notu da 12d'de.

**12c ✅ Kasabanın dinamikleri** (`feat/town-dynamics`)
- **Arkadaşlık ağı** (`town.json` sürüm 2): her sakinin 3–9 arkadaşı (ortalama 5,9), iki yönlü; benzerlik eğilimi (aynı şehir tipi ×3, yaş farkı ≤ 5 ×3). Arkadaşların %61'i aynı şehir tipinde (rastgele olsa ~%37).
- **Ağızdan ağıza yayılma:** 1. hafta doğrudan karar; 2–4. haftalarda arkadaşlarının bir kısmı alan sakinin faydasına `1,1 × sosyallik × (alan arkadaş oranı)` ekleniyor (sosyallik = dışadönüklük ve uyumluluğun ortalaması) ve yalnızca ek olasılıkla dönüşüyor. Alıcı ~%11 artıyor (tişört 263 → 293), tipik skor v1'e daha yakın (56; v1 57). `adoptionCurve` haftalık kümülatif alıcı (ör. 315 → 345 → 348 → 348).
- **Açıklanabilir kararlar:** motor her sakin için fayda bileşenlerini (uyum, fiyat, ucuzluk şüphesi, hedef kitle, motivasyon, arkadaş etkisi, ödeme isteği, en çok sevdiği/sevmediği ürün özelliği) kaydediyor. `services/town_insights.py` bunlardan AI'sız Türkçe gerekçe kuruyor: "Almadı: fiyatı pahalı buluyor (en fazla 149 TL verirdi), ürünün kendisine hitap etmediğini düşünüyor."
- **Kasaba temsilcileri:** 5 sakin, hepsi farklı personadan: en net iki alıcı, gerçekten "bekleyen" biri, en net iki ret; hikâyeleri ve gerekçeleriyle.
- **Segmentler:** yaş bandı, cinsiyet, gelir ve şehir tipine göre alma oranı. Unisex üründe kadın/erkek oranı eşit (%55/%55); hedef cinsiyet verilince ayrışıyor.
- **En etkili iyileştirme:** aynı kasabada tek tek kargo 2 gün, kolay iade, garanti, fiyat −%10 ve +%10 deneniyor (girdi analizi sabit tutularak); alıcı kazancına göre ilk 3. Fiyat artışı yalnızca ciroyu artırıyorsa listeleniyor; her öneri alıcı ve ciro farkını birlikte taşıyor (ör. "Fiyatı %10 düşür" +12 alıcı ama −5.808 TL ciro).
- MCP `simulate_product` artık benimseme eğrisi, iyileştirmeler, segmentler ve temsilcileri de dönüyor. Tam simülasyon ~170 ms (5 ek senaryo dahil); fiyat taraması iyileştirme hesaplamıyor.
- Doğrulama: `tests/test_town_dynamics.py` (10 test, toplam 170): ağ simetrik ve benzerlik eğilimli, yayılma haftadan haftaya alıcı ekliyor ve kapatılınca kimse arkadaş yoluyla dönüşmüyor, segmentler 500'ü kapsıyor ve unisex üründe cinsiyet farksız / hedeflenince ayrışıyor, temsilciler 5 farklı persona ve karar yönünde gerekçe, gerekçe birim testleri, iyileştirmeler yalnızca anlamlı değişiklikleri deniyor ve sıralı, API alanları, tam simülasyon < 1,5 sn.

**12d ✅ Arayüz** (`feat/engine-v2-ui`)
- `components/TownInsights.tsx`: **En etkili 3 değişiklik** (alıcı ve ciro farkı yan yana; ciro düşüyorsa "ama ciro … TL düşer" mercan metinle), **Ağızdan ağıza** (4 haftalık kümülatif alıcı, tek seri `--accent`, hover/odakta haftanın değeri ve o haftaki artış, özet cümlesi), **Kim alıyor?** (yaş/cinsiyet/gelir/yaşadığı yer için yatay çubuklar, değerler metin renginde, hover'da sakin sayısı, "Tablo olarak göster"), **Kasabadan 5 sakin** (ad, yaş · şehir · meslek, persona noktası, karar chip'i, gerekçe, katlanabilir hikâye, "sakinler kurgusaldır" notu; `flex-wrap` ile 3 + 2, boş hücre yok).
- "Tahmini alıcı" KPI'ı aralığı gösteriyor: `276 (260–289)`; açıklama `title`'da (30 turun %80'i). Mobilde aralık alt satırda.
- `engineVersion` olmayan kayıtta (v1) en üstte "Eski motor" notu; kasaba kartları yalnızca veri varsa çiziliyor.
- `personaColor` artık Türkçe etiketi de tanıyor (sakinler persona adını etiket olarak taşıyor). Markdown raporu: alıcı aralığı, eski motor notu, "En etkili değişiklikler".
- DESIGN.md: §7 Tailwind 4'e göre düzeltildi (yasak artık `tailwind.config`, grafik kütüphanesi eklenmez); §4'e "tek serili grafik" ve "sakin kartı" kalıpları, §9.3'e yeni satırlar.
- Doğrulama: tsc + eslint temiz. Puppeteer (gerçek backend, AI kapalı): 1280 açık/koyu ve 375'te yatay taşma yok, konsol hatası yok; haftalık çubuğa klavyeyle odaklanınca "2. hafta: toplam 273 alıcı (o hafta +24)"; segment tablosu 13 satır; v2 alanları silinmiş yanıtla v1 kaydında not görünüyor, kasaba kartları ve aralık gizleniyor. Ekran görüntüleri elle incelendi. Backend değişmedi.
- Yeni bulgu: F21 (sakin kartında meslek cümle parçası olarak geliyor).

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
İki alt faza bölündü: 13a kategori sistemi, 13b ekran.

**13a ✅ Kategori aileleri** (`feat/category-families`)
- **Karar (kullanıcı, 2026-10-17):** 12 aile + "Diğer": Giyim; Ayakkabı; Çanta ve aksesuar; Kozmetik ve kişisel bakım; Telefon ve tablet; Bilgisayar; Ses ve giyilebilir; Elektronik aksesuar; Küçük ev aletleri; Ev ve yaşam; Anne, bebek ve oyuncak; Spor ve outdoor. Aileler pazar yerlerinin üst menülerine denk geliyor, böylece sayfanın kategori yolu doğrudan eşleşiyor. Süpermarket, pet, otomotiv, kitap bilerek dışarıda (tekrar eden alım ve düşük fiyat davranışı mevcut personalarla iyi temsil edilmiyor).
- **Tek veri dosyası:** `app/data/category_rules.json` v3 (`frontend/data/` altında aynı kopya; bir test ikisini karşılaştırıyor). Aile, motorun kurallarını taşıyor: ağırlıklar, hedef kitle alanları, form alanları, kalite alanları (`qualityFields`), önemli alanlar, ayırt edici terimler, sezon zirvesi, trend etkisi, tavsiye metinleri. Alt tür ailesini devralıyor ve yalnızca farklı olanı eziyor (en az ad, tanıma kelimeleri, ortalama fiyat). Aile kimliği de kategori olarak geçerli (alt tür bilinmiyorsa). 13 aile, 52 alt tür.
- **Geriye uyum:** eski 13 kimlik geçerli; `tisort`, `telefon` vb. alt tür, `ayakkabi`, `canta`, `kozmetik` aile kimliği oldu. Bütün değerleri aynen taşındı. Kod içindeki kategori dalları (`_score_quality`, `CATEGORY_TERMS`, `IMPORTANT_FIELDS`, `TECH`/`CLOTHING`… kümeleri, tavsiye metinleri) veriye taşındı ve `services/categories.py` katalog modülünden okunuyor.
- **Referans fiyat:** "Diğer"in ortalama fiyatı yok. Yeni isteğe bağlı `marketPrice` alanı (benzer ürünlerin ortalama fiyatı) her kategoride ortalamayı ezer; Diğer'de boşsa fiyat nötr kabul edilir. Fiyat eğrisi, ±%10 iyileştirmeleri ve A/B'de referans ilk fiyata sabitleniyor (`categories.anchored`); yoksa her fiyat kendisiyle karşılaştırılırdı. `marketPrice` simülasyon tohumuna girmiyor (fiyat gibi).
- **Linkten tanıma:** sayfanın schema.org `BreadcrumbList`'i ve kendi kategori metni (en özel parçadan başlayarak) → ürün başlığı → AI tahmini → "Diğer". Türkçe isim tamlamasında asıl isim sonda geldiği için ("Laptop Çantası", "iPhone Kılıfı") en son biten eşleşme kazanıyor; aynı yerde daha uzun kelime ("akıllı bileklik" > "bileklik"). Yol aileyle bitiyorsa ("Giyim") başlıktaki alt tür kullanılıyor. Marka adları tanıma kelimesi değil ("Samsung TV" telefon sanılmıyor). Yanıta `category_confidence` (high/medium/low) ve `category_source` eklendi. Eskiden tanınmayan her şey sessizce tişört oluyordu.
- **Girdi analizi:** kategori uyumunda yalnızca **başka ailelerin** terimleri rekabet ediyor (gömlek ile tişörtün karışması uyarı sebebi değil); kategori önerisi de yalnızca başka aileyi gösteriyor ve arayüzde Türkçe adıyla. Marka uyarısı, markası "önemli alan" olan bütün kategorilerde (kulaklık da artık uyarı alıyor).
- **Form:** "Kategori" (12 aile + Diğer, ikonlu) ve "Ürün türü" (alt türler + "Genel / emin değilim"); alanlar, örnek ad ve açıklama ipucu veriden. Hedef kitle alanları kategorinin `applicableAudienceFields`'ından (ör. küçük ev aletlerinde cinsiyet yok); kargo alanı tek kalırsa satırı kaplıyor. Diğer'de "Benzer ürünlerin ortalama fiyatı" alanı. Linkten okununca kategori notu: kaynaktan okunduysa bilgi, tahminse "kontrol edin" kutusu. Yeni özellik alanları: `power`, `ageGroup`; link tablosunda "güç", "yaş grubu", "uyumlu model" eşleşiyor.
- **MCP:** `list_categories` aileleri alt türleriyle dönüyor; `simulate_product` `marketPrice` kabul ediyor.
- **Doğrulama:** kod değişmeden önce 13 eski kategori × 3 farklı girdiyle (AI kapalı) bütün yanıtların altın kaydı alındı. Yeniden yapılanmadan sonra skor, alıcı, persona, sakin, segment ve iyileştirmeler 39 senaryonun hepsinde birebir aynı; farklar yalnızca bilinçli olanlar (kategori adı "Giyim / Tişört" biçiminde, kulaklıkta marka uyarısı, link tanıma). Bu karşılaştırma iki hatayı yakaladı: yeni boş alanlar simülasyon tohumunu değiştiriyordu (eski girdilerin kalabalığı değişiyordu) ve yeni ailelerdeki genel terimler ("garanti", "malzeme") eski kategorilerin uyumunu düşürüyordu. `tests/test_categories.py` yeniden yazıldı (110 test; toplam 250): veri dosyasının şekli ve her kategorinin eksiksizliği (ağırlıklar; form, önemli ve kalite alanlarının gerçek özellik alanları olması), eski değerler, frontend kopyası, 8 kategoride uçtan uca simülasyon (uyum ≥ 0,6, yanlış öneri yok), bilinmeyen kategoriye 422, aile kimliğiyle simülasyon, Diğer'de referans fiyat ve fiyat eğrisi, alt tür sezon zirvesi, 19 başlık ve 6 kategori yolu tanıma vakası, JSON-LD breadcrumb. tsc/eslint temiz. Puppeteer (gerçek backend, AI kapalı, link yanıtı sahte): aile → alt tür → alanlar, Diğer'de referans fiyat, linkten kategori + not + alan doldurma, simülasyon sonucu, 375 px'te taşma yok, konsol hatası yok.
- Tarayıcıda bulunan hatalar: aile değişince alt tür listesi yeniden kurulurken Radix Select boş değer gönderiyor, form da bunu "bilinmeyen → Diğer" sanıyordu (boş değer artık yok sayılıyor). Seçim listesindeki ikon, Tailwind'in `svg { display: block }` kuralı yüzünden kendi satırına düşüyordu.
- Yeni bulgular: F22, F23.

**13b ✅ Ekran** (`feat/product-entry-v2`)
- **Denetim (önce):** `impeccable audit` + `critique`. Eleştiri tek bağlamda yapıldı (yönerge iki ayrı alt ajan istiyor; bu oturumda alt ajan ancak kullanıcı isterse açılıyor). Detektörün statik taraması temiz; URL taraması tam `puppeteer` paketi istediği için kendi Puppeteer ölçümüyle yapıldı. Bulgular: **P1** sessiz varsayılanlar (sezon "Yaz", kalıp "Regular", yaş "18-30" seçilmeden simülasyona giriyordu); **P1** linkten okununca neyin dolduğu görünmüyordu ve doldurma `setTimeout` ile DOM'a yazmaya dayanıyordu; **P1** ~20 alan aynı anda, hiçbirinin skora etkisi görünmüyordu, mobilde yapışkan çubuk ekranın %16'sı; **P2** alanların odak göstergesi yalnızca kenar rengiydi (DESIGN §6 halka istiyor), "Linkten oku" ve iade/garanti 40 px, görsel silme 28 px. İyi: bütün kontrollerin erişilebilir adı vardı, başlık sırası doğru, token'lar tutarlı, 375 px'te taşma yok.
- **Akış:** "Linkten başla" kartı en üstte (Enter ile okur); okununca "N alan dolduruldu" ve kategori notu; doldurulan alanlarda "linkten" işareti, kullanıcı değiştirince kalkar. Linkin yoksa aynı sayfada elle doldurma. "Son ürününden başla": son 3 simülasyonun girdisi tek tıkla forma.
- **Canlı Hazırlık paneli:** yeni `POST /api/draft-check` (AI yok, deterministik, ~350 ms, `RATE_LIMIT_DRAFT_PER_MIN`=60). Yarım taslağı kabul ediyor (ad, uzun açıklama gerekmez), tahmini skoru ve her boş alanın, iade/garanti/2 gün kargonun ve daha uzun açıklamanın skora katkısını dönüyor. Bütün denemeler kategoriye sabit bir kalabalıkla koşuyor (`simulate_core(seed=…)`), yani "+X" o alanın kendi etkisi; sezon için nötr "Dört mevsim" deneniyor (zirve sezon kazancı şişirirdi). Girdi zayıfken skor tavanı (35/48/55; `simulation_service.INPUT_CAPS`, tek yerde) sebebiyle gösteriliyor ve tavan kalkana kadar alan önerisi verilmiyor; aksi hâlde her alan aynı küçük kazancı gösteriyordu. Kazançlar yuvarlanmamış, tavanlı skordan (`score_exact`) hesaplanıyor; tam sayı skorla hepsi "+1" çıkıyordu.
- **Form:** kontrollü duruma geçti (`lib/productDraft.ts`: değerler ↔ istek/taslak dönüşümü, zorunlu alan listesi, yerel taslak). Bölümler: 1 Ürün, 2 {Tür} özellikleri, 3 Kitle ve satış; zorunluları dolunca "tamam". Boş alanların etiketinde "+X puan" rozeti; paneldeki öneriye tıklayınca alana kayıp odaklanıyor. Özellik seçimleri "Seçin" ile başlıyor ("Belirtilmedi" ile temizleniyor), yaş "Tüm yaşlar". Açıklamada kelime sayacı. "Benzerlerinin ortalama fiyatı" artık her kategoride isteğe bağlı (kullanıcı kararı); ipucu kategori ortalamasını söylüyor. Taslak tarayıcıda otomatik saklanıyor (yüklenen fotoğraflar hariç), yenilemede geri geliyor; "Formu temizle". Mobilde tek satırlık yapışkan çubuk (skor + öneri sayısı + Başlat).
- **Erişilebilirlik:** `.field` odakta 2 px halka (DESIGN §6); düğme ve seçenekler ≥ 44 px; görsel silme 36 px.
- **Fazlalık denetimi (sonra):** `ponytail-review` üç küçük kesinti buldu (işe yaramayan üçlü ifade, gereksiz tip gevşetmesi, gereksiz export); uygulandı.
- **Doğrulama:** `tests/test_draft.py` (5 test, toplam 255): fiyatsız taslakta skor yok, dolu alan öneri almıyor ve kazançlar sıralı, bir alanın kazancı o alanı doldurunca oluşan farkla tutarlı, deterministik ve gevşek doğrulama, tavanlı taslakta alan önerisi yok ama sebep ve uyarılar var. tsc/eslint/ruff temiz. Puppeteer (gerçek backend, AI kapalı, link yanıtı sahte): boş form → yazınca tahmin (53) ve 5 öneri, alan rozetleri, öneriye tıklayınca odak, yenilemede taslak geri, linkten okuma (5 alan + işaretler + kategori notu), gönderme, 1280 açık/koyu ve 375 px, taşma yok, konsol hatası yok.
- Bulunan hata: 13b'nin başında açık kalan backend süreci yeni ucu görmüyordu (yeniden başlatma gerekti); kodda sorun değil.

### Faz 14 ✅: Link okuma v2 (`feat/link-reader-v2`)
- [x] `product_link_service.py` (1.541 satır) **sorumluluğa göre** `app/services/link_reader/` paketine bölündü: `fetch` (güvenli HTTP), `html_parse`, `structured` (JSON-LD, meta, tablo, puan), `images`, `ai`, `reader`; Serper araması `app/services/serper.py`'ye. Bölme mekanik (üst düzey bloklar `ast` ile taşındı, importlar açık); eski 13 kategorinin 39 altın senaryosu birebir aynı.
- [x] **Tek yanıt modeli (F22):** servis kendi dataclass'ı yerine `models/product_link.py`'deki Pydantic modelini dönüyor. Yan bulgu: MCP'nin `read_product_link` aracı sonuç üzerinde `.model_dump()` çağırıyordu; dataclass'ta bu yok, yani araç gerçek bir linkte **çökerdi** (testler yalnızca hata yolunu deniyordu). Düzeldi, testi eklendi.
- [x] **`POST /api/read-product-page`**: `{html}` (eklenti, kaydedilmiş sayfa; en fazla 3 MB) ya da `{text}` (Ctrl+A ile kopyalanmış sayfa metni; en fazla 200 KB), isteğe bağlı `url` yalnızca etiket (http/https değilse atılır, hiç indirilmez). Sunucu hiçbir adrese gitmediği için SSRF yüzeyi yok. HTML, link okuyucuyla aynı yoldan geçiyor (`read_html`). Metin okuyucu kural tabanlı: ürün adı fiyatın hemen üstündeki satır (menüler önce gelir), fiyat kargo/taksit/kupon satırları atlanarak ilk TL, açıklama uzun satırlar, puan "4,7 · 2.031 Değerlendirme" kalıbı; AI açıksa eksikleri tamamlıyor.
- [x] **Puan ve değerlendirme sayısı:** schema.org `aggregateRating` (JSON-LD) ve microdata (`itemprop`), 5 üzerinden normalize (10'luk puan → 5'lik). Microdata değerleri meta etiketlerinden ayrı tutuluyor; aynı sözlükte olsalar `ratingValue` fiyat adayı sayılırdı. "Malzeme" başlığı artık `material` alanına eşleniyor.
- [x] **Sosyal kanıt (Faz 12 girdisi):** istekte isteğe bağlı `rating`, `reviewCount`. Etki yalnızca marka güvenine: `0,15 × yön × güç`; yön 4,0★ nötr (5★ +1, 3★ −1), güç yorum sayısının logaritması (10 → ⅓, 100 → ⅔, ~1.000 → tam). Boşken hiçbir şey değişmiyor ve tohuma girmiyor. Varsayımlar `normalization_service.py`'de.
- [x] **Arayüz:** link okunamayınca (ya da boş dönünce) "Sayfanın metnini yapıştır" alanı kendiliğinden açılıyor; `<` ile başlayan yapıştırma kaynak kodu sayılıyor. Okunan puan durum satırında (★ 4,7 · 2.031 değerlendirme). 3. bölümde isteğe bağlı "Mağaza puanı" ve "Değerlendirme sayısı" (linkten gelince işaretli). MCP `simulate_product` puanı kabul ediyor.
- [x] **Kayıtlı sayfa testleri:** `tests/fixtures/links/` içindeki her `.html`/`.txt` yanındaki `.expected.json` ile karşılaştırılıyor (yalnızca yazılan alanlar); testler sırasında indirme yapılırsa test düşer. Şimdilik 4 örnek **kurgusal ama standartlara uygun** sayfa: JSON-LD + BreadcrumbList + puan, Open Graph + microdata (10'luk puan) + özellik tablosu, sayfa içi Next.js JSON, kopyalanmış sayfa metni.
- **Bilerek yapılmayan: siteye özel okuyucular.** Pazar yerlerinin güncel sayfa yapısını görmeden kural yazmak, sahte bir güven verirdi; sunucudan bu siteleri taramak da çoğunlukla kullanım şartlarına aykırı. Okuyucu zaten siteden bağımsız standartları (JSON-LD, Open Graph, microdata, tablolar, sayfa içi JSON) okuyor. Gerçek kayıtlı sayfalar gelince her site için `.expected.json` yazılıp eksik kalan alanlar kurala dönüştürülecek; uzun vadeli yol eklenti (Faz 18) ve `read-product-page`.
- **Doğrulama:** `tests/test_link_reader.py` (14 test; toplam 271): 4 kayıtlı sayfa, uç (HTML/metin, tam olarak bir kaynak, garip URL atılıyor), MCP link aracının sözlük dönmesi, sosyal kanıt eğrisi, puanın güvene ve uçtan uca alıcıya etkisi. ruff/tsc/eslint temiz. Puppeteer (gerçek backend, AI kapalı; yalnızca link hatası taklit): link hatasında yapıştırma alanı açılıyor, metinden ad/fiyat/puan/sayı doluyor, kategori tahmini notu, 1280 ve 375 px'te taşma yok, konsol hatası yok.
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
