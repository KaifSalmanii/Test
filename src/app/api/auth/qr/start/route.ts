import { NextResponse } from "next/server";
import { db } from "@/db";
import { pendingLogins } from "@/db/schema";
import { newId } from "@/lib/crypto";
import { assertTelegramConfigured, createClient, Api } from "@/lib/telegram";
import { getTelegramCreds } from "@/lib/env";

export async function POST() {
  try {
    assertTelegramConfigured();
    const { apiId, apiHash } = getTelegramCreds();
    const client = createClient("");
    await client.connect();
    try {
      const result = await client.invoke(
        new Api.auth.ExportLoginToken({ apiId, apiHash, exceptIds: [] })
      );
      if (!(result instanceof Api.auth.LoginToken)) {
        return NextResponse.json({ error: "Unexpected response starting QR login" }, { status: 400 });
      }
      const sessionString = client.session.save() as unknown as string;
      const id = newId();
      await db.insert(pendingLogins).values({
        id,
        kind: "qr",
        sessionString,
        status: "pending",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });
      const token = result.token.toString("base64url");
      return NextResponse.json({
        pendingId: id,
        loginUrl: `tg://login?token=${token}`,
        expiresAt: result.expires,
      });
    } finally {
      await client.disconnect().catch(() => {});
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start QR login";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
