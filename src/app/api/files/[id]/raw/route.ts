import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { files } from "@/db/schema";
import { getCurrentAccount } from "@/lib/auth";
import { streamTelegramFile } from "@/lib/streamFile";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Params) {
  const { id } = await params;
  const account = await getCurrentAccount();
  if (!account) return new Response("Unauthorized", { status: 401 });

  const rows = await db
    .select()
    .from(files)
    .where(and(eq(files.id, id), eq(files.ownerId, account.id)))
    .limit(1);
  const file = rows[0];
  if (!file) return new Response("Not found", { status: 404 });

  return streamTelegramFile(req, account, file);
}
