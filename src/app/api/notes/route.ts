import { NextResponse } from "next/server";
import { and, desc, eq, or, ilike } from "drizzle-orm";
import { db } from "@/db";
import { notes } from "@/db/schema";
import { withAccount } from "@/lib/apiHelpers";

export async function GET(req: Request) {
  return withAccount(async (account) => {
    const url = new URL(req.url);
    const q = url.searchParams.get("q");

    const where = q
      ? and(eq(notes.ownerId, account.id), or(ilike(notes.title, `%${q}%`), ilike(notes.content, `%${q}%`)))
      : eq(notes.ownerId, account.id);

    const rows = await db.select().from(notes).where(where).orderBy(desc(notes.updatedAt));
    return NextResponse.json({ notes: rows });
  });
}

export async function POST(req: Request) {
  return withAccount(async (account) => {
    const body = await req.json().catch(() => ({}));
    const title = String(body.title || "Untitled note").slice(0, 200);
    const content = String(body.content || "");

    const [row] = await db.insert(notes).values({ ownerId: account.id, title, content }).returning();
    return NextResponse.json({ note: row });
  });
}
