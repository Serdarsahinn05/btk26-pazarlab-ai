## AI Çıktı Formatı (Dashboard)

Dashboard, simülasyon çıktılarını ve AI yorumlarını birlikte gösterir. Bu doküman, AI tarafının **kesin** döndürmesi gereken alanları listeler.

### Zorunlu alanlar (`aiInsights`)
- **summary**: 2 cümlelik genel değerlendirme.
- **productTypeInsight**: Ürün tipi sınıflandırması ve pazar yorumu.
  - Ürün tipi sınıfları: `trend/stil ürünü`, `ihtiyaç ürünü`, `problem çözüm/yedek parça ürünü`, `hediye ürünü`
  - **Pazar genişliği yorumu**: `marketBreadthScore < 40` ise “arama niyeti yüksek kullanıcı” vurgusu
- **salesRecipe**: 3-5 maddelik somut aksiyon listesi.
- **marketingAdvice**: Hangi kanal + hangi mesaj dili.
- **descriptionAdvice**: Açıklamada eksik kritik unsurlar.
- **pricingAdvice**: Fiyat algısı ve test önerisi.
- **seasonAdvice**: Mevsimsellik değerlendirmesi.
- **channelRecommendation**: Kanal önerisi listesi (örn. `["Instagram","TikTok"]` veya `["Google Search","SEO","Pazar yeri araması"]`)
- **improvedDescription**: Satıcının direkt kullanabileceği iyileştirilmiş açıklama.

### Fallback şartı
LLM API çağrısı başarısız olursa aynı alanlar, `weaknessSignals` + `purchaseMotivation` ile oluşturulan hazır metinlerle doldurulmalıdır.
