# Mimari Notlari

PazarLab AI tek parca bir uygulama gibi gorunse de uc net katmandan olusur: kullanici arayuzu, analiz backend'i ve AI/veri destek servisleri.

## Sistem Haritasi

```text
+----------------------+       +----------------------+
|      Frontend        | HTTP  |       Backend        |
|      Next.js         +------>+       FastAPI        |
|      :3000           |       |       :8000          |
+----------+-----------+       +----------+-----------+
           |                              |
           |                              |
           v                              v
  Kullanici deneyimi             Simulasyon ve AI orkestrasyonu
```

Backend icindeki ana akis:

```text
Input Analysis
      |
      v
Product Link / Market Research
      |
      v
Simulation Core
      |
      v
AI Insight + Persona Debate
      |
      v
Simulation Response
```

## Katmanlar

| Katman | Sorumluluk |
|---|---|
| Frontend | Urun formu, link okuma UI, dashboard, persona tartismasi, akilli tavsiyeler |
| API | Request/response modelleri ve endpointler |
| Input Analysis | Sacma, eksik veya kategoriyle uyumsuz girdileri yakalama |
| Simulation Core | 500 bot davranisi, persona skorlamasi, karar dagilimi |
| AI Insight | Saticiya ozet, aksiyon plani, pazarlama ve aciklama onerileri |
| Product Link Reader | Urun linkinden baslik, fiyat, gorsel ve ozellik cikarma |

## Neden Hibrit?

Her botu ayri ayri LLM ile konusturmak pahali, yavas ve dengesiz olurdu. Bu nedenle:

- Karar skorlamasi deterministik simulasyon ile yapilir.
- AI, hesap motoru yerine yorum ve strateji katmaninda kullanilir.
- AI hata verirse fallback cevaplar temel deneyimi ayakta tutar.

## Demo Icin Onemli Nokta

Juriye anlatilacak en sade mimari cumle:

> "Urun verisini aliyoruz, 500 sentetik tuketici davranisini simule ediyoruz, sonra AI bu sonucu saticinin anlayacagi aksiyonlara ceviriyor."
