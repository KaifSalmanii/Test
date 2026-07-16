import { NextResponse } from "next/server";
import { eq, count, sum, desc } from "drizzle-orm";
import { db } from "@/db";
import { files, folders } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireUser();

    const [{ total, totalSize }] = await db
      .select({ total: count(), totalSize: sum(files.size) })
      .from(files)
      .where(eq(files.userId, user.id));

    const byCategory = await db
      .select({ category: files.category, total: count(), size: sum(files.size) })
      .from(files)
      .where(eq(files.userId, user.id))
      .groupBy(files.category);

    const [{ totalFolders }] = await db.select({ totalFolders: count() }).from(folders).where(eq(folders.userId, user.id));

    const biggest = await db
      .select()
      .from(files)
      .where(eq(files.userId, user.id))
      .orderBy(desc(files.size))
      .limit(1);

    return NextResponse.json({
      totalFiles: total,
      totalSize: Number(totalSize || 0),
      totalFolders,
      byCategory: byCategory.map((c) => ({ category: c.category, total: c.total, size: Number(c.size || 0) })),
      biggestFile: biggest[0] || null,
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
