import { NextRequest, NextResponse } from "next/server";
import { and, eq, ilike, desc } from "drizzle-orm";
import { db } from "@/db";
import { notes } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { newId } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const q = req.nextUrl.searchParams.get("q");
    const conditions = [eq(notes.userId, user.id)];
    if (q && q.trim()) conditions.push(ilike(notes.title, `%${q.trim()}%`));
    const rows = await db
      .select()
      .from(notes)
      .where(and(...conditions))
      .orderBy(desc(notes.isPinned), desc(notes.updatedAt));
    return NextResponse.json({ notes: rows });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const id = newId();
    await db.insert(notes).values({
      id,
      userId: user.id,
      title: (body.title || "Untitled note").slice(0, 200),
      content: body.content || "",
    });
    const [row] = await db.select().from(notes).where(eq(notes.id, id));
    return NextResponse.json({ note: row });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create note";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
