import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getUploadOwner, finalizeUpload } from "@/lib/upload-core";
import { db } from "@/db";
import { activityLogs } from "@/db/schema";
import { newId } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { uploadId } = await req.json();
    if (!uploadId) return NextResponse.json({ error: "Missing uploadId" }, { status: 400 });
    const owner = await getUploadOwner(uploadId);
    if (!owner || owner !== user.id) {
      return NextResponse.json({ error: "Upload session not found" }, { status: 404 });
    }
    const file = await finalizeUpload(uploadId);
    await db.insert(activityLogs).values({
      id: newId(),
      userId: user.id,
      action: "upload",
      meta: { name: file.name, size: file.size },
    });
    return NextResponse.json({ file });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to finalize upload";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
