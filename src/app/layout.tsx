import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter, Sora } from "next/font/google";
import { InlineScript } from "@/components/InlineScript";
import { ThemedToaster } from "@/components/ThemedToaster";
import { THEME_SCRIPT } from "@/lib/preferences";
import "./globals.css";

/**
 * Interface face (editor and body text): Inter was drawn for screens, has
 * tabular figures for measurements and stays legible at 12 px.
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

/** Display face kept for older marketing headlines. */
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
});

/** Headline face for the home page (geometric, modern). */
const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["600", "700"],
});

export const metadata: Metadata = {
  title: "Sheetfit: sublimation and DTF print layouts",
  description:
    "Lay out sublimation and DTF transfers on A4, A3 and 22 in gang sheets at exact physical sizes, preview them on the product, and export print-ready PDF, PNG or JPEG.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1f23" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="light"
      data-density="comfortable"
      suppressHydrationWarning
      className={`${inter.variable} ${bricolage.variable} ${sora.variable} h-full`}
    >
      <head>
        {/* Applies the saved theme and density before the first paint (lib/preferences.ts). */}
        <InlineScript html={THEME_SCRIPT} />
      </head>
      <body className="min-h-full">
        {children}
        <ThemedToaster />
      </body>
    </html>
  );
}
