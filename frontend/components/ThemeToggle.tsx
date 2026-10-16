"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useMounted } from "@/lib/hooks";

/** Round sticker button that flips light/dark (DESIGN.md §4). */
export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  const isDark = mounted && resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Aydınlık temaya geç" : "Karanlık temaya geç"}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-foreground bg-card shadow-sticker-ink transition-transform duration-150 hover:-rotate-12"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
