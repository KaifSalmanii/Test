import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pendingLogins } from "@/db/schema";
import { createClient, Api } from "@/lib/telegram";
import { finishLoginWithClient } from "@/lib/login-helpers";
import { computeCheck } from "telegram/Password";

export async function POST(req: NextRequest) {
  try {
    const { pendingId, password } = await req.json();
    if (!pendingId || !password) {
      return NextResponse.json({ error: "Missing pendingId or password" }, { status: 400 });
    }
    const rows = await db.select().from(pendingLogins).where(eq(pendingLogins.id, pendingId)).limit(1);
    const pending = rows[0];
    if (!pending || pending.status === "done" || pending.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: "Login session expired, please restart" }, { status: 400 });
    }

    const client = createClient(pending.sessionString);
    await client.connect();
    try {
      const passwordInfo = await client.invoke(new Api.account.GetPassword());
      const srpCheck = await computeCheck(passwordInfo, String(password));
      const result = (await client.invoke(
        new Api.auth.CheckPassword({ password: srpCheck })
      )) as Api.auth.Authorization;
      const userId = await finishLoginWithClient(client, result.user as Api.User);
      await db
        .update(pendingLogins)
        .set({ status: "done", resultUserId: userId })
        .where(eq(pendingLogins.id, pendingId));
      return NextResponse.json({ success: true });
    } finally {
      await client.disconnect().catch(() => {});
    }
  } catch (err) {
    const e = err as { errorMessage?: string; message?: string };
    const message = e?.errorMessage || e?.message || "Incorrect password";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
