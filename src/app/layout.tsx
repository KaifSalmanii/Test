import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "UnlimTD — Unlimited Telegram Drive",
  description:
    "UnlimTD turns your Telegram account into an unlimited-storage file explorer. Login with your phone or QR code, upload files of any format, browse photos, videos, music & documents online without downloading, take notes, and share everything with smart links.",
  applicationName: "UnlimTD",
  icons: { icon: "/icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0b0f1a",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased transition-colors duration-200 dark:bg-[#0b0f1a] dark:text-slate-100">
        <ThemeProvider>
          <AuthProvider>
            {children}
            <Toaster richColors position="top-center" theme="system" closeButton />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
