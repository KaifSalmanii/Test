import { NextRequest, NextResponse } from "next/server";
import { and, eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { guestLinks, folders } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { newId, newToken } from "@/lib/crypto";

export async function GET() {
  try {
    const user = await requireUser();
    const rows = await db.select().from(guestLinks).where(eq(guestLinks.ownerUserId, user.id)).orderBy(desc(guestLinks.createdAt));
    return NextResponse.json({ links: rows });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { folderId, label, expiresInHours } = await req.json();
    if (folderId) {
      const rows = await db.select().from(folders).where(and(eq(folders.id, folderId), eq(folders.userId, user.id))).limit(1);
      if (rows.length === 0) return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }
    const id = newId();
    const token = newToken(16);
    await db.insert(guestLinks).values({
      id,
      token,
      ownerUserId: user.id,
      folderId: folderId || null,
      label: label || null,
      expiresAt: expiresInHours ? new Date(Date.now() + Number(expiresInHours) * 3600 * 1000) : null,
    });
    const [row] = await db.select().from(guestLinks).where(eq(guestLinks.id, id));
    return NextResponse.json({ link: row });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create guest link";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
