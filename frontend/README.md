# PazarLab frontend

Next.js 16 (App Router), React 19, Tailwind 4. Tasarım kuralları: [../DESIGN.md](../DESIGN.md). Kurulum ve backend: [../README.md](../README.md).

## Komutlar

```bash
npm run dev        # http://localhost:3000 (backend: http://localhost:8000)
npm run lint
npx tsc --noEmit
npm run build
npm run test:e2e   # Playwright uçtan uca testleri
```

`NEXT_PUBLIC_API_URL` backend adresidir (varsayılan `http://localhost:8000`); build sırasında koda gömülür.

## Veri dosyaları

`data/personas.json` ve `data/category_rules.json`, `backend/app/data`'daki dosyaların kopyasıdır. Backend'de düzenleyip `python backend/scripts/sync_frontend_data.py` çalıştırın; kopya eskiyse backend testi düşer.

## Uçtan uca testler

`e2e/` altındaki testler gerçek backend'i AI ve rakip araması kapalı (`GEMINI_API_KEY=`, `SERPER_API_KEY=`) başlatır, frontend'in production build'ini açar ve tarayıcıda dener. Konsol hatası çıkan test düşer. Link okuyucunun cevabı testte taklit edilir; başka dış istek yoktur.

Yerelde backend bağımlılıkları kurulu bir Python ve bir tarayıcı gerekir:

```bash
npx playwright install chromium            # ya da yüklü Chrome için: PW_CHANNEL=chrome
PYTHON=../backend/venv/Scripts/python npm run test:e2e
```

Çalışan sunucular varsa (3000 ve 8000) yeniden kullanılır. CI'da `e2e` işi aynı komutları çalıştırır, hata olursa raporu artifact olarak yükler.
