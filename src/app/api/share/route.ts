import { NextRequest, NextResponse } from "next/server";
import { and, eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { shareLinks, files, notes } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { newId, newToken } from "@/lib/crypto";

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await db
      .select()
      .from(shareLinks)
      .where(eq(shareLinks.createdBy, user.id))
      .orderBy(desc(shareLinks.createdAt));
    return NextResponse.json({ shares: rows });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { type, fileId, noteId, expiresInHours, label } = await req.json();
    if (type !== "file" && type !== "note") {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
    if (type === "file") {
      const rows = await db.select().from(files).where(and(eq(files.id, fileId), eq(files.userId, user.id))).limit(1);
      if (rows.length === 0) return NextResponse.json({ error: "File not found" }, { status: 404 });
    } else {
      const rows = await db.select().from(notes).where(and(eq(notes.id, noteId), eq(notes.userId, user.id))).limit(1);
      if (rows.length === 0) return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const id = newId();
    const token = newToken(16);
    await db.insert(shareLinks).values({
      id,
      token,
      type,
      fileId: type === "file" ? fileId : null,
      noteId: type === "note" ? noteId : null,
      createdBy: user.id,
      label: label || null,
      expiresAt: expiresInHours ? new Date(Date.now() + Number(expiresInHours) * 3600 * 1000) : null,
    });
    const [row] = await db.select().from(shareLinks).where(eq(shareLinks.id, id));
    return NextResponse.json({ share: row });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create link";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
