import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { files } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { openMediaStream } from "@/lib/media";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const rows = await db.select().from(files).where(and(eq(files.id, id), eq(files.userId, user.id))).limit(1);
    const file = rows[0];
    if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (file.category !== "photo" && file.category !== "video") {
      return NextResponse.json({ error: "No thumbnail" }, { status: 404 });
    }

    const opened = await openMediaStream(user.sessionEncrypted, file.telegramMessageId, null, true);
    const headers = new Headers();
    headers.set("Content-Type", "image/jpeg");
    headers.set("Cache-Control", "private, max-age=86400, immutable");
    return new Response(opened.stream, { status: 200, headers });
  } catch {
    return NextResponse.json({ error: "No thumbnail" }, { status: 404 });
  }
}
