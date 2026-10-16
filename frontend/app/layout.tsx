import type { Metadata } from "next";
import { Bricolage_Grotesque, Caveat, Nunito } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import LayoutShell from "@/components/LayoutShell";

const display = Bricolage_Grotesque({ subsets: ["latin", "latin-ext"], variable: "--font-display", weight: ["500", "700", "800"] });
const sans = Nunito({ subsets: ["latin", "latin-ext"], variable: "--font-sans", weight: ["400", "600", "700", "800"] });
const hand = Caveat({ subsets: ["latin", "latin-ext"], variable: "--font-hand", weight: ["500", "700"] });

export const metadata: Metadata = {
  title: "PazarLab AI · Sentetik tüketici simülasyonu",
  description: "Ürününüzü 500 sentetik tüketiciye satın almadan önce test edin.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${display.variable} ${sans.variable} ${hand.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <LayoutShell>{children}</LayoutShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
