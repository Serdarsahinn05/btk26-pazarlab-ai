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
- İzinler: `activeTab` (yalnızca düğmeye bastığın sekme), `scripting` ve yalnızca PazarLab API'si için host izni. Ayar ya da depolama yok.
- Adresler `config.js`'te: site `https://pazarlab-ai.vercel.app`, API `https://pazarlab-api.onrender.com`. Ücretsiz planda API uyuyorsa ilk istek bir dakika kadar sürebilir; popup bunu söylüyor.
- Gizlilik politikası: <https://pazarlab-ai.vercel.app/gizlilik>.

## Kurulum

**Mağazadan:** yayınlandığında Chrome Web Mağazası'ndan. Yükleme adımları ve mağaza metinleri: [store/LISTING.md](store/LISTING.md).

**Yayındaki siteyle, geliştirici modunda:** `chrome://extensions` → **Geliştirici modu** → **Paketlenmemiş öğe yükle** → bu `extension/` klasörü.

**Yerel geliştirme:** `python extension/build.py --dev` → `extension/dist/dev/` klasörünü aynı şekilde yükle. Bu kopya `localhost:3000` ve `localhost:8000`'e bağlanır.

**Mağaza paketi:** `python extension/build.py` → `extension/dist/pazarlab-extension-<sürüm>.zip` (yalnızca çalışan dosyalar).

Edge ve diğer Chromium tabanlı tarayıcılarda da çalışır. Firefox desteği yok.

## Dosyalar

| Dosya | Görev |
|---|---|
| `manifest.json` | Manifest V3 |
| `config.js` | Site ve API adresi |
| `build.py` | Mağaza zip'i ve yerel kopya |
| `store/` | Mağaza görselleri ve [LISTING.md](store/LISTING.md) |
| `popup.html` · `popup.css` · `popup.js` | Düğme, durum mesajları |
| `snapshot.js` | Sayfada çalışır: işlenmiş DOM'un küçültülmüş kopyası |
| `handoff.js` | Sonucu `#import=` parçasına çevirir |
| `icons/` | Sitenin favicon'undan üretilmiş ikonlar (geçici) |

## Test

`snapshot.js` ve `handoff.js`, Playwright testlerinde gerçek API ve siteyle birlikte denenir ([frontend/e2e/extension.spec.ts](../frontend/e2e/extension.spec.ts)). Bu testler `chrome.*` çağrılarını kapsamaz; eklentinin kendisi elle ya da Chromium'a yüklenerek denenir.
