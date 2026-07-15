import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { files, folders, notes, shareLinks } from "@/db/schema";
import { withAccount } from "@/lib/apiHelpers";
import { randomToken } from "@/lib/crypto";

export async function GET() {
  return withAccount(async (account) => {
    const rows = await db
      .select()
      .from(shareLinks)
      .where(eq(shareLinks.ownerId, account.id))
      .orderBy(desc(shareLinks.createdAt));
    return NextResponse.json({ links: rows });
  });
}

export async function POST(req: Request) {
  return withAccount(async (account) => {
    const body = await req.json().catch(() => ({}));
    const resourceType = String(body.resourceType || "");
    const resourceId = String(body.resourceId || "");
    const expiresInHours = body.expiresInHours ? Number(body.expiresInHours) : null;

    if (!["file", "folder", "note"].includes(resourceType) || !resourceId) {
      return NextResponse.json({ error: "Invalid share request." }, { status: 400 });
    }

    let resourceName = "";
    if (resourceType === "file") {
      const rows = await db.select().from(files).where(eq(files.id, resourceId)).limit(1);
      if (!rows[0] || rows[0].ownerId !== account.id)
        return NextResponse.json({ error: "File not found." }, { status: 404 });
      resourceName = rows[0].name;
    } else if (resourceType === "folder") {
      const rows = await db.select().from(folders).where(eq(folders.id, resourceId)).limit(1);
      if (!rows[0] || rows[0].ownerId !== account.id)
        return NextResponse.json({ error: "Folder not found." }, { status: 404 });
      resourceName = rows[0].name;
    } else {
      const rows = await db.select().from(notes).where(eq(notes.id, resourceId)).limit(1);
      if (!rows[0] || rows[0].ownerId !== account.id)
        return NextResponse.json({ error: "Note not found." }, { status: 404 });
      resourceName = rows[0].title;
    }

    const token = randomToken(12);
    const expiresAt = expiresInHours ? new Date(Date.now() + expiresInHours * 3600 * 1000) : null;

    const [row] = await db
      .insert(shareLinks)
      .values({ token, ownerId: account.id, resourceType, resourceId, resourceName, expiresAt })
      .returning();

    return NextResponse.json({ link: row });
  });
}
