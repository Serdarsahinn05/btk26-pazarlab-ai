"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import personasData from "@/data/personas.json";
import { personaColor, personaLabel } from "@/lib/personas";
import { cn } from "@/lib/utils";

type PersonaType = (typeof personasData.personaTypes)[number];

/** Catalogue of the 12 personas behind the simulation (Personalar tab). */
export default function PersonaLab() {
  const personas = personasData.personaTypes;

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-[clamp(30px,4.5vw,46px)] font-extrabold leading-tight tracking-tight">Personalar</h1>
        <p className="text-foreground-2">
          Simülasyondaki {personas.length} tüketici profili. Her biri {Math.round(500 / personas.length)} civarı sentetik tüketiciyle temsil ediliyor.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {personas.map((persona) => (
          <PersonaCard key={persona.name} persona={persona} />
        ))}
      </div>
    </section>
  );
}

/** Phones show who the persona is; habits, values and fears open on demand. Wider screens show everything. */
function PersonaCard({ persona }: { persona: PersonaType }) {
  const [open, setOpen] = useState(false);
  const color = personaColor(persona.name);
  const detailsId = `persona-${persona.name}-ayrinti`;
  return (
    <article className="card-paper flex flex-col gap-4" style={{ background: `color-mix(in srgb, ${color} 7%, hsl(var(--card)))` }}>
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid h-11 w-11 shrink-0 place-items-center rounded-blob font-display text-lg font-extrabold text-card"
          style={{ background: color }}
        >
          {personaLabel(persona.name).charAt(0)}
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-bold leading-tight">{personaLabel(persona.name)}</h2>
          <span className="chip mt-1.5 text-foreground-2">{persona.personalityType}</span>
        </div>
      </div>

      <p className="font-hand text-xl leading-snug text-foreground-2">“{persona.aiRoleplayPrompt}”</p>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={detailsId}
        className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-bold text-accent md:hidden"
      >
        {open ? "Ayrıntıları gizle" : "Alışkanlık, değerler, korku"}
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      <div id={detailsId} className={cn("mt-auto flex-col gap-4 md:flex", open ? "flex" : "hidden")}>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="font-bold">Alışveriş alışkanlığı</dt>
            <dd className="text-foreground-2">{persona.personalityTraits.shoppingHabit}</dd>
          </div>
          <div>
            <dt className="font-bold">Değerleri</dt>
            <dd className="text-foreground-2">{persona.personalityTraits.values}</dd>
          </div>
        </dl>

        <div className="flex items-end justify-between gap-3 border-t-2 border-dashed border-border pt-3 text-sm">
          <div>
            <span className="block text-xs font-bold text-muted-foreground">En büyük korkusu</span>
            <span className="font-bold text-skip-text">{persona.personalityTraits.biggestFear}</span>
          </div>
          <div className="text-right">
            <span className="block text-xs font-bold text-muted-foreground">Nüfus</span>
            <span className="font-display text-lg font-extrabold">{persona.count}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
