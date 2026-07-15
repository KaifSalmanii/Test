import { NextResponse } from "next/server";
import { verifyPhoneCode } from "@/lib/telegram";
import { cleanTelegramError } from "@/lib/telegramErrors";
import { createSession, publicAccount } from "@/lib/auth";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const authId = String(body.authId || "");
  const code = String(body.code || "").trim();
  if (!authId || !code) {
    return NextResponse.json({ error: "Missing authId or code." }, { status: 400 });
  }

  try {
    const result = await verifyPhoneCode(authId, code);
    if (result.status === "password_required") {
      return NextResponse.json({ status: "password_required" });
    }
    await createSession(result.account.id);
    return NextResponse.json({ status: "success", account: publicAccount(result.account) });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed.";
    return NextResponse.json({ error: cleanTelegramError(message) }, { status: 400 });
  }
}
