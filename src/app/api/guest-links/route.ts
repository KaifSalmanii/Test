import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { folders, guestLinks } from "@/db/schema";
import { withAccount } from "@/lib/apiHelpers";
import { randomToken } from "@/lib/crypto";

export async function GET() {
  return withAccount(async (account) => {
    const rows = await db
      .select()
      .from(guestLinks)
      .where(eq(guestLinks.ownerId, account.id))
      .orderBy(desc(guestLinks.createdAt));
    return NextResponse.json({ links: rows });
  });
}

export async function POST(req: Request) {
  return withAccount(async (account) => {
    const body = await req.json().catch(() => ({}));
    const folderId = body.folderId ? String(body.folderId) : null;
    const label = String(body.label || "Guest upload").slice(0, 100);
    const expiresInHours = body.expiresInHours ? Number(body.expiresInHours) : null;
    const maxUses = body.maxUses ? Number(body.maxUses) : null;

    if (folderId) {
      const rows = await db.select().from(folders).where(eq(folders.id, folderId)).limit(1);
      if (!rows[0] || rows[0].ownerId !== account.id) {
        return NextResponse.json({ error: "Folder not found." }, { status: 404 });
      }
    }

    const token = randomToken(12);
    const expiresAt = expiresInHours ? new Date(Date.now() + expiresInHours * 3600 * 1000) : null;

    const [row] = await db
      .insert(guestLinks)
      .values({ token, ownerId: account.id, folderId, label, expiresAt, maxUses })
      .returning();

    return NextResponse.json({ link: row });
  });
}
