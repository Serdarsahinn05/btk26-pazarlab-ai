# Gorev Dagilimi

Bu dokuman, proje uzerinde kimin hangi alana sahip oldugunu netlestirmek icin tutulur. Isimler zamanla degisebilir; onemli olan sorumluluk alanlarinin karismamasidir.

## Alanlar

| Alan | Sorumluluk | Cikti |
|---|---|---|
| Product & Demo | Problem anlatimi, demo akisi, kategori secimi | Sunum senaryosu ve demo urunleri |
| Frontend | Form, dashboard, akilli tavsiyeler, persona gorunumleri | Kullanici arayuzu |
| Backend API | Endpointler, Pydantic modelleri, servis baglantilari | Stabil API katmani |
| Simulation | 500 bot davranisi, karar dagilimi, persona skorlamasi | Analiz metrikleri |
| AI & Prompt | Agentic promptlar, persona tartismasi, fallback cevaplar | Yorum ve aksiyon ciktilari |
| Product Link | Linkten urun okuma, veri temizleme, form doldurma | Link destekli analiz |
| DevOps | Docker, env dosyalari, calistirma komutlari | Tek komutla calisan sistem |
| Documentation | README, mimari notlari, demo script | Juri ve takim icin anlasilir dokuman |

## Calisma Prensibi

- Her buyuk yama birden fazla kucuk commit'e bolunur.
- README urun vaadini anlatir; teknik detaylar `docs/` altinda tutulur.
- Demo akisini bozacak yeni ozellikler son anda eklenmez.
- AI hata verse bile temel simulasyon ve fallback cevaplar calismalidir.
- Docker ile calistirma her yama sonunda kontrol edilmelidir.

## Demo Oncesi Kontrol Listesi

- Backend health endpoint calisiyor mu?
- Frontend dashboard aciliyor mu?
- Basic giyim urununde `Aldi / Kararsiz / Almadi` dagilimi mantikli mi?
- Teknoloji urununde teknik ozellikler tavsiyelere yansiyor mu?
- Sacma input uyarisi geliyor mu?
- Akilli tavsiyeler paneli okunabilir mi?
- Persona tartismasinda `assistant 1`, `buyer`, `seller` gibi isimler gorunmuyor mu?
- Docker compose config parse oluyor mu?
