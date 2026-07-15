import { NextResponse } from "next/server";
import { getCurrentAccount, publicAccount } from "@/lib/auth";
import { isTelegramConfigured } from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function GET() {
  const account = await getCurrentAccount();
  return NextResponse.json({
    configured: isTelegramConfigured(),
    account: account ? publicAccount(account) : null,
  });
}
