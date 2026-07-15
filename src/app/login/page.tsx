"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Phone, QrCode, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { apiSend } from "@/lib/clientApi";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";

type Tab = "phone" | "qr";
type PhoneStep = "phone" | "code" | "password";

export default function LoginPage() {
  const router = useRouter();
  const { refresh, account, configured, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("qr");

  useEffect(() => {
    if (!loading && account) router.replace("/drive");
  }, [loading, account, router]);

  if (!loading && account) return null;

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_-10%,rgba(99,102,241,0.22),transparent_45%),radial-gradient(circle_at_90%_10%,rgba(6,182,212,0.18),transparent_40%)]" />

      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <Link href="/" className="mb-6 flex items-center gap-2.5">
        <img src="/images/logo.png" alt="UnlimTD" className="h-10 w-10 rounded-xl shadow-lg shadow-indigo-500/25" />
        <span className="text-xl font-bold tracking-tight">UnlimTD</span>
      </Link>

      <div className="animate-pop w-full max-w-md rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-xl shadow-slate-900/5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
        {!configured && (
          <div className="mb-4 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            Telegram API credentials are not configured on the server yet (TELEGRAM_API_ID /
            TELEGRAM_API_HASH). Login will not work until they are added.
          </div>
        )}

        <div className="mb-6 grid grid-cols-2 gap-1 rounded-full bg-slate-100 p-1 dark:bg-slate-800">
          <button
            onClick={() => setTab("qr")}
            className={`flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium transition ${
              tab === "qr" ? "bg-white shadow dark:bg-slate-700" : "text-slate-500"
            }`}
          >
            <QrCode className="h-4 w-4" /> QR code
          </button>
          <button
            onClick={() => setTab("phone")}
            className={`flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium transition ${
              tab === "phone" ? "bg-white shadow dark:bg-slate-700" : "text-slate-500"
            }`}
          >
            <Phone className="h-4 w-4" /> Phone
          </button>
        </div>

        {tab === "qr" ? <QrLogin onSuccess={() => finishLogin(refresh, router)} /> : <PhoneLogin onSuccess={() => finishLogin(refresh, router)} />}
      </div>

      <p className="mt-6 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <ShieldCheck className="h-3.5 w-3.5" /> We only use your Telegram session to store & read your
        own files — nothing is shared with anyone else.
      </p>
    </main>
  );
}

async function finishLogin(refresh: () => Promise<void>, router: ReturnType<typeof useRouter>) {
  await refresh();
  toast.success("Logged in! Loading your drive…");
  router.replace("/drive");
}

function PhoneLogin({ onSuccess }: { onSuccess: () => void }) {
  const [step, setStep] = useState<PhoneStep>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [authId, setAuthId] = useState("");
  const [busy, setBusy] = useState(false);

  const sendCode = useCallback(async () => {
    setBusy(true);
    try {
      const res = await apiSend<{ authId: string }>("/api/auth/phone/start", "POST", { phone });
      setAuthId(res.authId);
      setStep("code");
      toast.success("Code sent via Telegram.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send code.");
    } finally {
      setBusy(false);
    }
  }, [phone]);

  const verifyCode = useCallback(async () => {
    setBusy(true);
    try {
      const res = await apiSend<{ status: string }>("/api/auth/phone/verify", "POST", {
        authId,
        code,
      });
      if (res.status === "password_required") {
        setStep("password");
        return;
      }
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid code.");
    } finally {
      setBusy(false);
    }
  }, [authId, code, onSuccess]);

  const verifyPassword = useCallback(async () => {
    setBusy(true);
    try {
      await apiSend("/api/auth/phone/password", "POST", { authId, password });
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Incorrect password.");
    } finally {
      setBusy(false);
    }
  }, [authId, password, onSuccess]);

  return (
    <div className="space-y-4">
      {step === "phone" && (
        <>
          <label className="block text-xs font-medium text-slate-500">Phone number</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className="w-full rounded-xl border border-slate-300 bg-transparent px-4 py-2.5 text-sm outline-none ring-indigo-500 focus:ring-2 dark:border-slate-700"
          />
          <button
            disabled={busy || !phone}
            onClick={sendCode}
            className="brand-gradient flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Send login code
          </button>
        </>
      )}

      {step === "code" && (
        <>
          <label className="block text-xs font-medium text-slate-500">
            Enter the code Telegram sent you
          </label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="12345"
            className="w-full rounded-xl border border-slate-300 bg-transparent px-4 py-2.5 text-sm tracking-widest outline-none ring-indigo-500 focus:ring-2 dark:border-slate-700"
          />
          <button
            disabled={busy || !code}
            onClick={verifyCode}
            className="brand-gradient flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Verify & continue
          </button>
        </>
      )}

      {step === "password" && (
        <>
          <label className="block text-xs font-medium text-slate-500">
            Two-step verification password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-transparent px-4 py-2.5 text-sm outline-none ring-indigo-500 focus:ring-2 dark:border-slate-700"
          />
          <button
            disabled={busy || !password}
            onClick={verifyPassword}
            className="brand-gradient flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Unlock account
          </button>
        </>
      )}
    </div>
  );
}

function QrLogin({ onSuccess }: { onSuccess: () => void }) {
  const [qrId, setQrId] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [needsPassword, setNeedsPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(async () => {
    setError("");
    setNeedsPassword(false);
    try {
      const res = await apiSend<{ qrId: string; qrDataUrl: string }>("/api/auth/qr/start", "POST");
      setQrId(res.qrId);
      setQrDataUrl(res.qrDataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start QR login.");
    }
  }, []);

  useEffect(() => {
    start();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!qrId || needsPassword) return;
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/auth/qr/poll?qrId=${qrId}`, { credentials: "include" });
        const data = await res.json();
        if (data.status === "success") {
          if (pollRef.current) clearInterval(pollRef.current);
          onSuccess();
        } else if (data.status === "pending" && data.qrDataUrl) {
          setQrDataUrl(data.qrDataUrl);
        } else if (data.status === "password_required") {
          setNeedsPassword(true);
        } else if (data.status === "expired" || data.status === "error") {
          if (pollRef.current) clearInterval(pollRef.current);
          setError(data.message || "QR code expired, generating a new one…");
          start();
        }
      } catch {
        // ignore transient poll errors
      }
    }, 2500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [qrId, needsPassword, onSuccess, start]);

  const verifyPassword = useCallback(async () => {
    setBusy(true);
    try {
      await apiSend("/api/auth/qr/password", "POST", { qrId, password });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Incorrect password.");
    } finally {
      setBusy(false);
    }
  }, [qrId, password, onSuccess]);

  if (needsPassword) {
    return (
      <div className="space-y-4">
        <label className="block text-xs font-medium text-slate-500">
          Two-step verification password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-transparent px-4 py-2.5 text-sm outline-none ring-indigo-500 focus:ring-2 dark:border-slate-700"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          disabled={busy || !password}
          onClick={verifyPassword}
          className="brand-gradient flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/30 disabled:opacity-50"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Unlock account
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="relative flex h-56 w-56 items-center justify-center rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700">
        {qrDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={qrDataUrl} alt="Telegram login QR code" className="h-full w-full" />
        ) : (
          <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
        )}
      </div>
      <p className="max-w-xs text-xs text-slate-500 dark:text-slate-400">
        Open Telegram → Settings → Devices → <b>Link Desktop Device</b> and scan this code.
      </p>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
