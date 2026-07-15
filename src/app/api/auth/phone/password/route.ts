import { NextResponse } from "next/server";
import { verifyPhonePassword } from "@/lib/telegram";
import { cleanTelegramError } from "@/lib/telegramErrors";
import { createSession, publicAccount } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const authId = String(body.authId || "");
  const password = String(body.password || "");
  if (!authId || !password) {
    return NextResponse.json({ error: "Missing authId or password." }, { status: 400 });
  }

  try {
    const result = await verifyPhonePassword(authId, password);
    await createSession(result.account.id);
    return NextResponse.json({ status: "success", account: publicAccount(result.account) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed.";
    return NextResponse.json({ error: cleanTelegramError(message) }, { status: 400 });
  }
}
