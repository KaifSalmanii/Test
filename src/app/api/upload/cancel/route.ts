import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getUploadOwner, cancelUpload } from "@/lib/upload-core";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { uploadId } = await req.json();
    if (!uploadId) return NextResponse.json({ error: "Missing uploadId" }, { status: 400 });
    const owner = await getUploadOwner(uploadId);
    if (owner && owner !== user.id) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }
    await cancelUpload(uploadId);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to cancel upload";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
