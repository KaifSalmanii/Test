import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { files } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { openMediaStream } from "@/lib/media";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const rows = await db.select().from(files).where(and(eq(files.id, id), eq(files.userId, user.id))).limit(1);
    const file = rows[0];
    if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });

    const range = req.headers.get("range");
    const opened = await openMediaStream(user.sessionEncrypted, file.telegramMessageId, range);
    const download = req.nextUrl.searchParams.get("download") === "1";

    const headers = new Headers();
    headers.set("Content-Type", file.mimeType || "application/octet-stream");
    headers.set("Accept-Ranges", "bytes");
    headers.set("Content-Length", String(opened.end - opened.start + 1));
    headers.set("Cache-Control", "private, max-age=3600");
    if (opened.status === 206) {
      headers.set("Content-Range", `bytes ${opened.start}-${opened.end}/${opened.totalSize}`);
    }
    headers.set(
      "Content-Disposition",
      `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(file.name)}`
    );

    return new Response(opened.stream, { status: opened.status, headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to stream file";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
