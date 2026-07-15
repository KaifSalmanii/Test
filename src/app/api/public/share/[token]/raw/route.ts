import { eq } from "drizzle-orm";
import { db } from "@/db";
import { files, shareLinks, telegramAccounts } from "@/db/schema";
import { isDescendantOrSelf } from "@/lib/folderTree";
import { streamTelegramFile } from "@/lib/streamFile";

type Params = { params: Promise<{ token: string }> };

export async function GET(req: Request, { params }: Params) {
  const { token } = await params;
  const rows = await db.select().from(shareLinks).where(eq(shareLinks.token, token)).limit(1);
  const link = rows[0];
  if (!link) return new Response("Not found", { status: 404 });
  if (link.expiresAt && link.expiresAt.getTime() < Date.now())
    return new Response("Link expired", { status: 410 });

  const url = new URL(req.url);
  const fileId = url.searchParams.get("fileId");

  let targetFileId = link.resourceId;
  if (link.resourceType === "folder") {
    if (!fileId) return new Response("Missing fileId", { status: 400 });
    targetFileId = fileId;
  } else if (link.resourceType !== "file") {
    return new Response("Not a file share", { status: 400 });
  }

  const fileRows = await db.select().from(files).where(eq(files.id, targetFileId)).limit(1);
  const file = fileRows[0];
  if (!file || file.ownerId !== link.ownerId) return new Response("Not found", { status: 404 });

  if (link.resourceType === "folder" && file.folderId) {
    const allowed = await isDescendantOrSelf(link.ownerId, file.folderId, link.resourceId);
    if (!allowed) return new Response("Forbidden", { status: 403 });
  }

  const accountRows = await db
    .select()
    .from(telegramAccounts)
    .where(eq(telegramAccounts.id, link.ownerId))
    .limit(1);
  const account = accountRows[0];
  if (!account) return new Response("Owner not found", { status: 404 });

  return streamTelegramFile(req, account, file);
}
