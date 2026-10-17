# PazarLab'a gönder (tarayıcı eklentisi)

Açık ürün sayfasını tek tıkla PazarLab'a taşır. Ürün, alanları doldurulmuş olarak "Ürününü test et" ekranında açılır.

```
ürün sayfası ──(sayfanın kendisi)──▶ PazarLab API  /api/read-product-page
                                          │  ad, fiyat, açıklama, görseller, kategori, puan…
                                          ▼
                 PazarLab sitesi  /dashboard#import=…  ──▶ form doldurulur
```

- Sunucu mağazaya **hiç istek atmaz**. Eklenti, tarayıcının zaten açtığı sayfayı gönderir. Engellemeye takılmaz, mağazaları sunucudan taramak gerekmez.
- Gönderilen HTML küçültülür: stil, SVG, iframe ve dış script'ler atılır. Ürün verisi taşıyabilen satır içi JSON ve JSON-LD kalır, sınır 3 MB'tır.
- Sonuç siteye URL'nin `#` kısmıyla geçer. Bu kısım sunucuya gitmez ve kullanıldıktan sonra adresten silinir. Site bu veriye güvenmez: her alanı yeniden doğrular ve kırpar ([frontend/lib/extensionImport.ts](../frontend/lib/extensionImport.ts)).
- İzinler: `activeTab` (yalnızca düğmeye bastığın sekme), `scripting`, `storage` (iki adres). Yerel API için host izni manifestte tanımlı. Ayarlardan başka bir API adresi verilirse ilk gönderimde o adres için izin istenir.

## Kurulum (geliştirici modu)

1. Chrome'da `chrome://extensions` sayfasını aç ve **Geliştirici modu**'nu aç.
2. **Paketlenmemiş öğe yükle** düğmesiyle bu `extension/` klasörünü seç.
3. Araç çubuğunda PazarLab ikonunu sabitle.

Varsayılan adresler yerel geliştirme içindir (`http://localhost:3000`, `http://localhost:8000`). Yayındaki site için popup'taki **Ayarlar** bölümüne site ve API adresini yaz.

Edge ve diğer Chromium tabanlı tarayıcılarda da aynı şekilde çalışır. Firefox desteği yok.

## Dosyalar

| Dosya | Görev |
|---|---|
| `manifest.json` | Manifest V3 |
| `popup.html` · `popup.css` · `popup.js` | Düğme, durum mesajları, ayarlar |
| `snapshot.js` | Sayfada çalışır: işlenmiş DOM'un küçültülmüş kopyası |
| `handoff.js` | Sonucu `#import=` parçasına çevirir |
| `icons/` | Sitenin favicon'undan üretilmiş ikonlar (geçici) |

## Test

`snapshot.js` ve `handoff.js`, Playwright testlerinde gerçek API ve siteyle birlikte denenir ([frontend/e2e/extension.spec.ts](../frontend/e2e/extension.spec.ts)). Bu testler `chrome.*` çağrılarını kapsamaz; eklentinin kendisi elle ya da Chromium'a yüklenerek denenir.
