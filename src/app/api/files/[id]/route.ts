import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { files } from "@/db/schema";
import { withAccount } from "@/lib/apiHelpers";
import { safeFileName } from "@/lib/format";
import { deleteTelegramMessages } from "@/lib/telegram";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  return withAccount(async (account) => {
    const rows = await db
      .select()
      .from(files)
      .where(and(eq(files.id, id), eq(files.ownerId, account.id)))
      .limit(1);
    if (!rows[0]) return NextResponse.json({ error: "File not found." }, { status: 404 });
    return NextResponse.json({ file: rows[0] });
  });
}

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  return withAccount(async (account) => {
    const body = await req.json().catch(() => ({}));
    const updates: Partial<typeof files.$inferInsert> = { updatedAt: new Date() };

    if (typeof body.name === "string") updates.name = safeFileName(body.name);
    if (typeof body.folderId !== "undefined") {
      updates.folderId = body.folderId ? String(body.folderId) : null;
    }

    const [row] = await db
      .update(files)
      .set(updates)
      .where(and(eq(files.id, id), eq(files.ownerId, account.id)))
      .returning();

    if (!row) return NextResponse.json({ error: "File not found." }, { status: 404 });
    return NextResponse.json({ file: row });
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  return withAccount(async (account) => {
    const rows = await db
      .delete(files)
      .where(and(eq(files.id, id), eq(files.ownerId, account.id)))
      .returning();
    if (!rows[0]) return NextResponse.json({ error: "File not found." }, { status: 404 });
    await deleteTelegramMessages(account, [rows[0].messageId]);
    return NextResponse.json({ ok: true });
  });
}
