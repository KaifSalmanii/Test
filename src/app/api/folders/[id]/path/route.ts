import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { folders } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const chain: { id: string; name: string }[] = [];
    let currentId: string | null = id;
    let guard = 0;
    while (currentId && guard < 50) {
      guard++;
      const rows: (typeof folders.$inferSelect)[] = await db
        .select()
        .from(folders)
        .where(and(eq(folders.id, currentId), eq(folders.userId, user.id)))
        .limit(1);
      const folder: typeof folders.$inferSelect | undefined = rows[0];
      if (!folder) break;
      chain.unshift({ id: folder.id, name: folder.name });
      currentId = folder.parentId;
    }
    return NextResponse.json({ path: chain });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
