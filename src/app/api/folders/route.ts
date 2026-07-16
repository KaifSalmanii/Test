import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { folders } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { newId } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const parentId = req.nextUrl.searchParams.get("parentId");
    const rows = await db
      .select()
      .from(folders)
      .where(
        parentId
          ? and(eq(folders.userId, user.id), eq(folders.parentId, parentId))
          : and(eq(folders.userId, user.id), isNull(folders.parentId))
      );
    rows.sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ folders: rows });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { name, parentId, isHidden } = await req.json();
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Folder name required" }, { status: 400 });
    }
    if (parentId) {
      const parent = await db
        .select()
        .from(folders)
        .where(and(eq(folders.id, parentId), eq(folders.userId, user.id)))
        .limit(1);
      if (parent.length === 0) return NextResponse.json({ error: "Parent folder not found" }, { status: 404 });
    }
    const id = newId();
    await db.insert(folders).values({
      id,
      userId: user.id,
      parentId: parentId || null,
      name: name.trim().slice(0, 120),
      isHidden: Boolean(isHidden),
    });
    const [row] = await db.select().from(folders).where(eq(folders.id, id));
    return NextResponse.json({ folder: row });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create folder";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
