# PazarLab'ı Claude'a bağlamak (MCP connector)

PazarLab, bir **uzak MCP sunucusu** olarak da çalışır. Claude kullanan biri PazarLab'ı kendi Claude'una "custom connector" olarak ekler ve sohbette "şu ürünü 500 kişilik pazarda test et" der. Simülasyonu PazarLab hesaplar, yorumu ve persona rolünü kullanıcının Claude'u yapar; AI kullanımı **kullanıcının kendi planından** düşer.

> MCP (Model Context Protocol) protokolün adı; "connector", Claude'un bir MCP sunucusunu eklediğin özelliğe verdiği ad.

## Ne sunuyor

| Araç | Ne yapar |
|---|---|
| `list_categories` | 12 kategori ailesi + Diğer ve alt türleri; ortalama fiyatlar, skoru etkileyen alanlar, motivasyonlar. Kategori olarak alt tür kimliği, bilinmiyorsa aile kimliği verilir; `diger` için `marketPrice` (benzer ürünlerin ortalama fiyatı) önerilir |
| `list_personas` | 12 alışveriş personası ve karakterleri (rol yapmak için) |
| `read_product_link` | Herkese açık bir ürün sayfasını okur (sitedeki SSRF korumasıyla); kategori ve güven derecesi, mağaza puanı ve değerlendirme sayısı dahil. `simulate_product`'a `rating` ve `reviewCount` olarak verilebilir |
| `simulate_product` | 500 sentetik tüketiciyle simülasyon; skorlar, persona kararları, zayıflıklar, kural tabanlı öneriler; sonucu kaydeder ve `siteUrl` döner |
| `price_sweep` | Fiyatın %60–140'ında 9 nokta: alıcı, skor, ciro |
| `compare_variants` | İki sürümü aynı kalabalıkla karşılaştırır |
| `get_simulation` | Sitedeki paylaşım linkinin kimliğiyle kayıtlı sonucu getirir |

**Sunucu tarafında AI çağrılmaz** (`llm_client.without_ai()`): Gemini anahtarı tanımlı olsa bile MCP araçları deterministik çekirdeği ve kural tabanlı metinleri kullanır. Sunucu sahibinin maliyeti yalnızca barındırmadır.

Adres: `https://<alan-adı>/mcp` (Streamable HTTP, durumsuz, JSON yanıt). Aynı backend süreci API'yi ve MCP'yi birlikte sunar.

## Ayarlar (`backend/.env`)

| Değişken | Örnek | Neden |
|---|---|---|
| `MCP_ALLOWED_HOSTS` | `pazarlab.example.com` | `Host` başlığı izin listesi (DNS rebinding koruması). Boşsa yalnızca `localhost` kabul edilir; dışarıdan gelen istek 421 alır. Virgülle birden fazla. |
| `MCP_ACCESS_KEY` | uzun rastgele bir değer | Doluysa her istek `?key=<değer>` ister (yoksa 401). Erişim logları sorgu dizesini yazmaz. |
| `MCP_RATE_LIMIT_PER_MIN` | `60` | Bütün MCP çağrıları için **tek** limit. Claude, Anthropic'in sunucularından bağlandığı için IP başına limit bütün Claude kullanıcılarını tek kişi gibi sayardı. `0` = kapalı. |
| `PUBLIC_SITE_URL` | `https://pazarlab.example.com` | Doluysa `simulate_product` sitede açılacak linki döner (`/dashboard?r=<id>`). |

## Yerelde denemek (geçici tünel)

Claude, connector'a kendi bulut altyapısından bağlanır; bilgisayarındaki `localhost`'a ulaşamaz. Deneme için geçici bir HTTPS tüneli yeterli. Örnek: Cloudflare'in hesap gerektirmeyen hızlı tüneli.

```bash
# 1) Backend
cd backend
uvicorn app.main:app --port 8000

# 2) Başka bir terminalde tünel (cloudflared kurulu olmalı)
cloudflared tunnel --url http://localhost:8000
#    → https://<rastgele-ad>.trycloudflare.com gibi bir adres verir

# 3) backend/.env'e ekle ve backend'i yeniden başlat
MCP_ALLOWED_HOSTS=<rastgele-ad>.trycloudflare.com
MCP_ACCESS_KEY=<uzun-rastgele-değer>
```

Hızlı tünel adresi her başlatmada değişir; kalıcı kullanım için [deployment.md](deployment.md).

## Claude'a eklemek

1. Claude'da **Ayarlar → Connectors** (veya sohbetteki "+" menüsü) → **Add custom connector**.
2. URL: `https://<alan-adı>/mcp?key=<MCP_ACCESS_KEY>` (anahtar kullanmıyorsan `?key=` kısmı yok).
3. Sohbette "+" → Connectors menüsünden PazarLab'ı aç.

Arayüz zamanla değişebilir; güncel adımlar için Claude yardım sayfası: [Get started with custom connectors using remote MCP](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-MCP). Custom connector'lar Free, Pro, Max, Team ve Enterprise planlarında var; Free planda bir connector sınırı var.

**Örnek istekler**
- "Şu ürünü PazarLab'da test et: https://… "
- "350 TL'lik pamuklu basic tişört, 2 günde kargo, iade var, garanti yok. 18-34 yaş. Pazarda nasıl karşılanır?"
- "Fiyatı kaça çekersem ciro en yüksek olur?"
- "Garanti eklersem ne değişir? İki sürümü karşılaştır."
- "Trend Takipçisi personası olarak bana neden almadığını anlat."

## Güvenlik notları

- Custom connector'ları Anthropic doğrulamaz; kullanıcı kendi eklediği sunucuya güvenmelidir. Herkese açık bir dağıtımda `MCP_ACCESS_KEY` ve `MCP_ALLOWED_HOSTS` doldurulmalı.
- `read_product_link`, sitedeki SSRF korumasını kullanır: iç IP'ler, yönlendirmeler ve 80/443 dışındaki portlar reddedilir.
- Beklenen hatalar (okunamayan link, bilinmeyen kimlik, yoğunluk) modele anlaşılır bir mesajla döner; beklenmeyen hataların ayrıntısı gizlenir.
- Simülasyon sonuçları paylaşım linki için kaydedilir (`HISTORY_*` ayarları geçerli; görseller kaydedilmez).

## Kısıtlar

- **Claude.ai'de gerçek deneme** bu fazda yapılmadı (sunucunun internetten erişilebilir olması gerekiyor). Bilinmeyen tek nokta: connector URL'sindeki `?key=` sorgu dizesinin Claude tarafından korunup korunmadığı. Korunmuyorsa anahtar kapatılıp yalnızca host izin listesi ve rate limit ile denenir, uzun vadede OAuth eklenir.
- Persona sohbeti Claude'un içinde, `list_personas`'taki karakterle yapılır; sitedeki sohbet geçmişiyle bağlantılı değildir.
