import { NextRequest, NextResponse } from "next/server";
import { loadGuestLink } from "@/lib/guest";
import { initUpload } from "@/lib/upload-core";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const result = await loadGuestLink(token);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 404 });

    const { name, size, mimeType } = await req.json();
    if (!name || typeof size !== "number") {
      return NextResponse.json({ error: "Missing file name or size" }, { status: 400 });
    }
    const init = await initUpload({
      ownerUserId: result.link.ownerUserId,
      folderId: result.link.folderId,
      name: String(name),
      size,
      mimeType: mimeType || "application/octet-stream",
      uploadedByGuest: true,
      guestLabel: result.link.label,
    });
    return NextResponse.json(init);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start upload";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
