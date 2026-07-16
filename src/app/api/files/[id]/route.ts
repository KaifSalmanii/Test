import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { files } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { withUserClient } from "@/lib/telegram";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const rows = await db.select().from(files).where(and(eq(files.id, id), eq(files.userId, user.id))).limit(1);
    if (rows.length === 0) return NextResponse.json({ error: "File not found" }, { status: 404 });
    return NextResponse.json({ file: rows[0] });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const existing = await db.select().from(files).where(and(eq(files.id, id), eq(files.userId, user.id))).limit(1);
    if (existing.length === 0) return NextResponse.json({ error: "File not found" }, { status: 404 });

    const update: Partial<typeof files.$inferInsert> = {};
    if (typeof body.name === "string" && body.name.trim()) update.name = body.name.trim().slice(0, 200);
    if (body.folderId !== undefined) update.folderId = body.folderId || null;

    await db.update(files).set(update).where(eq(files.id, id));
    const [row] = await db.select().from(files).where(eq(files.id, id));
    return NextResponse.json({ file: row });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update file";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const existing = await db.select().from(files).where(and(eq(files.id, id), eq(files.userId, user.id))).limit(1);
    if (existing.length === 0) return NextResponse.json({ error: "File not found" }, { status: 404 });

    try {
      await withUserClient(user.sessionEncrypted, (client) =>
        client.deleteMessages("me", [existing[0].telegramMessageId], { revoke: true })
      );
    } catch {
      // best effort
    }
    await db.delete(files).where(eq(files.id, id));
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete file";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
