import type { Metadata, Viewport } from "next";
import { Figtree } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sheetfit: sublimation and DTF print layouts",
  description:
    "Place logos and designs on an A4 sheet at exact physical sizes, without cropping, and export print-ready PDF, PNG or JPEG.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${figtree.variable} h-full`}>
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
