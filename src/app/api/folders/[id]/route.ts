import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { folders, files } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { withUserClient } from "@/lib/telegram";

async function collectDescendantFolderIds(userId: string, rootId: string): Promise<string[]> {
  const all: string[] = [rootId];
  let frontier = [rootId];
  while (frontier.length > 0) {
    const children = await db
      .select()
      .from(folders)
      .where(and(eq(folders.userId, userId), inArray(folders.parentId, frontier)));
    if (children.length === 0) break;
    const ids = children.map((c) => c.id);
    all.push(...ids);
    frontier = ids;
  }
  return all;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const existing = await db.select().from(folders).where(and(eq(folders.id, id), eq(folders.userId, user.id))).limit(1);
    if (existing.length === 0) return NextResponse.json({ error: "Folder not found" }, { status: 404 });

    const update: Partial<typeof folders.$inferInsert> = { updatedAt: new Date() };
    if (typeof body.name === "string" && body.name.trim()) update.name = body.name.trim().slice(0, 120);
    if (typeof body.isHidden === "boolean") update.isHidden = body.isHidden;
    if (body.parentId !== undefined) update.parentId = body.parentId || null;

    await db.update(folders).set(update).where(eq(folders.id, id));
    const [row] = await db.select().from(folders).where(eq(folders.id, id));
    return NextResponse.json({ folder: row });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update folder";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const existing = await db.select().from(folders).where(and(eq(folders.id, id), eq(folders.userId, user.id))).limit(1);
    if (existing.length === 0) return NextResponse.json({ error: "Folder not found" }, { status: 404 });

    const folderIds = await collectDescendantFolderIds(user.id, id);
    const filesToDelete = await db
      .select()
      .from(files)
      .where(and(eq(files.userId, user.id), inArray(files.folderId, folderIds)));

    if (filesToDelete.length > 0) {
      const messageIds = filesToDelete.map((f) => f.telegramMessageId);
      try {
        await withUserClient(user.sessionEncrypted, (client) =>
          client.deleteMessages("me", messageIds, { revoke: true })
        );
      } catch {
        // best effort - continue removing DB records even if telegram call fails
      }
      await db.delete(files).where(inArray(files.id, filesToDelete.map((f) => f.id)));
    }

    await db.delete(folders).where(inArray(folders.id, folderIds));
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete folder";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
