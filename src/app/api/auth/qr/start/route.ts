import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { startQrLogin, isTelegramConfigured } from "@/lib/telegram";
import { cleanTelegramError } from "@/lib/telegramErrors";

export async function POST() {
  if (!isTelegramConfigured()) {
    return NextResponse.json(
      { error: "Telegram API credentials are not configured on this server yet." },
      { status: 503 }
    );
  }

  try {
    const { qrId, token, expires } = await startQrLogin();
    const qrDataUrl = await QRCode.toDataURL(`tg://login?token=${token}`, { margin: 1, scale: 6 });
    return NextResponse.json({ qrId, qrDataUrl, expires });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start QR login.";
    return NextResponse.json({ error: cleanTelegramError(message) }, { status: 400 });
  }
}
