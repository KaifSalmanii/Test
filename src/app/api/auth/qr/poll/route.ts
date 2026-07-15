import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { pollQrLogin } from "@/lib/telegram";
import { createSession, publicAccount } from "@/lib/auth";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const qrId = url.searchParams.get("qrId") || "";
  if (!qrId) return NextResponse.json({ error: "Missing qrId" }, { status: 400 });

  const result = await pollQrLogin(qrId);

  if (result.status === "success") {
    await createSession(result.account.id);
    return NextResponse.json({ status: "success", account: publicAccount(result.account) });
  }

  if (result.status === "pending") {
    const qrDataUrl = await QRCode.toDataURL(`tg://login?token=${result.token}`, {
      margin: 1,
      scale: 6,
    });
    return NextResponse.json({ status: "pending", qrDataUrl, expires: result.expires });
  }

  return NextResponse.json(result);
}
