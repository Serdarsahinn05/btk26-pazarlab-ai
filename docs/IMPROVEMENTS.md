# İyileştirme Önerileri

Bu dosya iki bölümden oluşuyor: (A) mevcut koddaki hatalar ve borçlar, (B) yeni ürün özellikleri.
Önceliklendirme [ROADMAP.md](ROADMAP.md) dosyasında. Güvenlik bulguları ayrı olarak [SECURITY_AUDIT.md](SECURITY_AUDIT.md) dosyasında.

## A. Hatalar ve teknik borç

### Backend

| # | Etki | Sorun | Öneri |
|---|---|---|---|
| B1 | **Kritik** | AI katmanı büyük olasılıkla her seferinde sessizce yedek şablona düşüyor. Varsayılan model `gemini-1.5-flash-latest` (`ai_insight_service.py:107`), `graph.py:29-33`'teki EOL engel listesinde duruyor. `generate_insights` ve `analyze_input` hataları loglamadan yutuyor. *Düzeltme notu (Faz 2):* Pinlenen `langchain-google-genai==4.3.7`, `GEMINI_API_KEY`'i kendisi okuyor; yani graph tarafındaki "anahtar verilmiyor" sorunu bu sürümde geçerli değil. Sorun, `ai_insight_service` ve `input_analysis` yolundaki eski model adı. | Tek bir `app/services/llm_client.py` yaz: model env'den gelsin, öncelik sırası olsun, yalnızca `gemini*` modelleri seçilsin, anahtar açıkça verilsin, timeout ve `maxOutputTokens` olsun, hatalar loglansın. Üç ayrı çağrı yolunu (graph, ai_insight, product_link) bu istemcide birleştir. Response'a `aiUsed: true/false` ekle ki UI fallback'i açıkça gösterebilsin. |
| B2 | Orta | Input analizi iki kez yapılıyor. Frontend `/analyze-input` sonucunu gönderiyor, `input_analysis_node` bunu yok sayıp yeniden çağırıyor (`graph.py:207-212`). | İstemciden gelen `inputAnalysis` şemaya uyuyorsa yeniden çağırma. |
| B3 | Orta | `_map_category` 15 kategori döndürüyor (`product_link_service.py:1498`), `category_rules.json` ise 10 kategori tanıyor. `ayakkabi`, `canta`, `kozmetik` gibi değerler `tisort`a düşüyor. | `app/models/category.py` içinde tek bir Enum tanımla; link okuyucu, form ve kurallar dosyası bu Enum'u kullansın. |
| B4 | Düşük | LangGraph her istekte yeniden derleniyor (`graph.py:508`). | Modül seviyesinde bir kez derle. |
| B5 | Düşük | Ölü kod: ~~`MOCK_SIMULATION_RESPONSE`~~ ve ~~`debate_node` v1~~ (Faz 2'de silindi). Kalanlar: `run_agentic_simulation` içinde hemen üzerine yazılan `validated_logs` bloğu, `build_ai_insights`, `scoring_utils` içindeki kullanılmayan fonksiyonlar, `trend_mock_data.json`, `ScrapingError` alt sınıflarından `AIQuotaError`. | Sil. |
| B6 | Düşük | İki ayrı Gemini model yöneticisi ve aynı yapının hem dataclass hem Pydantic sürümü (`ProductLinkReadResponse`) var. | B1 kapsamında birleştir. |
| B7 | Düşük | ~~Test yok.~~ Faz 2'de `backend/tests/` ve 32 güvenlik testi eklendi. Hâlâ eksik: skor ve deterministiklik testleri, graph'ın LLM mock'lu testi. `backend/scratch/test_backend.py` canlı Trendyol sayfasına istek atan elle çalıştırılan bir betik. | Faz 3'te çekirdek testleri ekle; `scratch/` klasörünü sil ya da `tests/manual/` altına taşı. |
| B8 | Orta | `backend/venv` bozuk: artık var olmayan `C:\Users\Serdar ŞAHİN\...\Python313` yolunu gösteriyor. | Klasörü sil, `python -m venv venv` ile yeniden kur. |
| B9 | Orta | Pinli `pydantic==2.10.4`, Python 3.14 için hazır wheel sunmuyor; kurulum Rust derlemesi isteyip başarısız oluyor. Docker 3.11 kullanıyor. | README'de Python 3.11–3.13'ü belirt (`uv venv --python 3.11` çalışıyor). İleride pydantic/fastapi sürümlerini birlikte yükselt. |
| B10 | Düşük | `RateLimit` IP başına bir kayıt tutuyor ve eski IP'leri hiç temizlemiyor. Uzun süre çalışan bir sunucuda bellek yavaşça büyür. | Sözlük boyutu bir eşiği aşınca süresi dolmuş kayıtları sil, ya da Redis'e geç. |

### Frontend

| # | Etki | Sorun | Öneri |
|---|---|---|---|
| F1 | Yüksek | Hatalar yalnızca `console.error` ile yutuluyor (`app/dashboard/page.tsx:114-136`). Kullanıcı hiçbir şey görmüyor. `/analyze-input` başarısız olursa simülasyon hiç başlamıyor. | Durum toast'u (DESIGN.md §5) ve "Tekrar dene" düğmesi ekle. Analiz hatasında uyarıyı atlayıp simülasyona devam et. axios'a `timeout: 60000` ver. |
| F2 | Yüksek | Tailwind v4 sözdizimi v3 projede çalışmıyor: `ring-3`, `rounded-4xl`, `size-3!`, `data-horizontal:`, `--radius-md` (`components/ui/*`). Buton ve input'larda **odak halkası görünmüyor**. | Bu sınıfları v3 karşılıklarına çevir. |
| F3 | Orta | `rgba(var(--primary),x)` geçersiz bir değer (8 yerde), çünkü token HSL. `prose` sınıfı çalışmıyor; `@tailwindcss/typography` kurulu değil. `text-neon-green`, `font-heading`, `custom-scrollbar` sınıfları tanımsız. | Yeniden tasarımda token'larla değiştir, typography eklentisini kur. |
| F4 | Orta | `layout.tsx:27` içindeki `overflow-hidden h-screen` landing sayfasında kaydırmayı engelliyor olabilir. Dashboard'da padding iki kez uygulanıyor (`page.tsx:152`). | Kaydırmayı yalnızca dashboard kabuğuna taşı, fazla padding'i kaldır. |
| F5 | Orta | Sahte durum verisi gösteriliyor: StatusBar'da "API: CONNECTED (12ms)", "GEMINI-1.5-FLASH", "TR-IST". `categoryCount = 10` ve "500 Bot" metinleri sabit yazılmış. | `checkHealth` fonksiyonunu kullan, model adını `/api/health` yanıtından al, sayıları response'tan oku. |
| F6 | Orta | `DebateLogs.personaColors` yalnızca 5 isim içeriyor. Bunlardan biri ("Detayci Analist") backend'de yok. 12 personanın 7'si gri yedek renkte görünüyor. | Rengi isimle değil persona index'iyle eşle (`--persona-1..12`). |
| F7 | Düşük | Tip eksikleri: frontend `SimulationResponse` tipinde `weaknessSignals` yok. Formda `yedek_parca_tamir` seçeneği yok. | `types/index.ts` dosyasını güncelle. |
| F8 | Düşük | Erişilebilirlik: ikon düğmelerinde `aria-label` yok. Modalda `role="dialog"`, odak tuzağı ve Esc desteği yok. Yükleme kutusuna klavyeyle ulaşılamıyor. Pek çok yerde 8–10 px metin var. Animasyonlar `prefers-reduced-motion` ayarına uymuyor. Türkçe karakterler eksik ("Urun Adi", "Kiyafet"). | Yeniden tasarım sırasında DESIGN.md §7'ye göre düzelt. |
| F9 | Düşük | Kullanılmayan kod: `AiFeedbackPanel`, `ModeToggle`, `ui/skeleton`, `ui/tabs`, `recharts`, `tw-animate-css`, Geist fontları, `mockSimulationResponse`. `shadcn` ve `@types/canvas-confetti` `dependencies` altında duruyor. | Sil ya da `devDependencies`'e taşı. |
| F10 | Düşük | ~~`next.config.mjs` boş, Docker imajı tüm `node_modules`'ü kopyalıyor.~~ | Faz 2'de `output: 'standalone'` ve güvenlik başlıkları eklendi. |
| F11 | Yüksek (UX) | **Widget yerleşimi.** (1) Sonuç ekranında 3 sütunluk ızgara var, ama her kart `col-span-3` olduğu için her şey tam genişlikte alt alta diziliyor; sayfa çok uzuyor (`ResultDashboard.tsx:125-145`). (2) Kanal önerileri ve zayıflıklar 3 sütunluk ızgarada iki kart olarak duruyor; **üçüncü sütun boş kalıyor**. (3) En önemli içerik, yani "Akıllı Tavsiyeler", 288–384 px'lik dar bir yan panelde. Panel "Genişlet" ile büyüyünce tüm düzen kayıyor. (4) "Analiz Durumu" kartı yalnızca hazır / yükleniyor / bitti bilgisi için sürekli yer kaplıyor. (5) Başlıktaki üç sayaç (500 / 10 / 12) hiç değişmeyen pazarlama verisi, ama ekranın en değerli yerinde duruyor. (6) Yan yana birden fazla iç kaydırma alanı var (`overflow-y-auto` + `h-screen`); kullanıcı aynı anda 2–3 kaydırma çubuğuyla uğraşıyor. (7) Form tek sütun ve bir kart içinde kendi içinde kayıyor; kaydet düğmesi en altta, görünmüyor. | DESIGN.md §9 "Yerleşim" düzeni: rapor akışı, yan panel kaldırılır, tavsiyeler karar kartının yanına taşınır, tek sayfa kaydırması, iki sütunlu form ve yapışkan gönderme çubuğu. |

## B. Yeni özellikler

1. **Sonuç geçmişi ve paylaşım**
   - *Adım 1 (hızlı):* Sonuçlar localStorage'a yazılır. "Geçmiş" sekmesi eklenir, JSON olarak dışa/içe aktarılabilir. Bu, yaz-planı'ndaki yedekleme kalıbının aynısı.
   - *Adım 2:* Backend'de SQLite (`sqlmodel` gerekmez, stdlib `sqlite3` yeterli). `POST /api/simulations` sonucu kaydeder, `GET /api/simulations/{id}` getirir. Paylaşılabilir `/r/{id}` sayfası.
2. **A/B karşılaştırma:** Aynı ürünün iki varyantı (farklı fiyat, başlık veya açıklama) yan yana iki segmentli halkayla gösterilir; fark tablosu eklenir.
3. **Fiyat duyarlılık eğrisi:** Simülasyon çekirdeği deterministik ve LLM'siz çalışıyor. `POST /api/price-sweep`, fiyatın %60 ile %140'ı arasında 9 noktada `run_simulation` çalıştırıp alım oranı ve gelir eğrisini döner. "Optimum fiyat" önerisi verir.
4. **Gerçek persona sohbeti:** Mevcut "AI chat" tek seferlik bir tartışma. `POST /api/persona-chat` ile seçilen personaya takip sorusu sorulur. Yanıtlar SSE ile akar; persona prompt'u yalnızca sunucuda kalır; rate limit uygulanır.
5. **Canlı ilerleme:** Sahte terminal logu yerine LangGraph adımları (`input_analysis → research → benchmark → simulate → debate`) SSE ile gerçek zamanlı gösterilir.
6. **Rapor dışa aktarımı:** Markdown veya PDF rapor: skorlar, persona tablosu, aksiyon planı. Tarayıcının `print` CSS'i ilk sürüm için yeterli.
7. **Test ve CI**
   - pytest: aynı girdinin aynı skoru verdiği deterministiklik testleri, Pydantic sınır testleri, SSRF testleri, LLM mock'u ile graph testi.
   - Vitest ve Testing Library: `lib/api` hata yolları, halka bileşeni.
   - GitHub Actions: `ruff`, `pytest`, `npm run lint`, `npm run build`, `pip-audit`, `npm audit --omit=dev`. Dependabot.
8. **Gözlemlenebilirlik:** JSON log, `X-Request-ID`. `/api/health` yanıtına `{model, aiAvailable, serperAvailable}` eklenir.
9. **Kategori genişletme:** B3'teki Enum hazır olduktan sonra ayakkabı, çanta ve kozmetik kategorileri `category_rules.json` dosyasına eklenir.
10. **Dil tutarlılığı:** "TASK INTELLIGENCE" gibi İngilizce başlıklar ve ASCII'ye çevrilmiş Türkçe metinler temizlenir. Persona adları `personas.json` içinde Türkçe karakterli `displayName` alanıyla tutulur.
