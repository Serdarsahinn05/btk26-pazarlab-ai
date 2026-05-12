## API Contract (Özet)

AI içgörü servisi, backend simülasyonundan gelen özet veriyi alır ve frontend’in beklediği `aiInsights` alanına dönüştürür.

### Input (simulation summary)

| Alan | Tip | Açıklama |
|---|---|---|
| `overallScore` | number | Genel skor (0-100) |
| `marketBreadthScore` | number | Pazar genişliği (0-100) |
| `intentConversionScore` | number | Niyetli alıcı dönüşümü (0-100) |
| `problemSolutionFit` | number | Problem-çözüm uyumu (0-100) |
| `simulatedConsumers` | number | Simüle edilen bot sayısı |
| `estimatedBuyers` | number | Tahmini alıcı |
| `topPersonas` | array | En olası 3 persona |
| `weaknessSignals` | array | Zayıflık sinyalleri |
| `normalizedProduct` | object | 10 ortak parametre (0-1) |
| `purchaseMotivation` | string | Satın alma motivasyonu (örn: `stil_begeni`) |

### Output (frontend beklenen)

| Alan | Tip | Açıklama |
|---|---|---|
| `aiInsights.summary` | string | 2 cümlelik genel değerlendirme |
| `aiInsights.productTypeInsight` | string | Ürün tipi sınıflandırma + pazar yorum |
| `aiInsights.salesRecipe` | array | 3-5 maddelik aksiyon listesi |
| `aiInsights.marketingAdvice` | string | Kanal ve mesaj önerisi |
| `aiInsights.descriptionAdvice` | string | Açıklama önerisi |
| `aiInsights.pricingAdvice` | string | Fiyat önerisi |
| `aiInsights.seasonAdvice` | string | Sezon önerisi |
| `aiInsights.channelRecommendation` | array | Kanal listesi |
| `aiInsights.improvedDescription` | string | Hazır iyileştirilmiş açıklama |

### Notlar
- `purchaseMotivation`, `marketBreadthScore`, `intentConversionScore`, `problemSolutionFit` alanları prompt’ta zorunlu kullanılır.
- AI servisinde API key yoksa ya da çağrı hata verirse fallback devreye girer.
