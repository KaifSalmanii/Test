import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pendingLogins } from "@/db/schema";
import { createClient, Api } from "@/lib/telegram";
import { getTelegramCreds } from "@/lib/env";
import { finishLoginWithClient } from "@/lib/login-helpers";

function errCode(err: unknown): string {
  const e = err as { errorMessage?: string; message?: string };
  return e?.errorMessage || e?.message || "";
}

export async function POST(req: NextRequest) {
  try {
    const { pendingId } = await req.json();
    if (!pendingId) return NextResponse.json({ error: "Missing pendingId" }, { status: 400 });

    const rows = await db.select().from(pendingLogins).where(eq(pendingLogins.id, pendingId)).limit(1);
    const pending = rows[0];
    if (!pending) return NextResponse.json({ status: "expired" });
    if (pending.status === "done") return NextResponse.json({ status: "success" });
    if (pending.expiresAt.getTime() < Date.now()) return NextResponse.json({ status: "expired" });
    if (pending.status === "password_needed") return NextResponse.json({ status: "password_needed" });

    const { apiId, apiHash } = getTelegramCreds();
    const client = createClient(pending.sessionString);
    await client.connect();
    try {
      const result = await client.invoke(new Api.auth.ExportLoginToken({ apiId, apiHash, exceptIds: [] }));

      if (result instanceof Api.auth.LoginToken) {
        await db
          .update(pendingLogins)
          .set({ sessionString: client.session.save() as unknown as string })
          .where(eq(pendingLogins.id, pendingId));
        return NextResponse.json({ status: "waiting" });
      }

      if (result instanceof Api.auth.LoginTokenMigrateTo) {
        await (client as unknown as { _switchDC: (dcId: number) => Promise<unknown> })._switchDC(result.dcId);
        const imported = await client.invoke(new Api.auth.ImportLoginToken({ token: result.token }));
        await db
          .update(pendingLogins)
          .set({ sessionString: client.session.save() as unknown as string })
          .where(eq(pendingLogins.id, pendingId));
        if (imported instanceof Api.auth.LoginTokenSuccess && imported.authorization instanceof Api.auth.Authorization) {
          const userId = await finishLoginWithClient(client, imported.authorization.user as Api.User);
          await db.update(pendingLogins).set({ status: "done", resultUserId: userId }).where(eq(pendingLogins.id, pendingId));
          return NextResponse.json({ status: "success" });
        }
        return NextResponse.json({ status: "waiting" });
      }

      if (result instanceof Api.auth.LoginTokenSuccess && result.authorization instanceof Api.auth.Authorization) {
        const userId = await finishLoginWithClient(client, result.authorization.user as Api.User);
        await db.update(pendingLogins).set({ status: "done", resultUserId: userId }).where(eq(pendingLogins.id, pendingId));
        return NextResponse.json({ status: "success" });
      }

      return NextResponse.json({ status: "waiting" });
    } catch (err) {
      const code = errCode(err);
      if (code.includes("SESSION_PASSWORD_NEEDED")) {
        await db
          .update(pendingLogins)
          .set({ status: "password_needed", sessionString: client.session.save() as unknown as string })
          .where(eq(pendingLogins.id, pendingId));
        return NextResponse.json({ status: "password_needed" });
      }
      return NextResponse.json({ status: "waiting" });
    } finally {
      await client.disconnect().catch(() => {});
    }
  } catch {
    return NextResponse.json({ status: "waiting" });
  }
}
