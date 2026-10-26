import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

export const metadata: Metadata = {
  title: "Sheetfit: exact-size print layouts on A4",
  description:
    "Place logos and designs on an A4 sheet at exact physical sizes, without cropping, and export print-ready PDF, PNG or JPEG.",
};

export const viewport: Viewport = {
  themeColor: "#24493d",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} h-full`}>
      <body className="min-h-full">
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: { fontFamily: "var(--font-archivo)", borderRadius: 6 },
          }}
        />
      </body>
    </html>
  );
}
