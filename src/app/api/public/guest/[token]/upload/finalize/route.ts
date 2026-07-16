import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { guestLinks } from "@/db/schema";
import { loadGuestLink } from "@/lib/guest";
import { getUploadOwner, finalizeUpload } from "@/lib/upload-core";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const result = await loadGuestLink(token);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 404 });

    const { uploadId } = await req.json();
    if (!uploadId) return NextResponse.json({ error: "Missing uploadId" }, { status: 400 });
    const owner = await getUploadOwner(uploadId);
    if (!owner || owner !== result.link.ownerUserId) {
      return NextResponse.json({ error: "Upload session not found" }, { status: 404 });
    }
    const file = await finalizeUpload(uploadId);
    await db
      .update(guestLinks)
      .set({ uploadsCount: sql`${guestLinks.uploadsCount} + 1` })
      .where(eq(guestLinks.id, result.link.id));
    return NextResponse.json({ file });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to finalize upload";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
