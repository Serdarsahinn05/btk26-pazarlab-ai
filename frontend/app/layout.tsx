import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Suspense } from "react";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import Sidebar from "@/components/Sidebar";
import StatusBar from "@/components/StatusBar";




const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "PazarLab AI | Synthetic Consumer Simulation",
  description: "Advanced AI-driven marketplace simulation platform",
};

import LayoutShell from "@/components/LayoutShell";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body className={`${inter.variable} ${mono.variable} font-sans bg-background text-foreground overflow-hidden h-screen flex flex-col`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <LayoutShell>
            {children}
          </LayoutShell>
        </ThemeProvider>
      </body>
    </html>
  );
}

