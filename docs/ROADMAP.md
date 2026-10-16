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

## Faz 3: Çekirdek hatalar
Kabul kriteri: Gerçek bir anahtarla `/api/simulate` yanıtında `aiInsights` şablon değil, gerçek LLM çıktısı (log'da `ai_used=true`). Backend kapalıyken UI görünür bir hata gösterir.

- [ ] **B1** `llm_client.py`: tek Gemini istemcisi; üç çağrı yolu buna taşınır.
- [ ] **B2** Çift input analizi kaldırılır.
- [ ] **B3** Ortak kategori Enum'u.
- [ ] **B4–B6** Graph bir kez derlenir, kalan ölü kod (`graph.py:~480` çift log doğrulaması, `build_ai_insights`, `scoring_utils`) ve kopya modeller temizlenir.
- [ ] **B8–B9** Geliştirme ortamı: bozuk `backend/venv` yeniden kurulur, Python sürümü README'de netleştirilir.
- [ ] **F1** Hata toast'u + "Tekrar dene"; analiz hatası simülasyonu bloklamaz; axios timeout.
- [ ] **F2–F3** Tailwind v4 sınıfları v3'e çevrilir, geçersiz `rgba(var())` düzeltilir, `@tailwindcss/typography` eklenir.
- [ ] **F4** Landing kaydırması ve çift padding düzeltilir.
- [ ] **F5** Gerçek health/model bilgisi; sabit sayılar kaldırılır.
- [ ] **F6–F7** Persona renkleri index ile eşlenir; tipler güncellenir.
- [ ] **B7** pytest altyapısı: deterministiklik ve skor aralığı testleri, LLM mock'lu graph testi.

## Faz 4: Editoryal yeniden tasarım
Kabul kriteri: DESIGN.md'deki tüm kalıplar uygulanmış; bileşenlerde ham renk sınıfı kalmamış (`rg "zinc-|violet-|text-white|rgba\(" frontend/components frontend/app` boş döner, `ui/` hariç); her iki tema ve 375 px genişlik kontrol edilmiş; `impeccable audit` ardından `ponytail-review` çalıştırılmış.

0. [ ] **Yerleşim:** DESIGN.md §9'daki yeni dashboard düzeni (rapor akışı, yan panel kaldırılır, tek kaydırma alanı, iki sütunlu form). Detaylar IMPROVEMENTS.md F11'de.
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
