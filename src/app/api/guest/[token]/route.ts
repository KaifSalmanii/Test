import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { folders, guestLinks, telegramAccounts } from "@/db/schema";

type Params = { params: Promise<{ token: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;
  const rows = await db.select().from(guestLinks).where(eq(guestLinks.token, token)).limit(1);
  const link = rows[0];
  if (!link) return NextResponse.json({ error: "This upload link does not exist." }, { status: 404 });

  if (!link.active) return NextResponse.json({ error: "This upload link was revoked." }, { status: 410 });
  if (link.expiresAt && link.expiresAt.getTime() < Date.now())
    return NextResponse.json({ error: "This upload link has expired." }, { status: 410 });
  if (link.maxUses && link.uses >= link.maxUses)
    return NextResponse.json({ error: "This upload link has reached its upload limit." }, { status: 410 });

  const ownerRows = await db
    .select()
    .from(telegramAccounts)
    .where(eq(telegramAccounts.id, link.ownerId))
    .limit(1);
  const owner = ownerRows[0];

  let folderName = "Home";
  if (link.folderId) {
    const folderRows = await db.select().from(folders).where(eq(folders.id, link.folderId)).limit(1);
    folderName = folderRows[0]?.name || "Home";
  }

  return NextResponse.json({
    label: link.label,
    ownerName: owner?.firstName || owner?.username || "UnlimTD user",
    folderName,
    usesLeft: link.maxUses ? Math.max(0, link.maxUses - link.uses) : null,
    expiresAt: link.expiresAt,
  });
}
