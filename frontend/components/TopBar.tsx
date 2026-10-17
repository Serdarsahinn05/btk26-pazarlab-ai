"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import PazarLabBrand from "@/components/PazarLabBrand";
import ThemeToggle from "@/components/ThemeToggle";
import ApiStatusDot from "@/components/ApiStatusDot";

export const DASHBOARD_VIEWS = [
  { id: "analysis", label: "Analiz" },
  { id: "benchmark", label: "Benchmark" },
  { id: "debate", label: "Tartışma" },
  { id: "personas", label: "Personalar" },
] as const;

export type DashboardView = (typeof DASHBOARD_VIEWS)[number]["id"];

/** Dashboard header: brand, pill tabs (scroll sideways on phones), API status, theme. */
export default function TopBar() {
  const params = useSearchParams();
  const current = params.get("view") || "analysis";
  // Keep an opened/shared result (?r=) while switching tabs.
  const resultId = params.get("r");
  const hrefFor = (view: string) => `/dashboard?view=${view}${resultId ? `&r=${encodeURIComponent(resultId)}` : ""}`;
  const ref = useRef<HTMLElement>(null);

  // --topbar-h: where sticky bars below the header start (the header wraps to two rows on phones).
  useEffect(() => {
    const header = ref.current;
    if (!header) return;
    const update = () => document.documentElement.style.setProperty("--topbar-h", `${header.offsetHeight}px`);
    const observer = new ResizeObserver(update);
    observer.observe(header);
    update();
    return () => observer.disconnect();
  }, []);

  return (
    <header ref={ref} className="no-print sticky top-0 z-40 border-b-2 border-dashed border-border bg-background/95 backdrop-blur-xs">
      <div className="mx-auto flex min-h-[66px] max-w-page flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2 md:px-6">
        <PazarLabBrand />
        <nav aria-label="Görünümler" className="order-3 -mx-1 flex w-full gap-1.5 overflow-x-auto px-1 pb-1 sm:order-0 sm:w-auto sm:pb-0">
          {DASHBOARD_VIEWS.map((view) => {
            const active = current === view.id;
            return (
              <Link
                key={view.id}
                href={hrefFor(view.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap border-2 px-3.5 py-1.5 text-sm font-bold transition-colors",
                  active
                    ? "rounded-tab border-primary bg-primary text-primary-foreground shadow-sticker-sm"
                    : "rounded-full border-transparent text-foreground-2 hover:bg-secondary"
                )}
              >
                {view.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <ApiStatusDot />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
