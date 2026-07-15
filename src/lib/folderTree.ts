import "server-only";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import { files, folders } from "@/db/schema";
import { deleteTelegramMessages } from "@/lib/telegram";
import type { TelegramAccountRow } from "@/lib/telegram";

export async function getDescendantFolderIds(ownerId: string, rootId: string): Promise<string[]> {
  const all: string[] = [rootId];
  let frontier = [rootId];

  while (frontier.length) {
    const children = await db
      .select({ id: folders.id })
      .from(folders)
      .where(and(eq(folders.ownerId, ownerId), inArray(folders.parentId, frontier)));
    const ids = children.map((c) => c.id);
    if (ids.length === 0) break;
    all.push(...ids);
    frontier = ids;
  }

  return all;
}

export async function getFolderPath(ownerId: string, folderId: string | null) {
  const chain: { id: string; name: string }[] = [];
  let current = folderId;

  while (current) {
    const rows = await db
      .select()
      .from(folders)
      .where(and(eq(folders.id, current), eq(folders.ownerId, ownerId)))
      .limit(1);
    const folder = rows[0];
    if (!folder) break;
    chain.unshift({ id: folder.id, name: folder.name });
    current = folder.parentId;
  }

  return chain;
}

export async function isDescendantOrSelf(
  ownerId: string,
  candidateId: string,
  ancestorId: string
): Promise<boolean> {
  const descendants = await getDescendantFolderIds(ownerId, ancestorId);
  return descendants.includes(candidateId);
}

export async function deleteFolderRecursive(account: TelegramAccountRow, folderId: string) {
  const folderIds = await getDescendantFolderIds(account.id, folderId);

  const fileRows = await db
    .select()
    .from(files)
    .where(and(eq(files.ownerId, account.id), inArray(files.folderId, folderIds)));

  await deleteTelegramMessages(
    account,
    fileRows.map((f) => f.messageId)
  );

  await db.delete(files).where(and(eq(files.ownerId, account.id), inArray(files.folderId, folderIds)));
  await db.delete(folders).where(and(eq(folders.ownerId, account.id), inArray(folders.id, folderIds)));

  return { deletedFiles: fileRows.length, deletedFolders: folderIds.length };
}

export function rootFilter(ownerId: string) {
  return and(eq(folders.ownerId, ownerId), isNull(folders.parentId));
}
