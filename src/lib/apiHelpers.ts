import "server-only";
import { NextResponse } from "next/server";
import { requireAccount } from "@/lib/auth";
import type { TelegramAccountRow } from "@/lib/telegram";

export async function withAccount<T>(
  handler: (account: TelegramAccountRow) => Promise<T>
): Promise<T | NextResponse> {
  try {
    const account = await requireAccount();
    return await handler(account);
  } catch (err) {
    if (err instanceof Error && err.name === "AuthError") {
      return NextResponse.json({ error: "Please log in first." }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
