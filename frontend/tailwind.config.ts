import animate from "tailwindcss-animate";
import typography from "@tailwindcss/typography";
import type { Config } from "tailwindcss";

const hsl = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;
const personas = Object.fromEntries(
  Array.from({ length: 12 }, (_, i) => [`persona-${i + 1}`, hsl(`persona-${i + 1}`)])
);

// Tokens live in app/globals.css; DESIGN.md is the source of truth.
const config = {
  darkMode: ["class"],
  // lib/ holds class maps (e.g. decision colours in lib/personas.ts), so it must be scanned too.
  content: ["./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    extend: {
      colors: {
        border: hsl("border"),
        input: hsl("input"),
        ring: hsl("ring"),
        background: hsl("background"),
        foreground: { DEFAULT: hsl("foreground"), 2: hsl("foreground-2") },
        primary: { DEFAULT: hsl("primary"), foreground: hsl("primary-foreground") },
        secondary: { DEFAULT: hsl("secondary"), foreground: hsl("secondary-foreground") },
        destructive: { DEFAULT: hsl("destructive"), foreground: hsl("destructive-foreground") },
        muted: { DEFAULT: hsl("muted"), foreground: hsl("muted-foreground") },
        accent: { DEFAULT: hsl("accent"), foreground: hsl("accent-foreground") },
        popover: { DEFAULT: hsl("popover"), foreground: hsl("popover-foreground") },
        card: { DEFAULT: hsl("card"), foreground: hsl("card-foreground") },
        buy: { DEFAULT: hsl("buy"), text: hsl("buy-text") },
        watch: { DEFAULT: hsl("watch"), text: hsl("watch-text") },
        skip: { DEFAULT: hsl("skip"), text: hsl("skip-text") },
        violet: hsl("violet"),
        ...personas,
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Trebuchet MS", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Trebuchet MS", "sans-serif"],
        hand: ["var(--font-hand)", "cursive"],
        heading: ["var(--font-display)", "Trebuchet MS", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 6px)",
        wobble: "18px 22px 16px 24px / 22px 16px 24px 18px",
        "wobble-lg": "26px 30px 24px 32px",
        tab: "16px 20px 15px 22px",
        blob: "46% 54% 50% 50% / 52% 48% 52% 48%",
      },
      boxShadow: {
        sticker: "3px 4px 0 hsl(var(--shadow-ink))",
        "sticker-sm": "2px 3px 0 hsl(var(--shadow-ink))",
        "sticker-ink": "2px 3px 0 hsl(var(--foreground))",
      },
      maxWidth: {
        page: "1180px",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [animate, typography],
} satisfies Config;

export default config;
