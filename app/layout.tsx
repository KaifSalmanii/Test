import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const notoDevanagari = Noto_Sans_Devanagari({
  variable: "--font-devanagari",
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "PrintQR • Photocopy Shop Solution",
  description: "QR स्कैन करके प्रिंट करवाएं — भारत की सबसे तेज़ और सुरक्षित प्रिंटिंग सेवा",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="hi" className={`${geistSans.variable} ${geistMono.variable} ${notoDevanagari.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50">
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
