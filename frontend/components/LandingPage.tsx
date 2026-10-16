import Link from "next/link";
import { ArrowRight } from "lucide-react";

import PazarLabBrand from "@/components/PazarLabBrand";
import ThemeToggle from "@/components/ThemeToggle";
import { SegmentRing } from "@/components/ui/ring";

const STEPS = [
  {
    title: "Ürününüzü tanımlayın",
    description: "E-ticaret linkinden otomatik okuma ya da elle girişle ürün özelliklerini, fiyatını ve hedef kitlenizi aktarın.",
  },
  {
    title: "Sentetik tüketiciler karar versin",
    description: "12 persona altında 500 sentetik tüketici ürünü gerçek alıcılar gibi değerlendirir; personalar kendi aralarında tartışır.",
  },
  {
    title: "Aksiyon alın",
    description: "Satış potansiyeli, hedef segmentler, kritik riskler ve kanal önerileriyle stratejinizi veriye dayandırın.",
  },
];

const STATS = [
  { value: "500", label: "sentetik tüketici" },
  { value: "12", label: "persona" },
  { value: "10", label: "kategori" },
];

// Static preview of the result ring, so visitors see what they get.
const PREVIEW = [
  { label: "Aldı", value: 306, color: "hsl(var(--buy))" },
  { label: "Kararsız", value: 96, color: "hsl(var(--watch))" },
  { label: "Almadı", value: 98, color: "hsl(var(--skip))" },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-page items-center justify-between px-4 py-5 md:px-6">
        <PazarLabBrand />
        <ThemeToggle />
      </header>

      <main className="mx-auto w-full max-w-page flex-1 px-4 md:px-6">
        <section className="grid items-center gap-10 py-10 md:py-16 lg:grid-cols-[7fr_5fr]">
          <div>
            <h1 className="text-[clamp(38px,6vw,68px)] font-extrabold leading-[1.02] tracking-tight">
              Ürününüzü pazarlamadan önce <span className="squiggle text-primary">test edin.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-foreground-2">
              PazarLab AI; ürünlerinizi farklı tüketici kişiliklerine göre analiz eden, yapay zekâ destekli bir simülasyon
              platformudur. Satış potansiyelinizi, hedef kitlenizi ve pazarlama stratejinizi dakikalar içinde keşfedin.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/dashboard" className="btn-sticker-primary px-6 py-3 text-base">
                Simülasyona başla <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <span className="-rotate-3 font-hand text-2xl text-foreground-2">ücretsiz, kayıt yok</span>
            </div>
            <dl className="mt-10 flex flex-wrap gap-4">
              {STATS.map((s) => (
                <div key={s.label} className="card-paper !px-5 !py-3">
                  <dt className="sr-only">{s.label}</dt>
                  <dd className="font-display text-3xl font-extrabold leading-none">{s.value}</dd>
                  <dd className="mt-1 text-sm font-bold text-muted-foreground">{s.label}</dd>
                </div>
              ))}
            </dl>
          </div>

          <figure className="card-paper relative mx-auto w-full max-w-sm rotate-1">
            <figcaption className="squiggle font-display text-lg font-bold">Örnek sonuç</figcaption>
            <div className="mt-4">
              <SegmentRing segments={PREVIEW} size={240}>
                <span className="font-display text-5xl font-extrabold leading-none">57</span>
                <span className="text-xs font-bold text-muted-foreground">genel skor / 100</span>
              </SegmentRing>
            </div>
            <ul className="mt-4 flex justify-center gap-4 text-sm font-bold">
              {PREVIEW.map((s) => (
                <li key={s.label} className="flex items-center gap-1.5">
                  <span aria-hidden className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                  {s.label} {s.value}
                </li>
              ))}
            </ul>
            <span aria-hidden className="absolute -top-4 right-4 rotate-6 font-hand text-2xl text-foreground-2">satışa yakın!</span>
          </figure>
        </section>

        <section className="pb-20 pt-6 md:pb-28">
          <h2 className="squiggle text-3xl font-extrabold">Nasıl çalışır?</h2>
          <ol className="mt-8 grid gap-5 md:grid-cols-3">
            {STEPS.map((item, index) => (
              <li key={item.title} className="card-paper tilt-odd space-y-3">
                <span className="num-badge" aria-hidden>{index + 1}</span>
                <h3 className="text-lg font-bold">{item.title}</h3>
                <p className="text-foreground-2">{item.description}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="border-t-2 border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        AI destekli sentetik tüketici simülasyonu · sonuçlar talep sinyalidir, satış garantisi değildir.
      </footer>
    </div>
  );
}
