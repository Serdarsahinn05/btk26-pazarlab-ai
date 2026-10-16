# PazarLab AI — Tasarım Sistemi

> Bu dosya projenin tasarım otoritesidir. Palet, font ve bileşen kararlarında
> herhangi bir araç veya öneri bu dosyayla çelişirse bu dosya geçerlidir.

## 1. Yön: "Editoryal araştırma defteri"

PazarLab bir pazar araştırması aracıdır; arayüzü de bir araştırmacının defteri gibi
görünmeli: kâğıt zemin, mürekkep metin, ince çizgiler, verinin kendisinden gelen renk.
Kaynak ilham: `yaz-plani.html` (kâğıt/mürekkep paleti, Fraunces başlıklar, mono veri
etiketleri, halka grafikler).

**Bıraktıklarımız:** neon glow, mor/indigo gradyan, `glass` bulanıklığı, nokta grid zemin,
`font-black` + `tracking-tighter` başlıklar, 8–10 px etiketler.

**İlkeler**
1. Renk veri taşır, süs değildir. Renk = karar (al/izle/geç) veya persona kimliği.
2. Sayılar mono fontla, metin Inter ile, başlıklar Fraunces ile yazılır.
3. Açık tema varsayılan (sistem tercihine uyar); koyu tema aynı token'larla eşdeğer kalitede.
4. Her etkileşimli öğe klavyeyle ulaşılabilir ve görünür odak halkasına sahiptir.

## 2. Token'lar

`frontend/app/globals.css` içinde shadcn HSL formatında tanımlanır (`--x: H S% L%`),
`tailwind.config.ts` içinde `hsl(var(--x))` olarak eşlenir. Bileşenlerde ham hex,
`rgba(...)`, `text-white`, `bg-zinc-*`, `violet-*` vb. **kullanılmaz**.

### 2.1 Yüzey ve metin

| Token | Açık (`:root`) | Koyu (`.dark`) | Kullanım |
|---|---|---|---|
| `--background` | `#f0ece3` | `#14151a` | Sayfa zemini (kâğıt) |
| `--background-2` | `#e5e0d4` | `#22242c` | Hover, ray, ilerleme barı zemini |
| `--card` | `#fbf9f4` | `#1b1d24` | Kart, input, panel |
| `--foreground` | `#12131a` | `#eceae4` | Ana metin (mürekkep) |
| `--foreground-2` | `#2a2c38` | `#c8c5bd` | İkincil vurgu metni |
| `--muted-foreground` | `#6f6a5e` | `#9a968c` | Açıklama, etiket |
| `--border` | `#c9c2b2` | `#363943` | Çizgi, kart kenarı |
| `--primary` | = foreground | = foreground | Birincil düğme zemini |
| `--primary-foreground` | = background | = background | Birincil düğme metni |
| `--ring` | `#3b6ea5` | `#5b93cc` | Odak halkası |
| `--grid-op` | `.16` | `.07` | Defter çizgisi opaklığı |

### 2.2 Karar renkleri (anlamsal)

| Token | Açık | Koyu | Anlam |
|---|---|---|---|
| `--buy` | `#2f8f6d` | `#4bb98d` | Aldı / pozitif |
| `--watch` | `#b5622a` | `#d98546` | Kararsız / dikkat |
| `--skip` | `#c0392b` | `#e0685a` | Almadı / risk / hata |
| `--done-bg` | `#eef3ec` | `#1d2a22` | Başarı yüzeyi |
| `--done-line` | `#b9cdb4` | `#3d5c48` | Başarı kenarı |

### 2.3 Persona renkleri

12 persona sabit sırayla (`backend/app/data/personas.json` → `personaTypes` sırası)
`--persona-1 … --persona-12` alır. İsimle değil **index ile** eşlenir; böylece yeni persona
eklemek veya isim değiştirmek rengi bozmaz.

| # | Açık | Koyu | # | Açık | Koyu |
|---|---|---|---|---|---|
| 1 | `#3b6ea5` | `#5b93cc` | 7 | `#1f9ca8` | `#3bc0cc` |
| 2 | `#c23f5e` | `#e0687f` | 8 | `#6b7a2a` | `#a3b356` |
| 3 | `#2f8f6d` | `#4bb98d` | 9 | `#9a6b12` | `#d4a03c` |
| 4 | `#8a4fbd` | `#a877d9` | 10 | `#5a5f73` | `#9aa0b5` |
| 5 | `#b5622a` | `#d98546` | 11 | `#a8456f` | `#d4779c` |
| 6 | `#24578a` | `#6fa3d6` | 12 | `#4a7a5c` | `#7fb592` |

Renkli zemin üzerindeki metin her zaman `#fff` (açık) veya `--background` (koyu); kontrast
≥ 4.5:1 kontrol edilir.

### 2.4 Şekil ve gölge

| Token | Değer |
|---|---|
| `--radius` | `14px` (kart), `10px` (satır), `8px` (input/düğme), `4px` (etiket chip) |
| `--shadow` | `0 1px 0 rgb(18 19 26 / .06), 0 8px 24px -12px rgb(18 19 26 / .25)` |
| `--hover-shadow` | `0 12px 28px -14px rgb(18 19 26 / .4)` |
| Kenar | `1.5px solid hsl(var(--border))` — kartların imzası |

Koyu temada gölge opaklıkları `.3 / .7 / .9`'a çıkar.

## 3. Tipografi

| Rol | Font | Boyut / ağırlık | Not |
|---|---|---|---|
| Display (h1) | Fraunces | `clamp(34px, 5.2vw, 54px)` / 900, `leading-[.95]`, `-0.02em` | Alt satır `<em>` italik 400, `--muted-foreground`, `.42em` |
| h2 | Fraunces | 26px / 600 | Bölüm başlığı + altında `.sub` açıklama (13.5px muted) |
| h3 | Fraunces | 19–24px / 600 | Kart başlığı |
| Gövde | Inter | 15px / 400, `leading-[1.55]` | |
| Etiket / sekme | Inter | 13px / 600, uppercase, `tracking-[.03em]` | |
| Veri / sayı | JetBrains Mono | 12–40px / 600, `tracking-[-.03em]` büyük sayılarda | Yüzdeler, sayaçlar, chip'ler |

- Fontlar `next/font/google` ile yüklenir: `--font-display`, `--font-sans`, `--font-mono`;
  `tailwind.config.ts` → `fontFamily.display/sans/mono`.
- **Minimum metin boyutu 12px.** Mono chip'ler için tek istisna 10.5px (yalnızca büyük harf kısaltma).
- Arayüz metni Türkçe karakterlerle yazılır ("Ürün Adı", "Kıyafet").

## 4. Zemin

```css
body::before{
  content:'';position:fixed;inset:0;pointer-events:none;z-index:0;
  background-image:linear-gradient(hsl(var(--border)) 1px,transparent 1px);
  background-size:100% 34px;opacity:var(--grid-op);
}
```

## 5. Bileşen kalıpları

| Kalıp | Tanım | PazarLab'da |
|---|---|---|
| **Segmentli halka** | SVG, r=52, stroke 9, `stroke-dasharray` ile ardışık dilimler, ortada mono büyük sayı + uppercase küçük etiket | `OverallScoreCard`: al/izle/geç dilimleri + genel skor |
| **Halka kartı** (`ringbox`) | Kart içinde 112px halka, ad, mono `x / y`; hover'da `-3px` yükselme + sağ üstte `→`; tıklayınca hedef bölüme kaydırıp 1.4s `flash` | Persona kartları → debate'te ilgili personaya gider |
| **Sekmeli nav** | Alt kenarı 2px mürekkep çizgi; aktif sekme kenarlı, alt kenarı zeminle birleşir | Dashboard görünümleri (Analiz / Benchmark / Tartışma / Personalar) |
| **İnce ilerleme barı** | 6px yükseklik, `--background-2` ray, mürekkep dolgu, sağda mono yüzde | Normalize skorlar |
| **Renkli başlıklı kart** (`course`) | Üst şerit anlamsal renk + beyaz Fraunces başlık + sağda mono yüzde | Kanal önerileri, zayıflıklar, benchmark |
| **Sol kenarlı satır** (`slot`) | `border-left: 4px` persona/karar rengi, mono etiket chip'i, metin | Debate mesajları, tavsiye maddeleri |
| **Not kutusu** (`note`) | Kart + `border-left: 4px` mürekkep, muted metin, `<b>` mürekkep | Girdi uyarısı (AnalysisWarning), bilgi notları |
| **Durum toast'u** (`savestat`) | Alt-orta sabit, mono 12px, pill; durumlar `pending / ok / retry / fail`; `fail` içinde "Tekrar dene" düğmesi | API hataları, simülasyon durumu |
| **Tema düğmesi** | 42px yuvarlak, kenarlı; hover'da `-18deg` dönüş; `◐` / `☀` | Üst bar |
| **Mono sayaç** | Sol 2px mürekkep çizgi, büyük mono sayı + küçük açıklama | Landing istatistikleri |

Düğmeler: birincil = mürekkep zemin + kâğıt metin; ikincil = `--card` zemin + kenar, hover'da
mürekkebe döner. Input: `--card` zemin, 1.5px kenar, odakta `outline: 2px solid` mürekkep.

## 6. Hareket

- Sayfa/sekme geçişi: `opacity 0→1`, `translateY(6px)→0`, 300ms ease.
- Halka dolumu: `stroke-dasharray`/`dashoffset`, 800–900ms `cubic-bezier(.22,1,.36,1)`.
- Hover: 160–180ms.
- `prefers-reduced-motion: reduce` → tüm animasyon/transition 0.01ms; confetti ve sonsuz
  pulse/float **çalışmaz**.

## 7. Erişilebilirlik kuralları

- İkon düğmelerinde `aria-label` zorunlu.
- Odak: `focus-visible:outline-2 outline-offset-2 outline-[hsl(var(--ring))]`.
- Modal: `role="dialog"`, `aria-modal`, odak tuzağı, Esc ile kapanma.
- Dosya yükleme alanı `<label>` + görünmez ama odaklanabilir input.
- Kontrast: gövde ≥ 4.5:1, büyük metin ≥ 3:1 (her iki tema).
- 375px genişlikte yatay kaydırma olmaz; yan boşluk 16px.

## 8. Yasaklar

- Yeni UI/animasyon kütüphanesi eklemek (mevcut: Tailwind v3, shadcn, framer-motion, lucide).
- Ham renk değerleri ve Tailwind palet renkleri (`blue-500`, `zinc-900` …) bileşen içinde.
- Tailwind v4 sözdizimi (`ring-3`, `rounded-4xl`, `size-3!`, `data-horizontal:`) — proje v3.
- Sahte durum verisi ("CONNECTED 12ms" gibi) göstermek.

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

```
┌ h1 Ürününü test et ───────────────────────── em: 500 sentetik tüketici · 12 persona ┐
├──────────────────────────────┬───────────────────────────────────────────────────────┤
│ 1 · Link ile doldur  [____][Oku]                                                     │
├──────────────────────────────┼───────────────────────────────────────────────────────┤
│ 2 · Temel bilgiler           │ 3 · Kategoriye özel özellikler                        │
│   kategori, motivasyon       │   (kumaş / RAM / ekran …)                             │
│   ad, fiyat, açıklama        │ 4 · Hedef kitle                                       │
│   görseller (6 kutu)         │ 5 · Satış koşulları (kargo, iade, garanti)            │
├──────────────────────────────┴───────────────────────────────────────────────────────┤
│ ▸ yapışkan alt çubuk:  eksik alan sayısı · tahmini süre ~20 sn      [Simülasyonu başlat] │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

- Masaüstünde iki sütun (`lg:grid-cols-[1fr_1fr]`), mobilde tek sütun. Bölümler numaralı mono rozetle (`1 ·`) başlar.
- Gönderme düğmesi `position: sticky; bottom: 0` olan bir çubukta; her zaman görünür.
- "Neden simülasyon?" bilgi kartı formun üstünde tek satırlık bir `.note` kutusuna dönüşür.
- Yükleme sırasında form yerinde kalır, üstte ilerleme adımları görünür (input analizi → araştırma → benchmark → simülasyon → tartışma).

### 9.3 Sonuç görünümü (Analiz sekmesi)

```
┌─ KARAR ──────────────────────────────┬─ NE YAPMALI? ────────────────────────────────┐
│   ◯ segmentli halka                  │ Özet (aiInsights.summary, Fraunces 20px)       │
│     57  GENEL SKOR                   │ 1  ilk aksiyon                                 │
│   ■ Aldı 306  ■ Kararsız 96  ■ 98    │ 2  ikinci aksiyon                              │
│                                      │ 3  üçüncü aksiyon                              │
│                                      │ ⚠ kritik risk (note kutusu)                    │
│                                      │ [Yeni simülasyon]  [Raporu indir]              │
├──────────┬──────────┬──────────┬─────┴──────┐                                      │
│ Pazar    │ Niyet    │ Problem  │ Tahmini    │   4 KPI: ince bar + mono yüzde        │
│ genişliği│ dönüşümü │ uyumu    │ alıcı      │                                       │
├──────────┴──────────┴──────────┴────────────┴──────────────────────────────────────┤
│ PERSONALAR  ◯ ◯ ◯ ◯ ◯ ◯  (12 halka kartı, auto-fit minmax(150px,1fr))                │
│             ◯ ◯ ◯ ◯ ◯ ◯  tıklayınca → Tartışma sekmesinde o persona                  │
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
- Benchmark ve Tartışma sekmeleri aynı 1180 px okuma düzenini kullanır. Tartışma: solda konuşan persona halkası, sağda mesaj (`slot` kalıbı).

## 10. Değerlendirilen alternatif stiller

Seçilen yön editoryal defter (§1). Karşılaştırma için değerlendirilen diğer yönler:

| Yön | Kısaca | Artısı | Eksisi |
|---|---|---|---|
| **A. Editoryal defter** (seçili) | Kâğıt/mürekkep, Fraunces, halka grafikler | Ayırt edici; "araştırma raporu" hissi verisine güven katar; açık/koyu tema dengeli | Serif başlıklar teknik kitleye ilk anda alışılmadık gelebilir |
| B. İsviçre veri tasarımı | Beyaz zemin, siyah ızgara, büyük grotesk rakamlar (Inter Tight), tek vurgu rengi | Çok okunaklı, yoğun veriyi en iyi taşır, yazdırılabilir rapora çok uygun | Soğuk ve kurumsal; markayı daha az hatırlatır |
| C. Terminal / Bloomberg | Koyu zemin, mono ağırlıklı, amber/yeşil veri renkleri, yoğun tablolar | Mevcut koyu temadan en az geçiş eforu; "güç kullanıcısı" hissi | Yeni başlayan satıcıyı korkutur; mevcut neon görünümün sorunlarını tekrarlama riski |
| D. Yumuşak SaaS (Linear/Vercel çizgisi) | Nötr griler, ince kenarlar, tek marka rengi, bol boşluk | Tanıdık, güvenli, shadcn ile en hızlı uygulanır | Sıradan; PazarLab'ı diğer AI araçlarından ayırmaz |
| E. Sıcak pazar yeri | Toprak tonları, el çizimi ikonlar, hafif doku | Türk e-ticaret satıcısına samimi, akılda kalıcı | İllüstrasyon üretimi gerekir; veri yoğun ekranlarda dağınık görünebilir. İlk prototipte kırmızı ağırlığı fazla bulundu |
| F. Defter × Pazar | A'nın düzeni + E'nin sıcaklığı: kâğıt/mürekkep, Fraunces; kâğıt dokusu, başlık altı el çizimi dalga, tek kenar notu; terracotta yalnızca dalgada | Ayırt edici ama sakin; uzun okumada yormaz | El yazısı detayları dozunda tutulmazsa dağınık görünebilir |

Karşılaştırma sayfası (6 stil, açık/koyu, 375 px): [PazarLab Stil Karşılaştırma](https://claude.ai/artifact/LhXnSfYCZFTo1JLWRUBhLZ) (özel link). F stilinin token değerleri kullanıcı onaylarsa §2'ye taşınır.

**Öneri:** A ile devam. Benchmark ve rapor dışa aktarımı (Faz 5a) için B'nin ızgara ve rakam disiplini A'nın içine alınabilir (yazdırma CSS'i). C ve D yalnızca kullanıcı testinde A beğenilmezse yeniden değerlendirilir.
