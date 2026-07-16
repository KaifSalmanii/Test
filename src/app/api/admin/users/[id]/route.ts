import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const update: Partial<typeof users.$inferInsert> = {};
    if (typeof body.isBanned === "boolean") update.isBanned = body.isBanned;
    if (typeof body.isAdmin === "boolean") update.isAdmin = body.isAdmin;
    await db.update(users).set(update).where(eq(users.id, id));
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
