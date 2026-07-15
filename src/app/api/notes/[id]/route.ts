import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { notes } from "@/db/schema";
import { withAccount } from "@/lib/apiHelpers";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  return withAccount(async (account) => {
    const rows = await db
      .select()
      .from(notes)
      .where(and(eq(notes.id, id), eq(notes.ownerId, account.id)))
      .limit(1);
    if (!rows[0]) return NextResponse.json({ error: "Note not found." }, { status: 404 });
    return NextResponse.json({ note: rows[0] });
  });
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  return withAccount(async (account) => {
    const body = await req.json().catch(() => ({}));
    const updates: Partial<typeof notes.$inferInsert> = { updatedAt: new Date() };
    if (typeof body.title === "string") updates.title = body.title.slice(0, 200);
    if (typeof body.content === "string") updates.content = body.content;

    const [row] = await db
      .update(notes)
      .set(updates)
      .where(and(eq(notes.id, id), eq(notes.ownerId, account.id)))
      .returning();

    if (!row) return NextResponse.json({ error: "Note not found." }, { status: 404 });
    return NextResponse.json({ note: row });
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  return withAccount(async (account) => {
    const rows = await db
      .delete(notes)
      .where(and(eq(notes.id, id), eq(notes.ownerId, account.id)))
      .returning();
    if (!rows[0]) return NextResponse.json({ error: "Note not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  });
}
