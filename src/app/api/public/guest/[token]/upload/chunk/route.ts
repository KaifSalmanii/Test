import { NextRequest, NextResponse } from "next/server";
import { loadGuestLink } from "@/lib/guest";
import { getUploadOwner, writeChunk } from "@/lib/upload-core";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const result = await loadGuestLink(token);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 404 });

    const uploadId = req.nextUrl.searchParams.get("uploadId");
    const index = Number(req.nextUrl.searchParams.get("index"));
    if (!uploadId || Number.isNaN(index)) return NextResponse.json({ error: "Missing uploadId or index" }, { status: 400 });

    const owner = await getUploadOwner(uploadId);
    if (!owner || owner !== result.link.ownerUserId) {
      return NextResponse.json({ error: "Upload session not found" }, { status: 404 });
    }
    const buf = Buffer.from(await req.arrayBuffer());
    await writeChunk(uploadId, index, buf);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to upload chunk";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export const runtime = "nodejs";
