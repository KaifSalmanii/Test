import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { files, guestLinks, telegramAccounts } from "@/db/schema";
import { categoryFromMime, safeFileName } from "@/lib/format";
import { uploadBufferToTelegram } from "@/lib/telegram";
import { cleanTelegramError } from "@/lib/telegramErrors";

type Params = { params: Promise<{ token: string }> };

const MAX_SIZE = 1_950_000_000;

export async function POST(req: Request, { params }: Params) {
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
  if (!owner) return NextResponse.json({ error: "Owner account not found." }, { status: 404 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file provided." }, { status: 400 });
  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: "File is larger than the 1.95GB limit." }, { status: 400 });

  const name = safeFileName(file.name || "Untitled");
  const mimeType = file.type || "application/octet-stream";
  const category = categoryFromMime(mimeType, name);

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { messageId, size } = await uploadBufferToTelegram(owner, { buffer, name, mimeType });

    const [row] = await db
      .insert(files)
      .values({
        ownerId: owner.id,
        folderId: link.folderId,
        name,
        mimeType,
        category,
        size,
        messageId,
        uploadedVia: "guest",
      })
      .returning();

    await db
      .update(guestLinks)
      .set({ uses: sql`${guestLinks.uses} + 1` })
      .where(eq(guestLinks.id, link.id));

    return NextResponse.json({ file: row });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    return NextResponse.json({ error: cleanTelegramError(message) }, { status: 500 });
  }
}
