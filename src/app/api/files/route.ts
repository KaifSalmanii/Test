import { NextResponse } from "next/server";
import { and, asc, desc, eq, ilike, isNull, SQL } from "drizzle-orm";
import { db } from "@/db";
import { files } from "@/db/schema";
import { withAccount } from "@/lib/apiHelpers";

export async function GET(req: Request) {
  return withAccount(async (account) => {
    const url = new URL(req.url);
    const folderId = url.searchParams.get("folderId");
    const category = url.searchParams.get("category");
    const q = url.searchParams.get("q");
    const sortBy = url.searchParams.get("sortBy") || "date";
    const sortDir = url.searchParams.get("sortDir") || "desc";

    const conditions: SQL[] = [eq(files.ownerId, account.id)];

    if (folderId === "root") {
      conditions.push(isNull(files.folderId));
    } else if (folderId) {
      conditions.push(eq(files.folderId, folderId));
    }

    if (category && category !== "all") {
      conditions.push(eq(files.category, category));
    }

    if (q) {
      conditions.push(ilike(files.name, `%${q}%`));
    }

    const sortColumn = sortBy === "name" ? files.name : sortBy === "size" ? files.size : files.createdAt;
    const order = sortDir === "asc" ? asc(sortColumn) : desc(sortColumn);

    const rows = await db
      .select()
      .from(files)
      .where(and(...conditions))
      .orderBy(order);

    return NextResponse.json({ files: rows });
  });
}
