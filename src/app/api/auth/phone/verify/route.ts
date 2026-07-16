import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pendingLogins } from "@/db/schema";
import { createClient, Api } from "@/lib/telegram";
import { finishLoginWithClient } from "@/lib/login-helpers";

function errCode(err: unknown): string {
  const e = err as { errorMessage?: string; message?: string };
  return e?.errorMessage || e?.message || "";
}

export async function POST(req: NextRequest) {
  try {
    const { pendingId, code } = await req.json();
    if (!pendingId || !code) {
      return NextResponse.json({ error: "Missing pendingId or code" }, { status: 400 });
    }
    const rows = await db.select().from(pendingLogins).where(eq(pendingLogins.id, pendingId)).limit(1);
    const pending = rows[0];
    if (!pending || pending.status === "done" || pending.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "Login session expired, please restart" }, { status: 400 });
    }

    const client = createClient(pending.sessionString);
    await client.connect();
    try {
      const result = await client.invoke(
        new Api.auth.SignIn({
          phoneNumber: pending.phone!,
          phoneCodeHash: pending.phoneCodeHash!,
          phoneCode: String(code).trim(),
        })
      );
      if (result instanceof Api.auth.AuthorizationSignUpRequired) {
        return NextResponse.json(
          { error: "This number has no Telegram account yet. Please sign up in the Telegram app first." },
          { status: 400 }
        );
      }
      const userId = await finishLoginWithClient(client, result.user as Api.User);
      await db
        .update(pendingLogins)
        .set({ status: "done", resultUserId: userId, sessionString: client.session.save() as unknown as string })
        .where(eq(pendingLogins.id, pendingId));
      return NextResponse.json({ success: true });
    } catch (err) {
      const code = errCode(err);
      if (code.includes("SESSION_PASSWORD_NEEDED")) {
        await db
          .update(pendingLogins)
          .set({ status: "password_needed", sessionString: client.session.save() as unknown as string })
          .where(eq(pendingLogins.id, pendingId));
        return NextResponse.json({ needsPassword: true });
      }
      throw err;
    } finally {
      await client.disconnect().catch(() => {});
    }
  } catch (err) {
    const message = errCode(err) || "Invalid code";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
