"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowDown, ArrowUp } from "lucide-react";
import { Improvement, SegmentRate, SimulationResponse, TownRepresentative } from "@/types";
import { DECISION_LABEL, DECISION_TEXT_CLASS, personaColor } from "@/lib/personas";
import { cn } from "@/lib/utils";

/* Town views of the v2 engine (Faz 12c data): what-ifs, word of mouth, segments and residents.
   Every chart is a single series in --accent; values stay in text colours. */

const tl = (n: number) => `${Math.abs(Math.round(n)).toLocaleString("tr-TR")} TL`;
const pct = (rate: number) => `%${Math.round(rate * 100)}`;

/* ------------------------------ old engine ------------------------------ */

export function LegacyEngineNote() {
  return (
    <p className="note-risk">
      <b className="font-bold text-foreground">Eski motor: </b>
      Bu sonuç önceki simülasyon motoruyla hesaplandı. Yeniden simüle edersen sonuçlar değişebilir; kasaba, segment ve
      iyileştirme kartları yalnızca yeni motorda var.
    </p>
  );
}

/* ------------------------------ improvements ------------------------------ */

export function ImprovementsCard({ items }: { items: Improvement[] }) {
  return (
    <section className="card-paper flex flex-col gap-4">
      <div>
        <h2 className="squiggle text-[21px] font-bold">En etkili 3 değişiklik</h2>
        <p className="mt-2 text-sm text-muted-foreground">Aynı kasabada her değişiklik tek başına denendi.</p>
      </div>
      {items.length === 0 ? (
        <p className="text-foreground-2">Denenen değişikliklerin hiçbiri alıcı sayısını belirgin biçimde artırmadı.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {items.map((item, i) => (
            <li key={item.key} className="flex gap-3">
              <span className="num-badge">{i + 1}</span>
              <div className="flex flex-col gap-0.5 pt-0.5">
                <span className="font-bold">{item.label}</span>
                <span className="text-sm text-foreground-2">
                  <Delta value={item.deltaBuyers} text={`${Math.abs(item.deltaBuyers)} alıcı`} />
                  {" · "}
                  {item.deltaRevenue < 0 ? (
                    <span className="font-bold text-skip-text">ama ciro {tl(item.deltaRevenue)} düşer</span>
                  ) : (
                    <Delta value={item.deltaRevenue} text={`${tl(item.deltaRevenue)} ciro`} />
                  )}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Delta({ value, text }: { value: number; text: string }) {
  const Icon = value < 0 ? ArrowDown : ArrowUp;
  return (
    <span className={cn("inline-flex items-center gap-0.5 font-bold", value < 0 ? "text-skip-text" : "text-buy-text")}>
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {value < 0 ? "−" : "+"}
      {text}
    </span>
  );
}

/* ------------------------------ word of mouth ------------------------------ */

export function WordOfMouthCard({ curve }: { curve: number[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...curve) || 1;
  const direct = curve[0];
  const viaFriends = curve[curve.length - 1] - direct;
  const shown = hover ?? curve.length - 1;

  return (
    <section className="card-paper flex flex-col gap-4">
      <div>
        <h2 className="squiggle text-[21px] font-bold">Ağızdan ağıza</h2>
        <p className="mt-2 text-foreground-2">
          İlk hafta <b className="font-display">{direct}</b> kişi doğrudan aldı;{" "}
          {viaFriends > 0 ? (
            <>
              arkadaş tavsiyesiyle {curve.length} haftada <b className="font-display">+{viaFriends}</b> kişi daha.
            </>
          ) : (
            "arkadaş tavsiyesi yeni alıcı getirmedi."
          )}
        </p>
      </div>
      <figure>
        <figcaption className="mb-1 text-sm font-bold text-foreground-2">Toplam alıcı, haftalara göre</figcaption>
        <div className="flex h-28 items-end gap-2 border-b-2 border-border" onMouseLeave={() => setHover(null)}>
          {curve.map((value, i) => (
            <div
              key={i}
              tabIndex={0}
              aria-label={`${i + 1}. hafta: toplam ${value} alıcı`}
              onMouseEnter={() => setHover(i)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              className="flex h-full flex-1 flex-col justify-end"
            >
              <div
                className={cn("rounded-t-[4px] transition-colors", i === shown ? "bg-accent" : "bg-accent/45")}
                style={{ height: `${(value / max) * 100}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-2 text-center text-xs text-muted-foreground" aria-hidden>
          {curve.map((_, i) => (
            <span key={i} className="flex-1">{i + 1}. hafta</span>
          ))}
        </div>
        <p className="mt-2 text-sm text-foreground-2" aria-live="polite">
          <b className="font-display">{shown + 1}. hafta:</b> toplam {curve[shown]} alıcı
          {shown > 0 && ` (o hafta +${curve[shown] - curve[shown - 1]})`}
        </p>
      </figure>
    </section>
  );
}

/* ------------------------------ segments ------------------------------ */

const SEGMENT_TITLES: Record<keyof NonNullable<SimulationResponse["segments"]>, string> = {
  age: "Yaş",
  gender: "Cinsiyet",
  incomeLevel: "Gelir",
  cityType: "Yaşadığı yer",
};

export function SegmentsCard({ segments }: { segments: NonNullable<SimulationResponse["segments"]> }) {
  const [showTable, setShowTable] = useState(false);
  const groups = (Object.keys(SEGMENT_TITLES) as Array<keyof typeof SEGMENT_TITLES>)
    .map((key) => ({ key, title: SEGMENT_TITLES[key], rows: segments[key] ?? [] }))
    .filter((g) => g.rows.length > 0);

  return (
    <section className="card-paper flex flex-col gap-4">
      <div>
        <h2 className="squiggle text-[21px] font-bold">Kim alıyor?</h2>
        <p className="mt-2 text-sm text-muted-foreground">Her grupta ürünü alan sakinlerin oranı.</p>
      </div>
      {showTable ? (
        <SegmentTable groups={groups} />
      ) : (
        <div className="grid gap-x-10 gap-y-5 md:grid-cols-2">
          {groups.map((g) => (
            <SegmentBars key={g.key} title={g.title} rows={g.rows} />
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setShowTable((v) => !v)}
        className="self-start text-sm font-bold text-accent underline-offset-2 hover:underline"
      >
        {showTable ? "Grafik olarak göster" : "Tablo olarak göster"}
      </button>
    </section>
  );
}

function SegmentBars({ title, rows }: { title: string; rows: SegmentRate[] }) {
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-sm font-bold text-foreground-2">{title}</figcaption>
      {rows.map((row) => (
        <div
          key={row.label}
          className="grid grid-cols-[6.5rem_1fr_2.75rem] items-center gap-2 text-sm"
          title={`${row.label}: ${row.residents} sakinin ${pct(row.buyRate)}'i aldı`}
        >
          <span className="truncate text-foreground-2">{row.label}</span>
          <div className="h-3 rounded-r-[4px] bg-secondary" aria-hidden>
            <div className="h-full rounded-r-[4px] bg-accent" style={{ width: `${Math.max(1, row.buyRate * 100)}%` }} />
          </div>
          <span className="text-right font-display font-extrabold">{pct(row.buyRate)}</span>
        </div>
      ))}
    </figure>
  );
}

function SegmentTable({ groups }: { groups: Array<{ key: string; title: string; rows: SegmentRate[] }> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[320px] text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="py-1 pr-3 font-bold">Grup</th>
            <th className="py-1 pr-3 font-bold">Segment</th>
            <th className="py-1 pr-3 text-right font-bold">Sakin</th>
            <th className="py-1 text-right font-bold">Alma oranı</th>
          </tr>
        </thead>
        <tbody>
          {groups.flatMap((g) =>
            g.rows.map((row) => (
              <tr key={`${g.key}-${row.label}`} className="border-t border-dashed border-border">
                <td className="py-1 pr-3 text-muted-foreground">{g.title}</td>
                <td className="py-1 pr-3">{row.label}</td>
                <td className="py-1 pr-3 text-right">{row.residents}</td>
                <td className="py-1 text-right font-bold">{pct(row.buyRate)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------ residents ------------------------------ */

// Drawn avatars in public/pp_icons (1–10). Each resident keeps the same one; the cast on screen never repeats one.
const AVATAR_COUNT = 10;

function pickAvatars(residents: TownRepresentative[]): number[] {
  const used = new Set<number>();
  return residents.map((r) => {
    let n = (Number(r.id.replace(/\D/g, "")) || 0) % AVATAR_COUNT;
    while (used.has(n) && used.size < AVATAR_COUNT) n = (n + 1) % AVATAR_COUNT;
    used.add(n);
    return n + 1;
  });
}

export function TownCast({ residents }: { residents: TownRepresentative[] }) {
  const avatars = pickAvatars(residents);
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="squiggle text-[21px] font-bold">Kasabadan {residents.length} sakin</h2>
        <span className="text-sm text-muted-foreground">Sakinler kurgusaldır; kararları simülasyondan gelir.</span>
      </div>
      {/* Phones: a swipeable row (like the persona rings). Wider: wrapping flex, 5 cards leave no empty cell. */}
      <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-3 *:w-[85%] *:shrink-0 *:snap-start md:mx-0 md:flex-wrap md:overflow-visible md:px-0 md:pb-0 md:*:w-auto md:*:min-w-0 md:*:shrink md:*:grow md:*:basis-[300px]">
        {residents.map((r, i) => (
          <ResidentCard key={r.id} resident={r} avatar={avatars[i]} />
        ))}
      </div>
    </section>
  );
}

/** "hemşire olarak çalışıyor" → "Hemşire"; other phrasings ("kendi şirketini yönetiyor") stay as they are. */
function shortOccupation(occupation: string): string {
  const title = occupation.replace(/ olarak çalışıyor$/, "");
  return title === occupation ? occupation : title.charAt(0).toLocaleUpperCase("tr") + title.slice(1);
}

function ResidentCard({ resident: r, avatar }: { resident: TownRepresentative; avatar: number }) {
  return (
    <article className="card-paper flex flex-col gap-3 p-4! md:p-5!">
      <div className="flex items-start gap-3">
        {/* Decorative: the name next to it says who this is. */}
        <Image
          src={`/pp_icons/${avatar}.jpeg`}
          alt=""
          width={56}
          height={56}
          className="h-14 w-14 shrink-0 rounded-blob border-2 border-border object-cover"
        />
        <div className="flex min-w-0 grow flex-col">
          <h3 className="font-display text-lg font-bold leading-tight">{r.name}</h3>
          <span className="text-sm text-muted-foreground">
            {r.age} · {r.city} · {shortOccupation(r.occupation)}
          </span>
        </div>
        <span className={cn("chip shrink-0 self-start", DECISION_TEXT_CLASS[r.decision])}>{DECISION_LABEL[r.decision]}</span>
      </div>
      <span className="inline-flex items-center gap-2 text-sm font-bold text-foreground-2">
        <span aria-hidden className="h-3 w-3 rounded-full border border-foreground/30" style={{ background: personaColor(r.persona) }} />
        {r.persona}
      </span>
      <p className="text-foreground-2">{r.reason}</p>
      <details className="group text-sm">
        <summary className="cursor-pointer font-bold text-accent underline-offset-2 hover:underline">Hikâyesi</summary>
        <p className="mt-2 text-foreground-2">{r.story}</p>
      </details>
    </article>
  );
}
