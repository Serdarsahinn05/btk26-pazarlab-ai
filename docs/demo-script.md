## Demo Script (Hackathon)

### Açılış
- Problem: “Ürün listeliyorum ama pazar geniş mi, kim alır, nereden pazarlamalıyım bilmiyorum.”
- Çözüm: 500 persona ile simülasyon + özet metrik + AI içgörü (prompt/fallback).

---

## Demo 1 – Trend Ürünü
- **Ürün**: Oversize Su Geçirmez Kışlık Mont, 1800TL
- **Kategori**: Giyim/Mont
- **Motivasyon**: `stil_begeni`
- **Özellikler**: Su geçirmez, rüzgar geçirmez, oversize, siyah, kışlık
- **Hedef Kitle**: 18-30, unisex, orta gelir

**Beklenen çıktı (örnek):**
- overallScore ~68
- marketBreadthScore ~74 (geniş)
- intentConversionScore ~63
- top personas: Trend Takipçisi, Pratik Çözüm Arayan, Kalite Odaklı
- kanal: Instagram / TikTok

---

## Demo 2 – Niş Ürün (Kritik)
- **Ürün**: Bebek Arabası Yedek Ayağı, 120TL
- **Kategori**: Yedek Parça
- **Motivasyon**: `yedek_parca_tamir`
- **Özellikler**: Uyumlu model: X-Bebek Pro, ölçü: 12cm, malzeme: alüminyum, montaj: tak-çıkar

**Beklenen çıktı (örnek):**
- overallScore ~42
- marketBreadthScore ~18 (niş)
- intentConversionScore ~81 (yüksek)
- problemSolutionFit ~88
- top personas: Problem Çözüm Odaklı, Fiyat/Kargo Hassas, Detaycı Uyum Kontrolcüsü
- kanal: Google Search / SEO / Pazar yeri araması
- vurgu: geniş kitle reklamı yerine arama niyeti

---

## Demo 3 – İhtiyaç Ürünü
- **Ürün**: Kapı Kolu Seti, 350TL
- **Kategori**: Ev & Yaşam
- **Motivasyon**: `ihtiyac`
- **Özellikler**: Ölçü: 8cm delik aralığı, malzeme: paslanmaz çelik, kapı tipi: iç kapı

**Beklenen çıktı (örnek):**
- overallScore ~51
- marketBreadthScore ~36
- intentConversionScore ~76
- kanal: SEO / Google Search

---

### Kapanış
- Mimari: “Her bot ayrı AI değil; matematiksel profil + tek sefer AI yorum.”
- Fallback: Demo sırasında AI API olmasa bile öneri üretmeye devam eder.
