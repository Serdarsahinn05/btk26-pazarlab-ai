"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/* Result page scaffolding (Faz 15): a sticky bar with the verdict and section links, and collapsible sections. */

/** Anchored sections stop below the top bar and the result bar instead of under them. */
export const SECTION_SCROLL_MARGIN = "scroll-mt-[calc(var(--topbar-h,68px)+76px)]";

export interface ResultSection {
  id: string;
  label: string;
}

export function ResultNav({ sections, verdict }: { sections: ResultSection[]; verdict: React.ReactNode }) {
  const [active, setActive] = useState(sections[0]?.id);
  // The verdict joins the bar only once the decision card has scrolled away; above it would repeat the card.
  const [showVerdict, setShowVerdict] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      // A section counts as "here" while it crosses the upper third of the screen.
      { rootMargin: "-30% 0px -60% 0px" },
    );
    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  // Phones: the link list scrolls sideways, so keep the current section's link in view.
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const list = listRef.current;
    const link = list?.querySelector<HTMLElement>('[aria-current="location"]');
    if (list && link) list.scrollTo({ left: link.offsetLeft - list.offsetLeft - 16, behavior: "smooth" });
  }, [active]);

  useEffect(() => {
    const card = document.getElementById("karar-karti");
    if (!card) return;
    const observer = new IntersectionObserver(([entry]) => setShowVerdict(!entry.isIntersecting), { rootMargin: "-120px 0px 0px 0px" });
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Sonuç bölümleri"
      className="no-print sticky top-[var(--topbar-h,68px)] z-30 -mx-4 border-b-2 border-dashed border-border bg-background/95 px-4 py-1.5 backdrop-blur-xs md:mx-0 md:px-0"
    >
      <div className="flex items-center gap-3">
        {showVerdict && <div className="shrink-0 text-sm font-bold">{verdict}</div>}
        <ul ref={listRef} className="-my-1 flex min-w-0 gap-1.5 overflow-x-auto py-1">
          {sections.map(({ id, label }) => (
            <li key={id} className="shrink-0">
              <a
                href={`#${id}`}
                aria-current={active === id ? "location" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center rounded-full px-3.5 text-sm font-bold transition-colors",
                  active === id ? "bg-primary text-primary-foreground" : "text-foreground-2 hover:bg-secondary",
                )}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

/** A section whose body mounts only when opened (so tools inside fetch nothing until then). Opens itself for printing. */
export function Disclosure({
  id, title, summary, defaultOpen = false, children,
}: {
  id: string;
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = `${id}-icerik`;

  useEffect(() => {
    const openForPrint = () => setOpen(true);
    window.addEventListener("beforeprint", openForPrint);
    return () => window.removeEventListener("beforeprint", openForPrint);
  }, []);

  return (
    <section id={id} className={cn("flex flex-col gap-4", SECTION_SCROLL_MARGIN)}>
      <h2 className="text-[21px] font-bold">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-wobble border-2 border-dashed border-border px-4 py-2.5 text-left transition-colors hover:bg-secondary"
        >
          <span className="flex flex-col">
            <span className="squiggle">{title}</span>
            {summary && <span className="mt-2 text-sm font-semibold text-muted-foreground">{summary}</span>}
          </span>
          <ChevronDown className={cn("h-5 w-5 shrink-0 transition-transform", open && "rotate-180")} aria-hidden />
        </button>
      </h2>
      {open && <div id={panelId}>{children}</div>}
    </section>
  );
}
