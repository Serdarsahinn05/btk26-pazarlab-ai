# Dağıtım

Bu belge PazarLab AI'ı herkese açık bir sunucuda, nginx ters proxy'si arkasında çalıştırmak içindir. Yerel geliştirme için [README](../README.md) yeterli.

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
