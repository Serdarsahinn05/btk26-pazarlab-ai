"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import TopBar from "@/components/TopBar";

/** Landing renders full-bleed; every other page gets the top bar and a 1180px reading column. */
export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/") {
    return <div className="relative z-10 min-h-screen">{children}</div>;
  }

  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <Suspense fallback={<div className="h-[66px] border-b-2 border-dashed border-border" />}>
        <TopBar />
      </Suspense>
      <main className="mx-auto w-full max-w-page flex-1 px-4 pb-24 pt-6 md:px-6 md:pt-8">{children}</main>
    </div>
  );
}
