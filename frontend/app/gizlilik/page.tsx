import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gizlilik · PazarLab AI",
  description: "PazarLab sitesi ve \"PazarLab'a gönder\" tarayıcı eklentisi hangi veriyi nasıl işler.",
};

const UPDATED = "17 Ekim 2026";
const REPO = "https://github.com/Serdarsahinn05/btk26-pazarlab-ai";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-display text-[21px] font-bold">{title}</h2>
      <div className="flex flex-col gap-2 text-foreground-2 [&_li]:ml-5 [&_li]:list-disc">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <article className="mx-auto flex max-w-[720px] flex-col gap-8 leading-relaxed">
      <header className="flex flex-col gap-2">
        <h1 className="squiggle font-display text-[34px] font-extrabold leading-tight tracking-tight">Gizlilik</h1>
        <p className="text-sm text-muted-foreground">Son güncelleme: {UPDATED}</p>
        <p className="text-foreground-2">
          Bu sayfa PazarLab sitesinin ve <b>&quot;PazarLab&apos;a gönder&quot;</b> tarayıcı eklentisinin hangi veriyi, ne için ve ne kadar
          süreyle işlediğini anlatır. Kısaca: hesap yok, çerez yok, reklam yok; veriler satılmaz ve başkasıyla paylaşılmaz.
        </p>
      </header>

      <Section title="Tarayıcı eklentisi">
        <ul>
          <li>Eklenti yalnızca sen düğmesine bastığında ve yalnızca o anda açık olan sekmede çalışır. Arka planda çalışmaz, gezinme geçmişini okumaz, başka sekmelere erişmez.</li>
          <li>Düğmeye bastığında o sayfanın içeriği (stil, görsel dosyaları ve dış script&apos;ler ayıklanmış HTML) ve adresi PazarLab API&apos;sine gönderilir. Amaç yalnızca ürünün adını, fiyatını, açıklamasını, görsel adreslerini, kategorisini ve mağaza puanını okumaktır.</li>
          <li>Gönderilen sayfa okunduktan sonra saklanmaz. Okunan ürün bilgileri, adresin <code>#</code> kısmıyla PazarLab sitesine taşınır; bu kısım sunucuya gitmez.</li>
          <li>Eklenti kendi içinde hiçbir veri saklamaz.</li>
          <li>Eklentinin kullanıcı verisi kullanımı, <a className="text-accent underline" href="https://developer.chrome.com/docs/webstore/program-policies/limited-use" target="_blank" rel="noopener noreferrer">Sınırlı Kullanım</a> gereklilikleri dahil Chrome Web Mağazası Kullanıcı Verileri Politikası&apos;na uyar.</li>
        </ul>
      </Section>

      <Section title="Site">
        <ul>
          <li>Hesap ve giriş yoktur. Çerez veya analiz aracı kullanılmaz.</li>
          <li>Tarayıcında (localStorage) yalnızca son simülasyonların, yarım kalan form taslağının ve tema tercihinin tutulur. Bunlar cihazından çıkmaz; tarayıcı verilerini silerek ya da sitedeki düğmelerle silebilirsin.</li>
          <li>Bir simülasyon başlattığında ürün bilgileri ve sonuç, paylaşım linki çalışsın diye sunucuda <b>90 gün</b> saklanır, sonra silinir. Yüklediğin fotoğraflar saklanmaz. Kayıtlar listelenmez; yalnızca linki bilen açabilir.</li>
        </ul>
      </Section>

      <Section title="Üçüncü taraf hizmetler">
        <ul>
          <li><b>Google Gemini:</b> AI yorumları, persona tartışması ve sohbeti, girdi ve görsel analizi için ürün bilgileri Google&apos;ın Gemini API&apos;sine gönderilir. Bir ürün sayfası okunurken ad veya fiyat gibi temel bilgiler bulunamazsa sayfa içeriğinin temizlenmiş bir kısmı da gönderilebilir.</li>
          <li><b>Serper (Google araması):</b> rakip fiyatlarını bulmak için ürünün adı ve kategorisi arama sorgusu olarak gönderilir.</li>
          <li><b>Vercel ve Render:</b> site ve API bu sağlayıcılarda çalışır; kendi teknik erişim kayıtlarını tutabilirler.</li>
        </ul>
      </Section>

      <Section title="IP adresi">
        <p>
          IP adresin yalnızca kötüye kullanımı önlemek için (dakikalık istek sınırı ve günlük AI kotası) sunucunun belleğinde tutulur. Diske ya da
          uygulama kayıtlarına yazılmaz ve sunucu yeniden başladığında silinir.
        </p>
      </Section>

      <Section title="İletişim">
        <p>
          Soruların ve silme talepleri için{" "}
          <a className="text-accent underline" href={`${REPO}/issues`} target="_blank" rel="noopener noreferrer">GitHub üzerinden</a> yazabilirsin.
          Paylaşım linki olan bir kaydın silinmesini istiyorsan linki de ekle.
        </p>
      </Section>
    </article>
  );
}
