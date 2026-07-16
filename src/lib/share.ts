import { eq } from "drizzle-orm";
import { db } from "@/db";
import { shareLinks, files, notes, users } from "@/db/schema";

export async function loadShare(token: string) {
  const rows = await db.select().from(shareLinks).where(eq(shareLinks.token, token)).limit(1);
  const share = rows[0];
  if (!share) return { error: "Link not found" as const };
  if (share.revoked) return { error: "This link has been revoked" as const };
  if (share.expiresAt && share.expiresAt.getTime() < Date.now()) return { error: "This link has expired" as const };

  if (share.type === "file") {
    if (!share.fileId) return { error: "Invalid link" as const };
    const fileRows = await db.select().from(files).where(eq(files.id, share.fileId)).limit(1);
    const file = fileRows[0];
    if (!file) return { error: "File no longer exists" as const };
    const ownerRows = await db.select().from(users).where(eq(users.id, file.userId)).limit(1);
    const owner = ownerRows[0];
    if (!owner) return { error: "Owner not found" as const };
    return { kind: "file" as const, share, file, owner };
  }
  if (share.type === "note") {
    if (!share.noteId) return { error: "Invalid link" as const };
    const noteRows = await db.select().from(notes).where(eq(notes.id, share.noteId)).limit(1);
    const note = noteRows[0];
    if (!note) return { error: "Note no longer exists" as const };
    return { kind: "note" as const, share, note };
  }
  return { error: "Invalid link" as const };
}
