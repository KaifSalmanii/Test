import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull, ilike, desc, asc } from "drizzle-orm";
import { db } from "@/db";
import { files } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const sp = req.nextUrl.searchParams;
    const folderId = sp.get("folderId");
    const category = sp.get("category");
    const q = sp.get("q");
    const sort = sp.get("sort") || "date";
    const order = sp.get("order") || "desc";
    const scope = sp.get("scope"); // 'all' = ignore folder, search everywhere

    const conditions = [eq(files.userId, user.id)];
    if (scope !== "all") {
      conditions.push(folderId ? eq(files.folderId, folderId) : isNull(files.folderId));
    }
    if (category && category !== "all") conditions.push(eq(files.category, category));
    if (q && q.trim()) conditions.push(ilike(files.name, `%${q.trim()}%`));

    const sortCol = sort === "name" ? files.name : sort === "size" ? files.size : files.createdAt;
    const orderFn = order === "asc" ? asc : desc;

    const rows = await db
      .select()
      .from(files)
      .where(and(...conditions))
      .orderBy(orderFn(sortCol));

    return NextResponse.json({ files: rows });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
