# Yol Haritası

- **Repo:** [Serdarsahinn05/btk26-pazarlab-ai](https://github.com/Serdarsahinn05/btk26-pazarlab-ai). `upstream` = OsmanerdemDutar/btk26-pazarlab-ai, salt okunur.
- **Akış:** Her faz kendi dalında yapılır, PR veya merge ile `main`'e girer.
- **Kaynaklar:** Ayrıntılar [SECURITY_AUDIT.md](SECURITY_AUDIT.md), [IMPROVEMENTS.md](IMPROVEMENTS.md) ve [../DESIGN.md](../DESIGN.md) dosyalarında.

## Genel bakış

| Faz | Dal | Kapsam | Efor | Durum |
|---|---|---|---|---|
| 0 | – | Repo senkronizasyonu | 15 dk | ✅ |
| 1 | `chore/docs-roadmap` | Dokümanlar, repo temizliği | 0,5 gün | ✅ |
| 2 | `fix/security-hardening` | S1–S11 | 1–1,5 gün | ⬜ |
| 3 | `fix/core-bugs` | B1–B7, F1–F7, temel testler | 1 gün | ⬜ |
| 4 | `feat/editorial-redesign` | DESIGN.md uygulaması, F8–F10 | 2–3 gün | ⬜ |
| 5a | `feat/history-share` | Geçmiş, paylaşım, export | 1 gün | ⬜ |
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

## Faz 2: Güvenlik sertleştirmesi
Kabul kriteri: SECURITY_AUDIT.md'deki doğrulama listesinin tamamı geçer.

- [ ] **S2** CORS allowlist: `CORS_ALLOWED_ORIGINS`, credentials kapalı. (`main.py`)
- [ ] **S11a** `load_dotenv(override=False)`.
- [ ] **S7** Handler'lar `def` olur. (`api/*.py`)
- [ ] **S4** Pydantic sınırları, kategori Enum'u, gövde boyutu middleware'i. (`models/product.py`)
- [ ] **S1** SSRF: redirect kapalı, IP pinleme, port kısıtı, tek tip hata, toplam süre ≤ 15 sn. (`product_link_service.py`)
- [ ] **S3** `slowapi` rate limit, `maxOutputTokens`, model zinciri ≤ 2.
- [ ] **S5** Prompt'lar system + `<data>` JSON yapısına geçer, Serper başlıkları kırpılır. (`graph.py`)
- [ ] **S6** Genel hata mesajları + `X-Request-ID`.
- [ ] **S8** `x-goog-api-key` başlığı, anahtar logu kaldırılır.
- [ ] **S9** `aiRoleplayPrompt` response'tan çıkar, log injection düzeltilir.
- [ ] **S10** Prod'da `/docs` kapalı.
- [ ] **S11b** Dockerfile'larda `USER` ve `HEALTHCHECK`; bağımlılıklar pinlenir; `langchain` kaldırılır; compose portları `127.0.0.1`'e bağlanır.
- [ ] `.env.example` güncellenir: `CORS_ALLOWED_ORIGINS`, `GEMINI_MODEL`, `ENV`, `RATE_LIMIT_*`.
- [ ] `backend/tests/test_security.py`: SSRF vakaları, CORS, 422 sınırları, 429.

## Faz 3: Çekirdek hatalar
Kabul kriteri: Gerçek bir anahtarla `/api/simulate` yanıtında `aiInsights` şablon değil, gerçek LLM çıktısı (log'da `ai_used=true`). Backend kapalıyken UI görünür bir hata gösterir.

- [ ] **B1** `llm_client.py`: tek Gemini istemcisi; üç çağrı yolu buna taşınır.
- [ ] **B2** Çift input analizi kaldırılır.
- [ ] **B3** Ortak kategori Enum'u.
- [ ] **B4–B6** Graph bir kez derlenir, ölü kod ve kopya modeller temizlenir.
- [ ] **F1** Hata toast'u + "Tekrar dene"; analiz hatası simülasyonu bloklamaz; axios timeout.
- [ ] **F2–F3** Tailwind v4 sınıfları v3'e çevrilir, geçersiz `rgba(var())` düzeltilir, `@tailwindcss/typography` eklenir.
- [ ] **F4** Landing kaydırması ve çift padding düzeltilir.
- [ ] **F5** Gerçek health/model bilgisi; sabit sayılar kaldırılır.
- [ ] **F6–F7** Persona renkleri index ile eşlenir; tipler güncellenir.
- [ ] **B7** pytest altyapısı: deterministiklik ve skor aralığı testleri, LLM mock'lu graph testi.

## Faz 4: Editoryal yeniden tasarım
Kabul kriteri: DESIGN.md'deki tüm kalıplar uygulanmış; bileşenlerde ham renk sınıfı kalmamış (`rg "zinc-|violet-|text-white|rgba\(" frontend/components frontend/app` boş döner, `ui/` hariç); her iki tema ve 375 px genişlik kontrol edilmiş; `impeccable audit` ardından `ponytail-review` çalıştırılmış.

1. [ ] **Token'lar:** `globals.css` (`:root` + `.dark`), `tailwind.config.ts` (renkler, `fontFamily`), `layout.tsx` (Fraunces, `defaultTheme="system"`), defter zemini. Neon, glass ve glow sınıfları silinir.
2. [ ] **Kabuk:** `LayoutShell`, `Sidebar` ve `StatusBar` sade bir üst bara dönüşür: marka, sekmeli nav, tema düğmesi, gerçek API durumu. Mobilde sekmeler yatay kaydırılabilir.
3. [ ] **Skor bileşenleri:** `RingChart` ve `SegmentRing` (saf SVG, ek kütüphane yok). `OverallScoreCard` ile `DecisionDistributionChart` birleşir. Persona halka kartları tıklanınca tartışmaya gider (flash efekti). Normalize skorlar ince barlarla gösterilir.
4. [ ] **İçerik kartları:** Kanal önerileri, zayıflıklar ve benchmark renkli başlıklı karta; tartışma mesajları sol kenarlı satır kalıbına; `AnalysisWarning` not kutusuna veya erişilebilir dialog'a geçer.
5. [ ] **Form:** `ProductForm` input stilleri, Türkçe etiketler, `aria`, klavyeyle erişilebilir yükleme alanı.
6. [ ] **Landing:** Fraunces hero ve italik alt satır, mono sayaçlar (500 · 12 · 10), örnek segmentli halka, numaralı adımlar.
7. [ ] **Hareket ve erişilebilirlik:** reduced-motion, odak halkaları, kontrast kontrolü.
8. [ ] **Temizlik (F9–F10):** kullanılmayan bileşen ve bağımlılıklar silinir, `output: 'standalone'`.

## Faz 5: Yeni özellikler
- [ ] **5a** Geçmiş: önce localStorage ve JSON dışa/içe aktarma, sonra SQLite ve `/r/{id}` paylaşım linki. Markdown/print rapor.
- [ ] **5b** `/api/price-sweep` endpoint'i ve eğri grafiği (SVG); A/B karşılaştırma görünümü.
- [ ] **5c** `/api/persona-chat` (SSE) ve canlı graph ilerlemesi (SSE).
- [ ] **5d** GitHub Actions: ruff, pytest, lint, build, `pip-audit`, `npm audit`; Dependabot.

## Riskler
- **Gemini model adları sık değişiyor.** B1'de model env'den okunacak; varsayılan seçilirken o günkü güncel model listesi kontrol edilecek.
- **Tam yeniden tasarım geniş bir değişiklik.** Faz 4'teki adımlar ayrı commit'ler halinde ilerleyecek; her adımdan sonra `npm run build` çalıştırılacak.
- **SSRF düzeltmesi bazı site okumalarını bozabilir.** cloudscraper redirect zinciri değişiyor; Trendyol, Hepsiburada ve Amazon TR ile elle test edilecek.
