import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { notes } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const existing = await db.select().from(notes).where(and(eq(notes.id, id), eq(notes.userId, user.id))).limit(1);
    if (existing.length === 0) return NextResponse.json({ error: "Note not found" }, { status: 404 });

    const update: Partial<typeof notes.$inferInsert> = { updatedAt: new Date() };
    if (typeof body.title === "string") update.title = body.title.slice(0, 200) || "Untitled note";
    if (typeof body.content === "string") update.content = body.content;
    if (typeof body.isPinned === "boolean") update.isPinned = body.isPinned;

    await db.update(notes).set(update).where(eq(notes.id, id));
    const [row] = await db.select().from(notes).where(eq(notes.id, id));
    return NextResponse.json({ note: row });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update note";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const existing = await db.select().from(notes).where(and(eq(notes.id, id), eq(notes.userId, user.id))).limit(1);
    if (existing.length === 0) return NextResponse.json({ error: "Note not found" }, { status: 404 });
    await db.delete(notes).where(eq(notes.id, id));
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete note";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
