## Mimari Özeti (Hibrit Yaklaşım)

Bu MVP’de amaç, her bir tüketici için ayrı ayrı “LLM konuşması” yapmak değil; **matematiksel profil** ile 500 bot davranışını simüle edip, sadece **simülasyon özetini** AI’ın yorumlamasını sağlamaktır.

### Ana Bileşenler
- **Persona verisi** (`backend/app/data/personas.json`): 10 persona tipi, hedef 500 bot (10×50). Botlar template’lerden deterministik üretilir.
- **Kategori kuralları** (`backend/app/data/category_rules.json`): 5 kategori (mont, telefon, şapka, ev_yasam, yedek_parca) + motivasyona göre ağırlıklar.
- **Simülasyon servisi** (Kişi 2 alanı): Ürün girdisini normalize eder, bot davranışlarını koşar ve özet metrikleri üretir.
- **AI içgörü servisi** (`backend/app/services/ai_insight_service.py`): Üretilen özet metriği prompt’a çevirir; API anahtarı yoksa/çökerse fallback üretir.

### “Kategori + Satın alma motivasyonu” iki eksenli analiz
Simülasyon ve içgörü üretimi iki eksende şekillenir:
- **Kategori**: Hangi ortak parametrelerin önemli olduğu (ör. yedek parçada “uyumluluk/ölçü”).
- **Satın alma motivasyonu**: Aynı kategoride bile ağırlıkların değişmesi (ör. mont + stil_begeni’de görsel/trend/season daha baskın).

Bu yüzden `category_rules.json` her kategori için **motivasyon bazlı ağırlıklar** içerir.

### Niş ürün davranışı (pazar genişliği < 40)
Niş ürünlerde geniş kitle reklamı yerine, **arama niyeti yüksek kullanıcıya** (SEO, Google Search, pazar yeri araması) odaklanmak daha rasyoneldir. Bu vurgu hem prompt’ta hem fallback’te bulunur.
