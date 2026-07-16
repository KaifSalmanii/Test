import { NextResponse } from "next/server";
import { loadGuestLink } from "@/lib/guest";
import { userDisplayName } from "@/lib/telegram";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await loadGuestLink(token);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 404 });
  return NextResponse.json({
    ownerName: userDisplayName(result.owner),
    folderName: result.folderName || "Home",
    label: result.link.label,
  });
}
