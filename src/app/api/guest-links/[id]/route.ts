import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { guestLinks } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const rows = await db.select().from(guestLinks).where(and(eq(guestLinks.id, id), eq(guestLinks.ownerUserId, user.id))).limit(1);
    if (rows.length === 0) return NextResponse.json({ error: "Link not found" }, { status: 404 });
    await db.update(guestLinks).set({ revoked: true }).where(eq(guestLinks.id, id));
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to revoke link";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
