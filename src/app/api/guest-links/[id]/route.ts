import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { guestLinks } from "@/db/schema";
import { withAccount } from "@/lib/apiHelpers";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  return withAccount(async (account) => {
    const rows = await db
      .delete(guestLinks)
      .where(and(eq(guestLinks.id, id), eq(guestLinks.ownerId, account.id)))
      .returning();
    if (!rows[0]) return NextResponse.json({ error: "Link not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  });
}
