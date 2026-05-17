# PazarLab AI

PazarLab AI, e-ticaret saticilarinin urunlerini pazara cikmadan once 500 sentetik tuketiciyle test etmesini saglayan AI destekli pazar simulasyonu platformudur. Urun bilgisi veya urun linki girilir; sistem karar dagilimi, hedef persona, pazarlama onerisi ve uygulanabilir aksiyon plani uretir.

---

## Ozellikler

| Yetkinlik | Aciklama |
|---|---|
| 500 Bot Simulasyonu | Urun icin `Aldi / Kararsiz / Almadi` karar dagilimi uretir. |
| Persona Analizi | Farkli tuketici tiplerinin neden alip almayacagini gosterir. |
| Agentic AI Yorumlari | Pazarlama, fiyatlama, sezon ve aciklama onerileri uretir. |
| Urun Linki Okuma | Linkten fiyat, gorsel, baslik ve aciklama cekmeye calisir. |
| Input Kalite Kontrolu | Sacma veya eksik urun bilgisinde kullaniciyi uyarir. |
| Docker Destegi | Frontend ve backend tek compose komutuyla calisir. |

---

## Mimari

```text
                +-------------------------------+
                |           Frontend            |
                |       Next.js Dashboard       |
                |             :3000             |
                +---------------+---------------+
                                |
                                | HTTP
                                v
                +---------------+---------------+
                |            Backend            |
                |        FastAPI + LangGraph    |
                |             :8000             |
                +-------+---------------+-------+
                        |               |
                        |               |
                        v               v
        +---------------+----+   +------+----------------+
        |  Simulation Core   |   |      Agentic AI       |
        |  500 bots/persona  |   |  Gemini + fallback   |
        +---------------+----+   +------+----------------+
                        |               |
                        |               |
                        v               v
        +---------------+----+   +------+----------------+
        | Product Link Read |   | Persona Debate/A2A    |
        | scrape + extract  |   | AI yorumlari          |
        +-------------------+   +-----------------------+
```

Bes ana adim:

```text
Urun bilgisi/link -> Input kontrolu -> 500 bot simulasyonu -> AI yorumlari -> Dashboard
```

---

## Servis Kumesi

| Servis | Teknoloji | Gorev |
|---|---|---|
| Frontend | Next.js, TypeScript, Tailwind | Form, dashboard, karar grafigi, persona tartismasi |
| Backend API | FastAPI, Pydantic | Endpointler, veri modelleri, response sozlesmesi |
| Simulation Core | Python | 500 bot davranisi, karar dagilimi, persona skorlamasi |
| Agentic AI | LangGraph, Gemini | AI recete, benchmark yorumu, persona A2A tartismasi |
| Product Link Reader | Python scraping + AI fallback | Urun linkinden veri cekme ve forma tasima |
| Runtime | Docker Compose | Frontend + backend'i birlikte ayaga kaldirma |

---

## Demo'da One Cikanlar

- **500 Bot Karar Dagilimi**: Urunun kac bot tarafindan alindigini, kac botun kararsiz kaldigini ve kac botun almadigini gosterir.
- **Persona Yatirim Haritasi**: En uygun hedef kitleleri ve onlar icin uygulanacak dokunuslari verir.
- **Akilli Tavsiyeler**: Kisa karar, ilk 3 aksiyon, kritik risk, hedef persona ve test onerisi sunar.
- **Persona Tartismasi**: Farkli musteri tipleri urunu kendi bakis acilariyla tartisir.
- **Benchmark Analizi**: Rakip ve pazar sinyallerini karar surecine ekler.

---

## Kategoriler

Demo kapsami bilincli olarak dar tutuldu. Amac cok kategori gostermek degil, secilen kategorilerde daha anlamli input almak.

| Ana kategori | Alt kategoriler |
|---|---|
| Giyim | Tisort, pantolon, mont, elbise, etek |
| Teknoloji | Telefon, laptop, kulaklik, tablet, akilli saat |

---

## Docker ile Calistirma

```powershell
cd C:\Users\42osm\btk26-pazarlab-ai
Copy-Item backend\.env.example backend\.env
notepad backend\.env
docker compose up --build
```

Adresler:

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend health: [http://localhost:8000/api/health](http://localhost:8000/api/health)

Arka planda calistirma:

```powershell
docker compose up --build -d
docker compose logs -f
```

Durdurma:

```powershell
docker compose down
```

---

## Local Gelistirme

Backend:

```powershell
cd backend
.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

---

## Ortam Degiskenleri

`backend/.env`

```env
GEMINI_API_KEY=your_gemini_api_key_here
SERPER_API_KEY=your_serper_api_key_here
```

---

## Dokumanlar

| Dokuman | Icerik |
|---|---|
| [Mimari](docs/architecture.md) | Sistem akisi ve servis sorumluluklari |
| [Gorev Dagilimi](docs/task-distribution.md) | Takim icindeki sorumluluk alanlari |
| [API Contract](docs/api-contract.md) | Backend/frontend response sozlesmesi |
| [AI Output](docs/ai-output.md) | AI tarafindan beklenen cikti formati |
| [Demo Script](docs/demo-script.md) | Sunumda izlenecek demo akisi |

---

## Kisa Ozet

PazarLab AI, saticiya sadece "bu urun satar" demez. 500 botun kararı, personalarin gerekcesi, kritik riskler ve ilk uygulanacak aksiyonlarla birlikte daha kullanilabilir bir pazar cevabi verir.
