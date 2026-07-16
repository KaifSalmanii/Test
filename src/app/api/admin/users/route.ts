import { NextResponse } from "next/server";
import { desc, eq, count, sum } from "drizzle-orm";
import { db } from "@/db";
import { users, files, shareLinks } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const rows = await db.select().from(users).orderBy(desc(users.lastSeenAt));
    const result = await Promise.all(
      rows.map(async (u) => {
        const [{ total, totalSize }] = await db
          .select({ total: count(), totalSize: sum(files.size) })
          .from(files)
          .where(eq(files.userId, u.id));
        const [{ shares }] = await db.select({ shares: count() }).from(shareLinks).where(eq(shareLinks.createdBy, u.id));
        return {
          id: u.id,
          name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "Telegram User",
          username: u.username,
          phone: u.phone,
          photoDataUrl: u.photoDataUrl,
          isAdmin: u.isAdmin,
          isBanned: u.isBanned,
          loginCount: u.loginCount,
          createdAt: u.createdAt,
          lastLoginAt: u.lastLoginAt,
          lastSeenAt: u.lastSeenAt,
          totalFiles: total,
          storageUsed: Number(totalSize || 0),
          sharesCreated: shares,
        };
      })
    );
    return NextResponse.json({ users: result });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
