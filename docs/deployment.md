# Dağıtım

Bu belge PazarLab AI'ı herkese açık bir sunucuda, nginx ters proxy'si arkasında çalıştırmak içindir. Yerel geliştirme için [README](../README.md) yeterli.

İki yol var: **tek sunucu + nginx** (§1–5, kalıcı kullanım için önerilen) ve **Vercel + Render** (§6, en hızlı başlangıç). Hangisinin ne zaman uygun olduğu §6.1'de.

## Mimari

```
İnternet ──HTTPS──▶ nginx ──┬── /api/*  ──▶ backend  (127.0.0.1:8000, uvicorn)
                            └── /*      ──▶ frontend (127.0.0.1:3000, Next standalone)
```

`docker-compose.yml` iki servisi de yalnızca `127.0.0.1`'e bağlıyor. Dışarıya yalnızca nginx açılır. Frontend ile API aynı alan adından sunulur; ayrı bir API alt alan adı gerekmez ve CORS tek origin'le sınırlı kalır.

## 1. Ortam değişkenleri

`backend/.env` (tam liste [backend/.env.example](../backend/.env.example) içinde):

| Değişken | Üretimde | Neden |
|---|---|---|
| `ENV` | `production` | `/docs` ve `/openapi.json` kapanır. |
| `CORS_ALLOWED_ORIGINS` | `https://pazarlab.example.com` | Sitenin kendi origin'i. `*` kabul edilmez. |
| `GEMINI_API_KEY`, `SERPER_API_KEY` | gerçek anahtarlar | |
| `GEMINI_MODEL` | sabit bir model | Otomatik seçim yoğun saatlerde 503 veren en yeni modele düşebilir. |
| `FORWARDED_ALLOW_IPS` | nginx'in backend'e göründüğü IP | Bkz. [§3](#3-gerçek-istemci-ipsi). |
| `MCP_ALLOWED_HOSTS`, `MCP_ACCESS_KEY`, `PUBLIC_SITE_URL` | alan adı, uzun rastgele değer, site adresi | MCP connector için; bkz. [mcp-connector.md](mcp-connector.md). |
| `LOG_FORMAT` | `json` | Her satır tek JSON nesnesi (`ts`, `level`, `logger`, `requestId`, `message` + erişim satırında `method`, `path`, `status`, `durationMs`). Bir hatayı kullanıcının gördüğü `X-Request-ID` ile aramak için. uvicorn'un kendi başlangıç satırları düz metin kalır. |

Frontend için `NEXT_PUBLIC_API_URL` **build sırasında** JavaScript'e gömülür. Çalışma anında değiştirmek etkisizdir; değer değişirse imaj yeniden build edilmelidir. Aynı alan adı kullanıldığında sitenin kendi adresi verilir:

```yaml
# docker-compose.override.yml
services:
  frontend:
    build:
      args:
        NEXT_PUBLIC_API_URL: https://pazarlab.example.com
  backend:
    environment:
      CORS_ALLOWED_ORIGINS: https://pazarlab.example.com
      FORWARDED_ALLOW_IPS: 127.0.0.1
```

## 2. nginx

İki uç SSE (server-sent events) ile cevap akıtır: `POST /api/simulate/stream` (canlı ilerleme) ve `POST /api/persona-chat` (persona sohbeti). nginx varsayılan olarak upstream yanıtlarını tamponlar; bu durumda ilerleme adımları ve sohbet parçaları akmaz, hepsi en sonda tek seferde gelir. Backend `X-Accel-Buffering: no` başlığını gönderiyor ve nginx bunu dikkate alıyor. Yine de başka bir proxy veya CDN araya girerse diye bu uçlarda tamponlama açıkça kapatılır.

```nginx
# /etc/nginx/conf.d/pazarlab.conf
upstream pazarlab_backend  { server 127.0.0.1:8000; }
upstream pazarlab_frontend { server 127.0.0.1:3000; }

server {
    listen 443 ssl;
    http2 on;
    server_name pazarlab.example.com;

    ssl_certificate     /etc/letsencrypt/live/pazarlab.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/pazarlab.example.com/privkey.pem;

    # Backend body limit is 10 MB (MAX_BODY_BYTES); keep nginx at least that high.
    client_max_body_size 10m;

    proxy_http_version 1.1;
    proxy_set_header Host              $host;
    proxy_set_header X-Real-IP         $remote_addr;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # SSE: no buffering, no gzip, long read timeout (a simulation can exceed 2 minutes).
    location ~ ^/api/(simulate/stream|persona-chat)$ {
        proxy_pass http://pazarlab_backend;
        proxy_buffering off;
        proxy_cache off;
        gzip off;
        proxy_set_header Connection "";
        proxy_read_timeout 300s;
    }

    # MCP connector (docs/mcp-connector.md): served by the backend, not the frontend.
    location = /mcp {
        proxy_pass http://pazarlab_backend;
        proxy_read_timeout 60s;
    }

    location /api/ {
        proxy_pass http://pazarlab_backend;
        # Non-streaming /api/simulate waits for the whole LLM run.
        proxy_read_timeout 180s;
    }

    location / {
        proxy_pass http://pazarlab_frontend;
    }
}

server {
    listen 80;
    server_name pazarlab.example.com;
    return 301 https://$host$request_uri;
}
```

Notlar:
- `proxy_read_timeout`, iki parça arasındaki en uzun sessizliktir; toplam süre değildir. Simülasyon akışında bir adım (ör. Gemini yorumları) tek başına uzun sürebildiği için 300 sn verildi.
- `http2 on` için nginx 1.25.1 veya üstü gerekir. Eski sürümlerde `listen 443 ssl http2;` yazılır.
- Güvenlik başlıkları (`X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`) frontend'den zaten geliyor (`frontend/next.config.mjs`). nginx'te tekrar eklenirse başlıklar çift görünür.
- Cloudflare gibi bir CDN kullanılıyorsa SSE yolları için önbellek ve "Rocket Loader" türü dönüştürmeler kapatılmalıdır.

## 3. Gerçek istemci IP'si

Rate limit (`RATE_LIMIT_*_PER_MIN`) istemci IP'sine göre sayar. Proxy arkasında backend'in gördüğü adres nginx'inkidir. Ayar yapılmazsa **bütün kullanıcılar tek bir kotayı paylaşır**.

Backend imajı uvicorn'u `--proxy-headers --forwarded-allow-ips=${FORWARDED_ALLOW_IPS}` ile başlatıyor (`backend/Dockerfile`). Bu yüzden `X-Forwarded-For` başlığı yalnızca bu listedeki adreslerden geliyorsa dikkate alınır:

| nginx nerede | `FORWARDED_ALLOW_IPS` |
|---|---|
| Aynı makinede, Docker dışında (yukarıdaki örnek) | `127.0.0.1` (varsayılan). Docker port yönlendirmesinde kaynak adres Docker ağ geçidi olabilir; `docker compose logs backend` içindeki istemci adresine bakıp o adres yazılır. |
| Aynı compose ağında bir container olarak | nginx container'ının IP'si veya compose ağının alt ağı (ör. `172.18.0.0/16`) |

Güvenilmeyen bir adresten gelen `X-Forwarded-For` yok sayılır. Bu sayede istemci başlığı kendisi yazarak limiti aşamaz. `*` verilmemelidir; verilirse herkes başlığı taklit edebilir.

## 4. Kısıtlar

- **AI bütçesi.** AI önbelleği (`AI_CACHE_TTL_SECONDS`) ve IP başına günlük AI çağrısı (`AI_DAILY_CALLS_PER_IP`) process belleğinde; yeniden başlatınca sıfırlanır. Günlük kota gerçek istemci IP'sine göre sayılır, yani [§3](#3-gerçek-istemci-ipsi) burada da şart. Paylaşılan bir NAT arkasındaki kullanıcılar (okul, ofis) aynı kotayı paylaşır; gerekirse değeri artırın.
- **Tek worker.** Rate limit sayaçları process belleğinde tutuluyor; geçmiş SQLite'ta. Birden fazla uvicorn worker'ı veya replika çalıştırılırsa limitler worker başına sayılır. Bu durumda paylaşılan bir depo (Redis) gerekir. Yük şu an LLM çağrılarında (threadpool'da), CPU'da değil; tek worker yeterli.
- **Geçmiş verisi** `pazarlab-data` volume'unda (`/app/data/history.db`). Yedekleme bu volume üzerinden yapılır. Persona sohbetleri sunucuda değil, kullanıcının tarayıcısında tutulur.
- **Docker imajları** geliştirme ortamında build edilip doğrulanmadı (SECURITY_AUDIT S11). İlk dağıtımda `docker compose up --build` sonrası `docker exec pazarlab-backend whoami` komutu root olmayan bir kullanıcı döndürmelidir.

## 5. Kontrol listesi

```bash
# Sağlık
curl -s https://pazarlab.example.com/api/health

# Dokümantasyon kapalı (404 beklenir)
curl -s -o /dev/null -w "%{http_code}\n" https://pazarlab.example.com/docs

# SSE akıyor mu: satırlar tek tek, aralıklarla gelmeli; hepsi sonda tek seferde gelmemeli
curl -N -s -X POST https://pazarlab.example.com/api/simulate/stream \
  -H "Content-Type: application/json" --data @ornek-istek.json

# Yabancı origin'e CORS izni yok (Access-Control-Allow-Origin başlığı dönmemeli)
curl -s -D - -o /dev/null -X OPTIONS https://pazarlab.example.com/api/simulate \
  -H "Origin: https://evil.example" -H "Access-Control-Request-Method: POST" | grep -i access-control-allow-origin
```

`ornek-istek.json` için `backend/tests/conftest.py` içindeki `VALID_REQUEST` kullanılabilir.

## 6. Vercel + Render

Website (`frontend/`) Vercel'de, API (`backend/`) Render'da. Repoda hazır: `render.yaml` (Render Blueprint) ve Vercel'in Next.js'i kendiliğinden tanıması. Kaynaklar: Render [ücretsiz plan](https://render.com/docs/free), [kalıcı disk](https://render.com/docs/disks), [Blueprint](https://render.com/docs/blueprint-spec); Vercel [kullanım kuralları](https://vercel.com/docs/limits/fair-use-guidelines) (Ekim 2026'da okundu).

```
tarayıcı ──▶ https://<proje>.vercel.app          (Next.js, Vercel)
        └──▶ https://pazarlab-api.onrender.com   (FastAPI, Render; Cloudflare kenarı üzerinden)
```

### 6.1 Ne zaman bu yol?

| | Vercel Hobby + Render Free | Vercel + Render ücretli | Tek VPS + Docker (§1–5) |
|---|---|---|---|
| Aylık maliyet | 0 | Render ~7 $ + disk; ticari kullanımda Vercel Pro (kişi başı ~20 $) | ~5 € (küçük bir VPS) |
| İlk ziyaret | API 15 dk boşta kalınca uyur; uyanması ~1 dk | Uyumaz | Uyumaz |
| Kayıtlı sonuçlar ve paylaşım linkleri | Her yeniden başlatma, uyuma ve deploy'da **silinir** (disk yok) | Kalıcı disk (1 GB yeter) | Kalıcı volume |
| Ticari kullanım | Vercel Hobby **yasak** (ödeme, reklam, satış tanıtımı da sayılır) | Vercel Pro ile serbest | Serbest |
| Bakım | Yok | Yok | Güncellemeler, TLS, yedek sizde |

Kısaca: deneme, jüri ya da portföy için **ücretsiz Vercel + Render** yeterli; kalıcı paylaşım linki ve ticari kullanım için Render'ı ücretli plana + diske geçirin ya da tek VPS kullanın. Tarayıcıdaki "Son simülasyonlar" ve persona sohbetleri kullanıcının kendi tarayıcısında durduğu için ücretsiz planda da kaybolmaz; kaybolan şey sunucudaki kayıt (başkasına gönderilen link).

### 6.2 Render: API

1. Render'da **New → Blueprint**, GitHub reposunu seçin. `render.yaml` okunur: Docker ile `backend/` build edilir, bölge Frankfurt, sağlık kontrolü `/api/health`.
2. Sorulan değerleri girin (sonradan Environment sekmesinden değiştirilebilir):

   | Değişken | Değer |
   |---|---|
   | `CORS_ALLOWED_ORIGINS` | Vercel adresi, ör. `https://pazarlab.vercel.app` (henüz bilinmiyorsa geçici bir değer; §6.4'te düzeltilir). Kendi alan adı varsa virgülle ekleyin. |
   | `PUBLIC_SITE_URL` | Aynı site adresi |
   | `GEMINI_API_KEY`, `SERPER_API_KEY` | Anahtarlar; boşsa site AI'sız (kural tabanlı) çalışır |
   | `GEMINI_MODEL` | Anahtarınızın kullanabildiği sabit bir model; boş bırakılırsa otomatik seçilir |
   | `MCP_ALLOWED_HOSTS` | `pazarlab-api.onrender.com` (servis adını değiştirdiyseniz kendi adresi) |

   `ENV=production`, `LOG_FORMAT=json`, `CLIENT_IP_HEADER=CF-Connecting-IP` ve rastgele bir `MCP_ACCESS_KEY` dosyadan gelir. `PORT`'u Render verir; imaj onu kullanıyor.
3. Deploy bitince `https://pazarlab-api.onrender.com/api/health` `"status": "ok"` dönmeli.
4. **İstemci IP'sini doğrulayın.** Hız sınırları ve günlük AI kotası istemci IP'sine göre sayılır. Render, trafiği Cloudflare kenarından geçiriyor ve servise doğrudan erişilemiyor; `CLIENT_IP_HEADER` bu yüzden Cloudflare'in kendisinin yazdığı başlığı okur. Render bu başlığı belgelemediği için ilk deploy'dan sonra elle kontrol edin: `/api/health` yanıtındaki `clientIp`, bilgisayarınızdan ve telefonun mobil verisinden açınca **iki farklı, gerçek** adres göstermeli. Aynı adresi gösteriyorsa (bütün kullanıcılar tek kotayı paylaşır) ya da tarayıcıda `CF-Connecting-IP` başlığını elle göndererek değiştirebiliyorsanız (herkes sınırı aşabilir), değişkeni silin ve Render desteğine hangi başlığın güvenilir olduğunu sorun.

### 6.3 Vercel: website

1. Vercel'de **Add New → Project**, aynı repoyu seçin.
2. **Root Directory: `frontend`**. Framework olarak Next.js kendiliğinden seçilir; build komutu ve çıktı ayarları değiştirilmez.
3. **Environment Variables**: `NEXT_PUBLIC_API_URL` = `https://pazarlab-api.onrender.com` (Production ve Preview için). Bu değer **build sırasında** koda gömülür: sonradan değiştirirseniz projeyi yeniden deploy edin.
4. Deploy. Site adresi `https://<proje>.vercel.app` olur.

### 6.4 Bağlama ve kontrol

1. Render'da `CORS_ALLOWED_ORIGINS` ve `PUBLIC_SITE_URL`'yi Vercel adresiyle güncelleyin (kayıt servis yeniden başlatır).
2. Sitede sağ üstteki API noktası yeşil olmalı; bir simülasyon çalıştırın, adımlar tek tek akmalı (SSE). §5'teki komutlar adresler değiştirilerek kullanılabilir.
3. Vercel'in her dal/PR için açtığı **önizleme adresleri** farklıdır ve CORS'ta yoktur; önizlemede API çağrıları engellenir. Gerekirse o adresi geçici olarak `CORS_ALLOWED_ORIGINS`'e ekleyin (`*` kabul edilmez).
4. Kendi alan adı: Vercel'de domain ekleyin, sonra Render'da `CORS_ALLOWED_ORIGINS` ve `PUBLIC_SITE_URL`'ye yazın. API için de alan adı isterseniz (ör. `api.alanadi.com`) Render'a ekleyip `NEXT_PUBLIC_API_URL` ve `MCP_ALLOWED_HOSTS`'u ona çevirin.
5. MCP connector adresi: `https://pazarlab-api.onrender.com/mcp?key=<MCP_ACCESS_KEY>` (değer Render'ın Environment sekmesinde); ayrıntı [mcp-connector.md](mcp-connector.md).

### 6.5 Ücretsiz planda bilinen davranışlar

- API uyurken ilk ziyarette API noktası birkaç saniye kırmızı görünür, canlı tahmin paneli "güncellenemedi" der; ~1 dk içinde düzelir. Simülasyonun kendi zaman aşımı (3 dk) uyanmayı bekler.
- Uyuma ve her deploy: kayıtlı sonuçlar, AI önbelleği ve günlük AI kotası sıfırlanır.
- Ayda 750 ücretsiz instance saati çalışma alanı başına; tek servis sürekli açık kalsa bile yeter.
- Ücretliye geçiş: `render.yaml`'da `plan: 0.5c-512mb` ve yorumdaki `disk` bloğu (`mountPath: /app/data`; imajdaki `HISTORY_DB_PATH` oraya bakıyor). Diskli serviste deploy sırasında kısa bir kesinti olur ve servis tek kopyada kalır; bu proje zaten tek süreç bekliyor (§4).

