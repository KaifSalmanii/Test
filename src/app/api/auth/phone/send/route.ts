import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { pendingLogins } from "@/db/schema";
import { newId } from "@/lib/crypto";
import { assertTelegramConfigured, createClient, Api } from "@/lib/telegram";
import { getTelegramCreds } from "@/lib/env";

export async function POST(req: NextRequest) {
  try {
    assertTelegramConfigured();
    const { phone } = await req.json();
    if (!phone || typeof phone !== "string" || phone.replace(/\D/g, "").length < 6) {
      return NextResponse.json({ error: "Valid phone number required (with country code)" }, { status: 400 });
    }
    const { apiId, apiHash } = getTelegramCreds();
    const client = createClient("");
    await client.connect();

    let phoneCodeHash = "";
    let isCodeViaApp = false;
    try {
      const result = await client.invoke(
        new Api.auth.SendCode({
          phoneNumber: phone,
          apiId,
          apiHash,
          settings: new Api.CodeSettings({}),
        })
      );
      if (result instanceof Api.auth.SentCodeSuccess) {
        return NextResponse.json({ error: "Unexpected instant login, please try again" }, { status: 400 });
      }
      phoneCodeHash = result.phoneCodeHash;
      isCodeViaApp = result.type instanceof Api.auth.SentCodeTypeApp;
    } catch (err) {
      await client.disconnect().catch(() => {});
      throw err;
    }

    const sessionString = client.session.save() as unknown as string;
    await client.disconnect().catch(() => {});

    const id = newId();
    await db.insert(pendingLogins).values({
      id,
      kind: "phone",
      phone,
      phoneCodeHash,
      sessionString,
      status: "pending",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });

    return NextResponse.json({ pendingId: id, isCodeViaApp });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send code";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
