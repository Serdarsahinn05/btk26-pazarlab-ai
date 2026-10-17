# Chrome Web Mağazası: yükleme rehberi ve hazır metinler

Bu dosyadaki metinler Chrome Web Store Developer Dashboard'daki alanlara olduğu gibi kopyalanır.

## 0. Yüklemeden önce

- [ ] `python extension/build.py` → `extension/dist/pazarlab-extension-1.0.0.zip`
- [ ] Gizlilik sayfası yayında mı: <https://pazarlab-ai.vercel.app/gizlilik>
- [ ] API ayakta mı: <https://pazarlab-api.onrender.com/api/health>
- [ ] Yeni sürümde `manifest.json` içindeki `version` artırılır (mağaza aynı sürümü kabul etmez).

## 1. Hesap

1. <https://chrome.google.com/webstore/devconsole> adresine Google hesabınla gir.
2. Geliştirici sözleşmesini kabul et, **5 USD** kayıt ücretini öde (bir kerelik).
3. Hesap ayarlarında iletişim e-postasını doğrula (doğrulanmadan yayın yapılamaz).

## 2. Yeni öğe

**Yeni öğe** → `pazarlab-extension-1.0.0.zip` dosyasını yükle.

## 3. Mağaza girişi (Store listing)

**Dil:** Türkçe

**Ad** (manifestten gelir): `PazarLab'a gönder`

**Özet** (manifestten gelir, en fazla 132 karakter):
```
Açık ürün sayfasını PazarLab'a gönderir; ürün 500 kişilik sentetik kasabada test edilmeye hazır olarak açılır.
```

**Açıklama:**
```
PazarLab, bir ürünü satışa çıkarmadan önce 500 kişilik sentetik bir kasabada test eder: kim alır, kim kararsız kalır, kim neden vazgeçer ve neyi değiştirirsen kaç kişi daha alır.

Bu eklenti, tarayıcında açık olan ürün sayfasını tek tıkla PazarLab'a taşır:

• Ürün sayfasındayken PazarLab ikonuna, sonra "Bu ürünü PazarLab'da test et" düğmesine bas.
• Ürünün adı, fiyatı, açıklaması, görselleri, kategorisi ve mağaza puanı okunur.
• PazarLab yeni sekmede, alanları doldurulmuş olarak açılır; kontrol edip simülasyonu başlatırsın.

Gizlilik
• Eklenti yalnızca sen düğmeye bastığında ve yalnızca o sekmede çalışır; arka planda çalışmaz, gezinme geçmişini okumaz.
• Sayfa yalnızca ürün bilgilerini okumak için PazarLab'a gider ve saklanmaz.
• Hesap, çerez ve reklam yok; veriler satılmaz.
Ayrıntılar: https://pazarlab-ai.vercel.app/gizlilik

PazarLab'ın sonuçları sentetik bir kasabadan gelen talep sinyalidir, satış garantisi değildir.
```

**Kategori:** Alışveriş (Shopping)

**Grafikler** (`extension/store/`):
| Alan | Dosya |
|---|---|
| Mağaza simgesi 128×128 | `extension/icons/icon-128.png` |
| Ekran görüntüleri 1280×800 | `screenshot-1-urun-sayfasinda-tek-tik.png`, `screenshot-2-form-hazir.png`, `screenshot-3-kasaba-karar-versin.png` |
| Küçük tanıtım kutusu 440×280 | `promo-small-440x280.png` |

**Ana sayfa URL'si:** `https://pazarlab-ai.vercel.app`
**Destek URL'si:** `https://github.com/Serdarsahinn05/btk26-pazarlab-ai/issues`

## 4. Gizlilik (Privacy practices)

**Tek amaç (Single purpose):**
```
Kullanıcının açık olan ürün sayfasındaki ürün bilgilerini (ad, fiyat, açıklama, görseller, kategori, puan) okuyup PazarLab sitesinde ürün test formunu doldurmak.
```

**İzin gerekçeleri:**

`activeTab`
```
Yalnızca kullanıcı eklenti düğmesine bastığında, o anda açık olan ürün sayfasının içeriğini okumak için. Başka sekmelere veya arka planda hiçbir sayfaya erişilmez.
```

`scripting`
```
Kullanıcı düğmeye bastığında açık sekmede tek seferlik bir fonksiyon çalıştırıp sayfanın HTML'ini (stil ve dış script'ler ayıklanmış) almak için. Sayfaya kalıcı script eklenmez, sayfa değiştirilmez.
```

Ana makine izni `https://pazarlab-api.onrender.com/*`
```
Okunan sayfayı ürün bilgilerinin çıkarıldığı PazarLab API'sine göndermek için. Eklentinin bağlandığı tek sunucu budur.
```

**Uzaktan kod (Remote code):** `Hayır, uzaktan kod kullanmıyorum.`
(Bütün JavaScript paketin içinde; API'den yalnızca JSON veri gelir.)

**Veri kullanımı (Data usage)** — işaretlenecek tek tür:
- [x] **Web sitesi içeriği** (Website content): sayfanın metni, görsel adresleri, fiyatı.
- Diğer bütün türler (kişisel bilgi, sağlık, finans, kimlik doğrulama, kişisel iletişim, konum, web geçmişi, kullanıcı etkinliği) **işaretlenmez**.

Üç beyanın üçü de işaretlenir:
- [x] Kullanıcı verilerini onaylanmış kullanım durumları dışında üçüncü taraflara satmıyorum veya aktarmıyorum.
- [x] Kullanıcı verilerini öğemin tek amacıyla ilgisi olmayan amaçlarla kullanmıyorum veya aktarmıyorum.
- [x] Kullanıcı verilerini kredi itibarını belirlemek veya borç verme amacıyla kullanmıyorum veya aktarmıyorum.

**Gizlilik politikası URL'si:** `https://pazarlab-ai.vercel.app/gizlilik`

## 5. Dağıtım

- Görünürlük: **Herkese açık** (önce denemek istersen **Liste dışı**: yalnızca linki olanlar kurar).
- Bölgeler: Tüm bölgeler (ya da yalnızca Türkiye).
- Ücret: Ücretsiz.

## 6. İnceleyiciye not (Test instructions)

```
Giriş gerekmez. Herhangi bir e-ticaret ürün sayfasını açın (örn. bir Trendyol, Hepsiburada veya Amazon ürünü), eklenti simgesine ve "Bu ürünü PazarLab'da test et" düğmesine basın. PazarLab sitesi yeni sekmede, ürün bilgileri doldurulmuş form olarak açılır. API ücretsiz planda çalıştığı için ilk istek uyanma nedeniyle 1 dakikaya kadar sürebilir.
```

**İncelemeye gönder.** Genelde birkaç iş günü sürer; e-postayla haber verilir.

## Sonraki sürümler

1. `manifest.json` içinde `version`'ı artır (ör. `1.0.1`).
2. `python extension/build.py`
3. Dashboard → öğe → **Paket** → yeni zip'i yükle → **İncelemeye gönder**.
