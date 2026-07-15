import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { files, folders, notes, shareLinks } from "@/db/schema";
import { getFolderPath, isDescendantOrSelf } from "@/lib/folderTree";

type Params = { params: Promise<{ token: string }> };

export async function GET(req: Request, { params }: Params) {
  const { token } = await params;
  const rows = await db.select().from(shareLinks).where(eq(shareLinks.token, token)).limit(1);
  const link = rows[0];
  if (!link) return NextResponse.json({ error: "This link does not exist." }, { status: 404 });
  if (link.expiresAt && link.expiresAt.getTime() < Date.now())
    return NextResponse.json({ error: "This link has expired." }, { status: 410 });

  if (link.resourceType === "note") {
    const noteRows = await db.select().from(notes).where(eq(notes.id, link.resourceId)).limit(1);
    if (!noteRows[0]) return NextResponse.json({ error: "Note not found." }, { status: 404 });
    return NextResponse.json({ type: "note", note: noteRows[0] });
  }

  if (link.resourceType === "file") {
    const fileRows = await db.select().from(files).where(eq(files.id, link.resourceId)).limit(1);
    if (!fileRows[0]) return NextResponse.json({ error: "File not found." }, { status: 404 });
    return NextResponse.json({ type: "file", file: fileRows[0] });
  }

  // folder share
  const url = new URL(req.url);
  const requestedFolderId = url.searchParams.get("folderId") || link.resourceId;

  if (requestedFolderId !== link.resourceId) {
    const allowed = await isDescendantOrSelf(link.ownerId, requestedFolderId, link.resourceId);
    if (!allowed) return NextResponse.json({ error: "Not part of this shared folder." }, { status: 403 });
  }

  const rootRows = await db.select().from(folders).where(eq(folders.id, link.resourceId)).limit(1);
  if (!rootRows[0]) return NextResponse.json({ error: "Shared folder not found." }, { status: 404 });

  const subfolders = await db
    .select()
    .from(folders)
    .where(and(eq(folders.ownerId, link.ownerId), eq(folders.parentId, requestedFolderId)))
    .orderBy(folders.name);

  const fileRows = requestedFolderId
    ? await db
        .select()
        .from(files)
        .where(and(eq(files.ownerId, link.ownerId), eq(files.folderId, requestedFolderId)))
        .orderBy(files.name)
    : await db
        .select()
        .from(files)
        .where(and(eq(files.ownerId, link.ownerId), isNull(files.folderId)))
        .orderBy(files.name);

  const fullPath = await getFolderPath(link.ownerId, requestedFolderId);
  const rootIndex = fullPath.findIndex((p) => p.id === link.resourceId);
  const path = rootIndex >= 0 ? fullPath.slice(rootIndex) : fullPath;

  return NextResponse.json({
    type: "folder",
    rootId: link.resourceId,
    rootName: rootRows[0].name,
    folderId: requestedFolderId,
    folders: subfolders,
    files: fileRows,
    path,
  });
}
