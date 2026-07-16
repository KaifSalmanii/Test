import { NextResponse } from "next/server";
import { count, sum, gt } from "drizzle-orm";
import { db } from "@/db";
import { users, files, folders, shareLinks, guestLinks, notes } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const [{ totalUsers }] = await db.select({ totalUsers: count() }).from(users);
    const dayAgo = new Date(Date.now() - 24 * 3600 * 1000);
    const [{ activeToday }] = await db.select({ activeToday: count() }).from(users).where(gt(users.lastSeenAt, dayAgo));
    const [{ repeatUsers }] = await db.select({ repeatUsers: count() }).from(users).where(gt(users.loginCount, 1));
    const [{ bannedUsers }] = await db.select({ bannedUsers: count() }).from(users).where(gt(users.isBanned as never, false as never)).catch?.(() => [{ bannedUsers: 0 }]) ?? [{ bannedUsers: 0 }];

    const [{ totalFiles, totalStorage }] = await db.select({ totalFiles: count(), totalStorage: sum(files.size) }).from(files);
    const [{ totalFolders }] = await db.select({ totalFolders: count() }).from(folders);
    const [{ totalShares }] = await db.select({ totalShares: count() }).from(shareLinks);
    const [{ totalGuestLinks }] = await db.select({ totalGuestLinks: count() }).from(guestLinks);
    const [{ totalNotes }] = await db.select({ totalNotes: count() }).from(notes);

    return NextResponse.json({
      totalUsers,
      activeToday,
      repeatUsers,
      bannedUsers,
      totalFiles,
      totalStorage: Number(totalStorage || 0),
      totalFolders,
      totalShares,
      totalGuestLinks,
      totalNotes,
    });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
