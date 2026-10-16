# Yol Haritası

- **Repo:** [Serdarsahinn05/btk26-pazarlab-ai](https://github.com/Serdarsahinn05/btk26-pazarlab-ai). `upstream` = OsmanerdemDutar/btk26-pazarlab-ai, salt okunur.
- **Akış:** Her faz kendi dalında yapılır, PR veya merge ile `main`'e girer.
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
| 5b | `feat/price-sweep-ab` | Fiyat eğrisi, A/B karşılaştırma | 1 gün | ⬜ |
| 5c | `feat/persona-chat-sse` | Persona sohbeti, canlı ilerleme | 1,5 gün | ⬜ |
| 5d | `ci/pipeline` | CI, bağımlılık taraması | 0,5 gün | ⬜ |

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
- [ ] **5b** `/api/price-sweep` endpoint'i ve eğri grafiği (SVG); A/B karşılaştırma görünümü.
- [ ] **5c** `/api/persona-chat` (SSE) ve canlı graph ilerlemesi (SSE).
- [ ] **5d** GitHub Actions: ruff, pytest, lint, build, `pip-audit`, `npm audit`; Dependabot.

## Riskler
- **Gemini model adları sık değişiyor.** B1'de model env'den okunacak; varsayılan seçilirken o günkü güncel model listesi kontrol edilecek.
- **Tam yeniden tasarım geniş bir değişiklik.** Faz 4'teki adımlar ayrı commit'ler halinde ilerleyecek; her adımdan sonra `npm run build` çalıştırılacak.
- **SSRF düzeltmesi bazı site okumalarını bozabilir.** cloudscraper redirect zinciri değişiyor; Trendyol, Hepsiburada ve Amazon TR ile elle test edilecek.
