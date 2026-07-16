import { eq } from "drizzle-orm";
import { db } from "@/db";
import { guestLinks, users, folders } from "@/db/schema";

export async function loadGuestLink(token: string) {
  const rows = await db.select().from(guestLinks).where(eq(guestLinks.token, token)).limit(1);
  const link = rows[0];
  if (!link) return { error: "Upload link not found" as const };
  if (link.revoked) return { error: "This upload link has been disabled" as const };
  if (link.expiresAt && link.expiresAt.getTime() < Date.now()) return { error: "This upload link has expired" as const };
  const ownerRows = await db.select().from(users).where(eq(users.id, link.ownerUserId)).limit(1);
  const owner = ownerRows[0];
  if (!owner) return { error: "Owner not found" as const };
  let folderName: string | null = null;
  if (link.folderId) {
    const folderRows = await db.select().from(folders).where(eq(folders.id, link.folderId)).limit(1);
    folderName = folderRows[0]?.name ?? null;
  }
  return { link, owner, folderName };
}
