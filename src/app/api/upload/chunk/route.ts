import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getUploadOwner, writeChunk } from "@/lib/upload-core";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const uploadId = req.nextUrl.searchParams.get("uploadId");
    const index = Number(req.nextUrl.searchParams.get("index"));
    if (!uploadId || Number.isNaN(index)) {
      return NextResponse.json({ error: "Missing uploadId or index" }, { status: 400 });
    }
    const owner = await getUploadOwner(uploadId);
    if (!owner || owner !== user.id) {
      return NextResponse.json({ error: "Upload session not found" }, { status: 404 });
    }
    const buf = Buffer.from(await req.arrayBuffer());
    await writeChunk(uploadId, index, buf);
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to write chunk";
    return NextResponse.json({ error: message }, { status: err instanceof Error && err.message === "UNAUTHORIZED" ? 401 : 400 });
  }
}

export const runtime = "nodejs";
