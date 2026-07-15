import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { folders } from "@/db/schema";
import { withAccount } from "@/lib/apiHelpers";
import { getFolderPath } from "@/lib/folderTree";
import { safeFileName } from "@/lib/format";

export async function GET(req: Request) {
  return withAccount(async (account) => {
    const url = new URL(req.url);
    const parentId = url.searchParams.get("parentId");

    const where = parentId
      ? and(eq(folders.ownerId, account.id), eq(folders.parentId, parentId))
      : and(eq(folders.ownerId, account.id), isNull(folders.parentId));

    const rows = await db.select().from(folders).where(where).orderBy(folders.name);
    const path = await getFolderPath(account.id, parentId);

    return NextResponse.json({ folders: rows, path });
  });
}

export async function POST(req: Request) {
  return withAccount(async (account) => {
    const body = await req.json().catch(() => ({}));
    const name = safeFileName(String(body.name || "New folder"));
    const parentId = body.parentId ? String(body.parentId) : null;
    const description = body.description ? String(body.description).slice(0, 500) : null;

    const [row] = await db
      .insert(folders)
      .values({ ownerId: account.id, name, parentId, description })
      .returning();

    return NextResponse.json({ folder: row });
  });
}
