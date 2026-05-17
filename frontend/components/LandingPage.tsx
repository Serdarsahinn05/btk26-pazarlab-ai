"use client";

import Link from "next/link";
import { ArrowRight, BarChart3, Sparkles, Users } from "lucide-react";

import PazarLabBrand from "@/components/PazarLabBrand";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    step: "ADIM 1",
    title: "Ürününüzü Tanımlayın",
    description:
      "E-ticaret linkinden otomatik okuma veya manuel girişle ürün özelliklerini, fiyatını ve hedef kitlenizi sisteme aktarın.",
    icon: Sparkles,
  },
  {
    step: "ADIM 2",
    title: "Sentetik Tüketiciler",
    description:
      "Yapay zeka destekli personalar ürününüzü gerçek alıcılar gibi değerlendirir; tartışır ve satın alma kararı simüle edilir.",
    icon: Users,
  },
  {
    step: "ADIM 3",
    title: "Aksiyon Alınabilir Sonuçlar",
    description:
      "Satış potansiyeli skoru, hedef segmentler ve kanal önerileriyle pazarlama stratejinizi veriye dayalı şekillendirin.",
    icon: BarChart3,
  },
] as const;

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-foreground flex flex-col">
      <header className="px-6 py-5 md:px-10 max-w-6xl mx-auto w-full">
        <PazarLabBrand />
      </header>

      <main className="flex-1 w-full">
        <section className="flex flex-col items-center text-center px-6 pt-16 pb-24 md:pt-24 md:pb-32 max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1]">
            Ürününüzü pazarlamadan
            <br />
            önce{" "}
            <span className="bg-gradient-to-r from-violet-400 via-purple-500 to-indigo-400 bg-clip-text text-transparent">
              test edin.
            </span>
          </h1>

          <p className="mt-6 md:mt-8 text-base md:text-lg text-zinc-400 max-w-2xl leading-relaxed">
            PazarLab AI; ürünlerinizi farklı tüketici kişiliklerine göre analiz eden, 
            yapay zeka destekli bir simülasyon platformudur. Satış potansiyelinizi, 
            hedef kitlenizi ve pazarlama stratejinizi dakikalar içinde keşfedin.
          </p>

          <Link
            href="/dashboard"
            className={cn(
              "mt-10 md:mt-12 inline-flex items-center gap-2 px-8 py-3.5 rounded-full",
              "font-semibold text-white text-base",
              "bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600",
              "shadow-[0_0_40px_-8px_rgba(139,92,246,0.7)]",
              "hover:brightness-110 active:scale-[0.98] transition-all"
            )}
          >
            Simülasyona Başla
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>

        <section className="px-6 pb-20 md:pb-28 max-w-6xl mx-auto w-full">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
              Nasıl çalışır?
            </h2>
            <p className="mt-3 text-zinc-400 text-base md:text-lg">
              Üç adımda ürününüzün pazar performansını öngörün.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
            {STEPS.map((item) => (
              <article
                key={item.step}
                className="rounded-2xl border border-white/[0.06] bg-zinc-950/90 p-6 md:p-7"
              >
                <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center mb-5">
                  <item.icon className="w-5 h-5 text-violet-400" />
                </div>
                <p className="text-[11px] font-bold tracking-[0.2em] text-violet-400 mb-2">
                  {item.step}
                </p>
                <h3 className="text-lg font-bold text-white mb-3">{item.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{item.description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="py-8 px-6 border-t border-white/[0.06]">
        <p className="text-center text-sm text-zinc-500">
          AI destekli sentetik tüketici simülasyonu — e-ticaret analitiği için.
        </p>
      </footer>
    </div>
  );
}
