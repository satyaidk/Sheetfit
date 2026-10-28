import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree, Sora } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

/** Display face for marketing headlines; the editor UI stays on Figtree. */
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
});

/** Headline face for the home page (geometric, modern); the editor stays on Figtree. */
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
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${figtree.variable} ${bricolage.variable} ${sora.variable} h-full`}>
      <body className="min-h-full">
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: { fontFamily: "var(--font-figtree)", borderRadius: 6 },
          }}
        />
      </body>
    </html>
  );
}
