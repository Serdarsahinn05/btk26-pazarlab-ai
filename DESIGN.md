# PazarLab AI — Tasarım Sistemi

> Bu dosya projenin tasarım otoritesidir. Palet, font ve bileşen kararlarında herhangi
> bir araç veya öneri bu dosyayla çelişirse bu dosya geçerlidir.

## 1. Yön: "Canlı pazar yeri"

Samimi, el yapımı hissi veren ama verisi net okunan bir arayüz: serin nötr kâğıt zemin,
eğri kenarlı yuvarlak şekiller, "sticker" gölgeler, el yazısı küçük notlar ve az ama
**canlı** vurgu renkleri. Türk e-ticaret satıcısına yakın, AI aracı soğukluğundan uzak.

**İlkeler**
1. **Zemin serin ve nötr, renk vurguda.** Kâğıt ve kenarlar asla şeftali, krem ya da turuncu tonlu olmaz; büyük renkli dolgu yok.
2. **Renk veri taşır.** Yeşil = aldı/pozitif, sarı = kararsız, mercan = almadı/risk; persona rengi = kimlik.
3. **Küçük renkli metin her zaman koyu tonla yazılır** (`--buy-text` vb.); canlı tonlar grafik ve dolgu içindir.
4. **Eğri ama düzenli:** yamuk köşeler ve hafif dönüşler süs düzeyinde kalır, ızgara bozulmaz.
5. Açık tema varsayılan (sistem tercihine uyar); koyu tema aynı token'larla eşdeğer kalitede.
6. Her etkileşimli öğe klavyeyle ulaşılabilir ve görünür bir odak halkasına sahiptir.

**Bıraktıklarımız:** neon glow, mor/indigo gradyan, glass bulanıklığı, nokta grid zemin,
`font-black tracking-tighter` başlıklar, 8–10 px etiketler, sıcak/turuncu kâğıt filtreleri.

## 2. Token'lar

`frontend/app/globals.css` içinde shadcn HSL formatında (`--x: H S% L%`) tanımlanır,
aynı dosyadaki `@theme inline` bloğunda `hsl(var(--x))` olarak Tailwind'e eşlenir (Tailwind 4; ayrı config dosyası yok). Bileşenlerde ham hex, `rgba()`,
`text-white`, `bg-zinc-*`, `violet-*` vb. **kullanılmaz**.

### 2.1 Yüzey ve metin

| Token | Açık | Koyu | Kullanım |
|---|---|---|---|
| `--background` | `#eaeee8` | `#141819` | Sayfa zemini (serin kâğıt) |
| `--secondary` | `#dfe5de` | `#212729` | Ray, hover, not kutusu zemini |
| `--card` | `#fafbf8` | `#1c2123` | Kart, input |
| `--foreground` | `#1b2220` | `#e6ebe8` | Ana metin |
| `--foreground-2` | `#343f3c` | `#c6cfcb` | İkincil metin |
| `--muted-foreground` | `#56625d` | `#97a29d` | Açıklama, etiket |
| `--border` | `#cad3c9` | `#333b3d` | Kenar |
| `--primary` | `#2f7a4c` | `#6cc490` | Aktif sekme, barlar, marka "AI" |
| `--primary-foreground` | `#fafbf8` | `#141819` | |
| `--accent` | `#2f7896` | `#6bb8d6` | Ana düğme, el çizimi dalga, ikinci vurgu |
| `--accent-foreground` | `#fafbf8` | `#141819` | |
| `--ring` | `#2f7896` | `#6bb8d6` | Odak halkası |
| `--shadow-ink` | `#cad3c9` | `#0b0d0e` | Sticker gölge rengi |

### 2.2 Karar renkleri

| Token | Açık (grafik) | Açık (küçük metin) | Koyu (ikisi de) |
|---|---|---|---|
| `--buy` / `--buy-text` | `#3f8a5a` | `#24683f` | `#6cc490` |
| `--watch` / `--watch-text` | `#c99a1a` | `#7a5a06` | `#e8c14a` |
| `--skip` / `--skip-text` | `#c4574a` | `#983a31` | `#e88a7c` |

Mercan yalnızca "Almadı" dilimi, risk notunun kenarı ve "kritik" etiketinde kullanılır.
Sarı yalnızca küçük rozetlerde ve "Kararsız" diliminde kullanılır.

### 2.3 Persona renkleri

`personas.json` sırasına göre `--persona-1 … --persona-12` atanır (isimle değil index ile):

| # | Açık | Koyu | # | Açık | Koyu |
|---|---|---|---|---|---|
| 1 | `#2f7896` | `#6bb8d6` | 7 | `#6f8f2a` | `#a8c860` |
| 2 | `#3f8a5a` | `#6cc490` | 8 | `#a0509a` | `#d68ad0` |
| 3 | `#c99a1a` | `#e8c14a` | 9 | `#2fa070` | `#6cd6a4` |
| 4 | `#6a55b8` | `#a796e8` | 10 | `#5f7480` | `#a0b2bc` |
| 5 | `#1a8f84` | `#5cc8bb` | 11 | `#2a90c8` | `#6cc0ec` |
| 6 | `#3a64c8` | `#7f9cf0` | 12 | `#c4574a` | `#e88a7c` |

Persona kartı zemini: kendi renginin %7'si kart rengine karışır. Etiket (chip) zemini: metin renginin %12'si.

### 2.4 Şekil, gölge, doku

| Öğe | Değer |
|---|---|
| Kart köşesi (`rounded-wobble`) | `18px 22px 16px 24px / 22px 16px 24px 18px` |
| Büyük çerçeve (`rounded-wobble-lg`) | `26px 30px 24px 32px` |
| Düğme / chip | `999px`; aktif sekme `16px 20px 15px 22px` |
| Rozet (`rounded-blob`) | `46% 54% 50% 50% / 52% 48% 52% 48%` |
| Kenar kalınlığı | `2px` |
| Sticker gölge | kart `3px 4px 0 var(--shadow-ink)` (`shadow-sticker`); düğme `2px 3px 0 var(--foreground)` (`shadow-sticker-ink`) |
| Doku | SVG fractal noise, nötr gri; opaklık açıkta `.26`, koyuda `.20` (`body::before`) |
| El çizimi dalga | kart başlığı altında 74×8 px SVG maske, renk `--accent` |
| Bar | 9px, tam yuvarlak, 1.5px kenar; dolgu `--primary` çapraz çizgili |

## 3. Tipografi

| Rol | Font | Boyut / ağırlık |
|---|---|---|
| Başlık (h1–h3, kart başlığı, persona adı) | **Bricolage Grotesque** | h1 `clamp(32px,5vw,52px)`/800; kart başlığı 21px/700, `-0.01em` |
| Gövde, etiket, form | **Nunito** | 15.5px/400–700, satır yüksekliği 1.55; özet 18px/600 |
| Rakam (skor, KPI, yüzde) | **Bricolage Grotesque** | skor 46px/800, KPI 32px/800, `-0.03em` |
| El yazısı not | **Caveat** | 22px/500–700, ±8° dönük, `--foreground-2` |

- Fontlar `next/font/google` ile yüklenir: `--font-bricolage`, `--font-nunito`, `--font-caveat` (`<body>` üzerinde). `@theme inline` bunları `font-display`, `font-sans`, `font-hand` sınıflarına bağlar. Mono font kullanılmaz.
- Minimum metin boyutu 12px. Arayüz metni Türkçe karakterlerle yazılır.

## 4. Bileşen kalıpları

| Kalıp | Tanım | PazarLab'da |
|---|---|---|
| **Segmentli halka** | SVG r=52, stroke 12, al/izle/geç dilimleri arasında 2px boşluk; ortada Bricolage skor + küçük etiket; yanında el yazısı not | Karar kartı |
| **Persona halka kartı** | Persona tonu zeminli kart, halka (persona rengi), ad (Bricolage), karar chip'i; tek/çift kartlar ±0.6° dönük, hover'da düzleşip 3px yükselir | Persona ızgarası; tıklanınca Tartışma'da o persona |
| **KPI kartı** | Üstte 5px renkli şerit (yeşil, mavi, sarı, mor), büyük rakam, çizgili bar, kısa açıklama | 4 KPI |
| **Sekme (pill)** | Pasif: düz metin; aktif: `--primary` dolgu, yamuk köşe, sticker gölge | Üst bar navigasyonu |
| **Düğme** | 2px mürekkep kenar, `2px 3px 0` gölge, hover'da 1px kayar; birincil = `--accent` zemin | Tüm düğmeler |
| **Chip** | Tam yuvarlak, 1.5px kenar, metin renginin %12'si zemin, koyu metin tonu | Karar etiketleri, kanallar |
| **Not kutusu** | 2px kesikli `--skip` kenar, yamuk köşe, `--secondary` zemin | Kritik risk, girdi uyarısı |
| **Tırtıklı başlıklı kart** | Başlık şeridi `--secondary`, alt kenarı `clip-path` ile dalgalı | Zayıflıklar, kanal önerileri |
| **Konuşma satırı** | 6px sol kenar persona rengi, `4px 16px 16px 4px` köşe, sticker gölge | Tartışma mesajları |
| **Numara rozeti** | Sarı blob, Bricolage 800 | Aksiyon listesi, form adımları |
| **Tek serili grafik** | Tek ton `--accent`; değer ve etiketler metin renginde (seri renginde değil); başlık seriyi adlandırır, lejant yok; hover/odakta değer; "Tablo olarak göster" | Ağızdan ağıza (haftalık çubuk), Kim alıyor? (yatay çubuk), fiyat eğrisi |
| **Sakin kartı** | Solda 56 px çizim avatar (`public/pp_icons/1–10`, `rounded-blob`, 2px kenar; sakinin kimliğinden sabit, ekrandaki kartlarda tekrarsız, dekoratif `alt=""`), ad (Bricolage), yaş · şehir · meslek, persona noktası + adı (metin renginde), karar chip'i, gerekçe, katlanabilir "Hikâyesi"; satır `flex-wrap` + `basis-[300px]` (boş hücre kalmaz) | Kasabadan 5 sakin |
| **Kazanç rozeti** | Chip, `--buy-text`; "+5,5 puan" (Türkçe ondalık), boş alanın etiket satırının sağında | Ürün formu, Hazırlık paneli |
| **Öneri satırı** | Tam genişlik düğme, 44 px, 2px kenar; solda alan adı, sağda Bricolage kazanç; tıklayınca alana kayar ve odaklar | Hazırlık paneli |
| **Durum toast'u** | Alt-orta, tam yuvarlak, sticker gölge; `info` / `error` + "Tekrar dene" | API hataları |

## 5. Hareket

- Geçiş: `opacity` + `translateY(6px)`, 250ms ease.
- Halka/bar dolumu: 800ms `cubic-bezier(.22,1,.36,1)`.
- Hover: 160ms; kartlar düzleşip yükselir, düğmeler gölgelerine doğru kayar.
- `prefers-reduced-motion`: animasyon yok, dönük kartlar sabit, confetti yok.

## 6. Erişilebilirlik

- İkon düğmelerinde `aria-label`; odak: `outline 2px solid var(--ring)`, offset 2px.
- Küçük renkli metin ≥ 4.5:1 (koyu tonlar bunun için var). Sarı grafikler her zaman okunaklı bir metin etiketiyle birlikte gösterilir.
- Modal: `role="dialog"`, `aria-modal`, Esc, odak tuzağı. Dosya yükleme klavyeyle erişilebilir.
- 375px genişlikte yatay sayfa kaydırması yok; yan boşluk 16px.

## 7. Yasaklar

- Turuncu/şeftali/krem kâğıt veya kenar tonları; büyük kırmızı/mercan dolgular.
- Yeni UI/animasyon/grafik kütüphanesi eklemek (mevcut: Tailwind 4, shadcn, framer-motion, lucide). Grafikler elle SVG/HTML.
- Bileşen içinde ham renk ve Tailwind palet renkleri; `tailwind.config` dosyası (Tailwind 4: tema `globals.css` içindeki `@theme inline` bloğunda, yardımcılar `@utility` ile).
- Sahte durum verisi.

## 8. Uygulama notları

- Tailwind yardımcıları: `rounded-wobble`, `rounded-wobble-lg`, `rounded-blob`, `shadow-sticker`, `shadow-sticker-ink`, `font-display`, `font-hand`; renkler `buy`, `watch`, `skip` (+ `-text`), `persona-1..12`.
- Paylaşılan parçalar: `components/ui/ring.tsx` (halka + segmentli halka), `components/ui/section-title.tsx` (dalgalı başlık).
- **Dikey aralık:** Çocuklarından biri `hidden`, `sr-only`, inline (`<span>`, `<label>`) olabilecek ya da Radix Select gibi gizli bir eleman ekleyen kapsayıcılarda `space-y-*` yerine `flex flex-col gap-*` kullanılır. Tailwind 4'te `space-y` son çocuk dışındakilere `margin-bottom` veriyor; gizli son çocukta fazladan boşluk kalıyor, inline çocukta margin hiç uygulanmıyor.
- `text-sm`/`text-xs` v4'te birimsiz satır yüksekliği veriyor ve içteki daha büyük font'a oranlı aktarılıyor. Form alanını saran etiketlerde sabit `leading-5`/`leading-6` kullanılır.

## 9. Yerleşim

Mevcut düzenin sorunları IMPROVEMENTS.md F11'de. Hedef: **bir rapor gibi yukarıdan aşağı okunan, tek kaydırma alanlı** sayfa. Kalıcı yan panel yok.

### 9.1 Kabuk

```
┌───────────────────────────────────────────────────────────────┐
│ PazarLab   Analiz · Benchmark · Tartışma · Personalar  ● API ◐│  üst bar (sekmeli nav)
├───────────────────────────────────────────────────────────────┤
│                    içerik  (max-w 1180px, ortalı)             │  tek sayfa kaydırması
└───────────────────────────────────────────────────────────────┘
```

- Sidebar kalkar; görünümler üst bardaki sekmelere taşınır. Mobilde sekmeler yatay kaydırılır.
- Sağ üstte API durumu (gerçek `/api/health` sonucu, yeşil/kırmızı nokta) ve tema düğmesi.
- `h-screen overflow-hidden` ve iç `overflow-y-auto` alanları kaldırılır; sayfa doğal olarak kayar.
- İçerik genişliği 1180 px'de sınırlanır (yaz-planı'ndaki `.wrap` gibi). Geniş ekranda satırlar gereksiz uzamaz.

### 9.2 Form görünümü (simülasyon öncesi)

Faz 13b'den beri: önce link, sonra kontrol; sağda canlı "Hazırlık" paneli.

```
┌ h1 Ürününü test et ─────────────────────── 500 sentetik tüketici · 12 persona · 12 kategori ┐
├ Linkten başla ──────────────────────────────────────────────────────────────────────────────┤
│ [ ürün linki ........................................ ] [Linkten oku]                       │
│ ✓ 5 alan dolduruldu, mavi işaretlileri kontrol et · kategori notu                          │
│ Son ürününden başla: (↺ ürün A) (↺ ürün B)                                                  │
├──────────────────────────────────────────────────────┬──────────────────────────────────────┤
│ 1 Ürün  ✓ tamam                                       │ Hazırlık (yapışkan, top-24)          │
│   kategori · ürün türü / ad · fiyat /                 │ 53 /100 tahmini skor   "cila lazım"  │
│   benzerlerinin ortalama fiyatı · neden alınır /      │ ▬▬▬▬▬▬▬░░░░                          │
│   açıklama (+1,1 puan) · görseller                    │ [skor en fazla 48: sebep] (varsa)    │
│ 2 {Tür} özellikleri        "Doldurdukça skor değişir" │ En çok kazandıracaklar               │
│   alanlar; boş alanda "+X puan" rozeti                │  Kalıp            +5,5  (tık → alan) │
│ 3 Kitle ve satış koşulları                            │ Doldurulması gereken: …              │
│   yaş · cinsiyet · segment · kargo / iade · garanti   │ [   Simülasyonu başlat   ]           │
│                                                       │ Taslak saklanıyor · Formu temizle    │
└──────────────────────────────────────────────────────┴──────────────────────────────────────┘
```

- Masaüstünde `lg:grid-cols-[minmax(0,1fr)_340px]`; panel üst menünün altında yapışır (`lg:top-24`, menü 68 px). Mobilde panel formun sonunda, ekranın altında tek satırlık yapışkan çubuk: tahmini skor + öneri sayısı (panele atlar) + "Başlat".
- **Canlı tahmin:** `/api/draft-check` (AI yok, ~350 ms), yazmayı bıraktıktan 700 ms sonra. Bütün denemeler aynı kalabalıkla koştuğu için "+X puan" o alanın kendi etkisi. Girdi zayıfsa skor tavanı (35/48/55) gösterilir ve tavan kalkana kadar alan önerisi verilmez (hepsi aynı "+0,7" görünürdü).
- **Dürüst varsayılanlar:** özellik seçimleri "Seçin" ile başlar ve "Belirtilmedi" ile temizlenebilir; yaş "Tüm yaşlar", cinsiyet "Herkes". Kullanıcının seçmediği bir değer skora girmez.
- **Linkten dolanlar** "linkten" chip'iyle (vurgu rengi) işaretlenir; kullanıcı alanı değiştirince işaret kalkar.
- Taslak bu tarayıcıda otomatik saklanır (yüklenen fotoğraflar hariç, yalnızca web linkleri); "Formu temizle" siler. Son 3 simülasyonun girdisi "Son ürününden başla" ile forma alınır.
- "Neden simülasyon?" bilgi kartı formun üstünde tek satırlık bir `.note` kutusuna dönüşür.
- Yükleme sırasında form yerinde kalır, üstte ilerleme adımları görünür (input analizi → araştırma → benchmark → simülasyon → tartışma).

### 9.3 Sonuç görünümü (Analiz sekmesi)

```
┌─ KARAR ──────────────────────────────┬─ NE YAPMALI? ────────────────────────────────┐
│   ◯ segmentli halka                  │ Özet (aiInsights.summary, Nunito 18px)         │
│     57  GENEL SKOR                   │ 1  ilk aksiyon                                 │
│   ■ Aldı 306  ■ Kararsız 96  ■ 98    │ 2  ikinci aksiyon                              │
│                                      │ 3  üçüncü aksiyon                              │
│                                      │ ⚠ kritik risk (note kutusu)                    │
│                                      │ [Yeni simülasyon]  [Raporu indir]              │
├──────────┬──────────┬──────────┬─────┴──────┐                                      │
│ Pazar    │ Niyet    │ Problem  │ Tahmini    │   4 KPI: ince bar + mono yüzde        │
│ genişliği│ dönüşümü │ uyumu    │ alıcı      │                                       │
├──────────┴──────────┴──────────┴────────────┴──────────────────────────────────────┤
│ En etkili 3 değişiklik (alıcı + ciro farkı) │ Ağızdan ağıza (4 haftalık çubuk)           │
├──────────────────────────────────────────┴──────────────────────────────────────────┤
│ PERSONALAR  ◯ ◯ ◯ ◯ ◯ ◯  (12 halka kartı, auto-fit minmax(150px,1fr))                │
│             ◯ ◯ ◯ ◯ ◯ ◯  tıklayınca → Tartışma sekmesinde o persona                  │
│ KASABADAN 5 SAKİN  (3 + 2 kart, kurgusal notu)                                       │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ Kim alıyor?  yaş · cinsiyet · gelir · yaşadığı yer (yatay çubuklar, tablo görünümü)  │
├──────────────────────────────────────────┬──────────────────────────────────────────┤
│ Zayıflıklar (renkli başlıklı kart)       │ Kanal önerileri (renkli başlıklı kart)    │
├──────────────────────────────────────────┴──────────────────────────────────────────┤
│ Ürün parametreleri: 11 ince bar, iki sütun (fiyat uyumu, kalite, trend …)            │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ İyileştirilmiş açıklama (kopyala düğmeli)  ·  görseller şeridi                       │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

Kurallar:
- **En önemli şey en üstte:** karar (halka) ve ne yapılacağı (aksiyonlar) ilk ekranda, kaydırmadan görünür.
- Izgaralar içerik sayısına göre kurulur; boş hücre kalmaz (2 kart = 2 sütun, 4 KPI = 4 sütun).
- Kart içi kaydırma yok; uzun listeler "Tümünü göster" ile açılır.
- Mobil: her satır tek sütuna iner; KPI'lar 2×2; persona halkaları yatay kaydırılır.
- Motor v1 ile kaydedilmiş sonuçta (yanıtta `engineVersion` yok) en üstte "Eski motor" notu; kasaba kartları gizlenir.
- "Tahmini alıcı" KPI'ı Monte Carlo aralığını gösterir: `276 (260–289)`; mobilde aralık alt satırda.
- Benchmark ve Tartışma sekmeleri aynı 1180 px okuma düzenini kullanır. Tartışma: solda konuşan persona halkası, sağda mesaj (`slot` kalıbı).

## 10. Stil seçimi geçmişi

Altı yön bir karşılaştırma sayfasında denendi: [PazarLab Stil Karşılaştırma](https://claude.ai/artifact/LhXnSfYCZFTo1JLWRUBhLZ) (özel link). Seçilen: **E. Canlı pazar yeri**.

| Yön | Kısaca | Sonuç |
|---|---|---|
| A. Editoryal defter | Kâğıt/mürekkep, Fraunces, halka grafikler | İlk öneriydi; seçilmedi |
| B. İsviçre veri tasarımı | Beyaz, siyah ızgara, büyük grotesk rakamlar | Seçilmedi; ızgara disiplini rapor/print çıktısında kullanılabilir |
| C. Terminal / Bloomberg | Koyu, mono, amber/yeşil | Seçilmedi |
| D. Yumuşak SaaS | Nötr griler, tek marka rengi | Seçilmedi |
| **E. Canlı pazar yeri** | Eğri kenarlı yuvarlak şekiller, sticker gölgeler, el yazısı notlar, serin kâğıt + canlı vurgular | **Seçildi** |
| F. Defter × Pazar | A'nın düzeni + E'nin dokusu | Seçilmedi |

E'nin renk iterasyonları (geri dönülmemesi gerekenler):
1. İlk sürüm kırmızı/kiremit ağırlıklıydı → "çok kırmızı".
2. Kırmızı kaldırıldı ama şeftali/krem kâğıt kaldı → "çok turuncu, çok sıcak".
3. Serin gri-yeşil zemin, soluk vurgular → "çok soluk".
4. **Serin nötr kâğıt + canlı yeşil/okyanus vurgular** → onaylandı.
