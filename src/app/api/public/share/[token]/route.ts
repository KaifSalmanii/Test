import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { shareLinks } from "@/db/schema";
import { loadShare } from "@/lib/share";
import { userDisplayName } from "@/lib/telegram";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const result = await loadShare(token);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 404 });

  await db.update(shareLinks).set({ views: result.share.views + 1 }).where(eq(shareLinks.id, result.share.id));

  if (result.kind === "file") {
    return NextResponse.json({
      type: "file",
      file: {
        id: result.file.id,
        name: result.file.name,
        mimeType: result.file.mimeType,
        size: result.file.size,
        category: result.file.category,
        width: result.file.width,
        height: result.file.height,
        duration: result.file.duration,
      },
      ownerName: userDisplayName(result.owner),
      expiresAt: result.share.expiresAt,
    });
  }
  if (result.kind === "note") {
    return NextResponse.json({
      type: "note",
      note: { id: result.note.id, title: result.note.title, content: result.note.content, updatedAt: result.note.updatedAt },
      expiresAt: result.share.expiresAt,
    });
  }
  return NextResponse.json({ error: "Invalid link" }, { status: 404 });
}
