import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { folders } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { initUpload } from "@/lib/upload-core";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { name, size, mimeType, folderId } = await req.json();
    if (!name || typeof size !== "number") {
      return NextResponse.json({ error: "Missing file name or size" }, { status: 400 });
    }
    if (folderId) {
      const rows = await db
        .select()
        .from(folders)
        .where(and(eq(folders.id, folderId), eq(folders.userId, user.id)))
        .limit(1);
      if (rows.length === 0) return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }
    const result = await initUpload({
      ownerUserId: user.id,
      folderId: folderId || null,
      name: String(name),
      size,
      mimeType: mimeType || "application/octet-stream",
    });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to init upload";
    return NextResponse.json({ error: message }, { status: err instanceof Error && err.message === "UNAUTHORIZED" ? 401 : 400 });
  }
}
