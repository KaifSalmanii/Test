"use client";

import NextLink from "next/link";
import {
  Cloud,
  FolderTree,
  Gauge,
  QrCode,
  Search,
  Share2,
  ShieldCheck,
  StickyNote,
  Users,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";

const FEATURES = [
  {
    icon: Cloud,
    title: "Unlimited cloud storage",
    desc: "Your files live safely inside your own Telegram account — no storage caps, no local disk usage.",
  },
  {
    icon: QrCode,
    title: "Login with phone or QR",
    desc: "Sign in exactly like Telegram: enter your number & OTP, or just scan a QR code from your phone.",
  },
  {
    icon: FolderTree,
    title: "Real folders & breadcrumbs",
    desc: "Create nested folders, rename, move and jump instantly to any point in the path.",
  },
  {
    icon: Gauge,
    title: "Fast parallel uploads",
    desc: "Upload many files at once with a live queue — pause, cancel or track every transfer's progress.",
  },
  {
    icon: Search,
    title: "Powerful search & sort",
    desc: "Find anything by name, filter by type, or sort by newest, oldest and size in one tap.",
  },
  {
    icon: Share2,
    title: "Shareable links",
    desc: "Generate temporary or permanent links for files, folders or notes — revoke them anytime.",
  },
  {
    icon: Users,
    title: "Guest uploads",
    desc: "Share a QR/link so anyone can drop files straight into your drive — no login needed for them.",
  },
  {
    icon: StickyNote,
    title: "Notes that never end",
    desc: "Write, edit, rename and share notes of any length, all searchable in one place.",
  },
];

export default function HomePage() {
  const { account, loading, configured } = useAuth();

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_-10%,rgba(99,102,241,0.25),transparent_45%),radial-gradient(circle_at_90%_10%,rgba(6,182,212,0.2),transparent_40%)]" />

      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <img src="/images/logo.png" alt="UnlimTD" className="h-9 w-9 rounded-xl shadow-lg shadow-indigo-500/20" />
          <span className="text-lg font-bold tracking-tight">UnlimTD</span>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {!loading && account ? (
            <NextLink
              href="/drive"
              className="brand-gradient rounded-full px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 transition hover:opacity-90"
            >
              Open Drive
            </NextLink>
          ) : (
            <NextLink
              href="/login"
              className="brand-gradient rounded-full px-4 py-2 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 transition hover:opacity-90"
            >
              Login
            </NextLink>
          )}
        </div>
      </header>

      <section className="mx-auto flex max-w-4xl flex-col items-center px-6 pb-16 pt-10 text-center">
        <span className="animate-fade-up mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-500 dark:text-indigo-300">
          <ShieldCheck className="h-3.5 w-3.5" /> Your Telegram account, turned into a drive
        </span>
        <h1 className="animate-fade-up text-[clamp(2.2rem,6vw,4rem)] font-extrabold leading-[1.05] tracking-tight">
          Unlimited storage.
          <br />
          <span className="brand-text-gradient">Powered by Telegram.</span>
        </h1>
        <p className="animate-fade-up mt-6 max-w-2xl text-balance text-base text-slate-600 dark:text-slate-300 sm:text-lg">
          UnlimTD is a smooth, full-featured file explorer for Telegram. Login with your number or a
          QR scan, create folders, upload anything, preview photos/videos/music/PDFs online, and share
          it all — without ever running out of space.
        </p>
        <div className="animate-fade-up mt-8 flex flex-wrap items-center justify-center gap-3">
          <NextLink
            href="/login"
            className="brand-gradient rounded-full px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:-translate-y-0.5"
          >
            Get started free
          </NextLink>
          <a
            href="#features"
            className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            See what's inside
          </a>
        </div>
        {!configured && (
          <p className="mt-6 max-w-lg rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-xs text-amber-700 dark:text-amber-300">
            Server setup needed: add <code className="font-mono">TELEGRAM_API_ID</code> and{" "}
            <code className="font-mono">TELEGRAM_API_HASH</code> (from my.telegram.org) to enable real
            Telegram login & storage.
          </p>
        )}
      </section>

      <section id="features" className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="animate-fade-up group rounded-2xl border border-slate-200 bg-white/70 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/60"
            >
              <div className="brand-gradient mb-4 flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md shadow-indigo-500/20">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <p>
          UnlimTD — Unlimited Telegram Drive · Built with ❤️ by{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-200">KaifSalmani</span>
        </p>
        <a
          href="https://instagram.com/oyeeee_kaif"
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block font-medium text-indigo-500 hover:underline"
        >
          @oyeeee_kaif
        </a>
      </footer>
    </main>
  );
}
