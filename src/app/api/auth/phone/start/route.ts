import { NextResponse } from "next/server";
import { startPhoneLogin, isTelegramConfigured } from "@/lib/telegram";
import { cleanTelegramError } from "@/lib/telegramErrors";

export async function POST(req: Request) {
  if (!isTelegramConfigured()) {
    return NextResponse.json(
      { error: "Telegram API credentials are not configured on this server yet." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const phone = String(body.phone || "").trim();
  if (!/^\+?[0-9]{6,15}$/.test(phone)) {
    return NextResponse.json({ error: "Enter a valid phone number with country code." }, { status: 400 });
  }

  try {
    const normalized = phone.startsWith("+") ? phone : `+${phone}`;
    const { authId } = await startPhoneLogin(normalized);
    return NextResponse.json({ authId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send login code.";
    return NextResponse.json({ error: cleanTelegramError(message) }, { status: 400 });
  }
}
