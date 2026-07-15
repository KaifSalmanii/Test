import { NextResponse } from "next/server";
import { db } from "@/db";
import { files } from "@/db/schema";
import { withAccount } from "@/lib/apiHelpers";
import { categoryFromMime, safeFileName } from "@/lib/format";
import { uploadBufferToTelegram } from "@/lib/telegram";
import { cleanTelegramError } from "@/lib/telegramErrors";

export const maxDuration = 300;

const MAX_SIZE = 1_950_000_000; // ~1.95GB, safely under Telegram's per-file cap

export async function POST(req: Request) {
  return withAccount(async (account) => {
    const form = await req.formData().catch(() => null);
    if (!form) return NextResponse.json({ error: "Invalid upload payload." }, { status: 400 });

    const file = form.get("file");
    const folderId = form.get("folderId");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File is larger than the 1.95GB per-file limit." }, {
        status: 400,
      });
    }

    const name = safeFileName(file.name || "Untitled");
    const mimeType = file.type || "application/octet-stream";
    const category = categoryFromMime(mimeType, name);

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const { messageId, size } = await uploadBufferToTelegram(account, {
        buffer,
        name,
        mimeType,
      });

      const [row] = await db
        .insert(files)
        .values({
          ownerId: account.id,
          folderId: typeof folderId === "string" && folderId ? folderId : null,
          name,
          mimeType,
          category,
          size,
          messageId,
          uploadedVia: "owner",
        })
        .returning();

      return NextResponse.json({ file: row });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed.";
      return NextResponse.json({ error: cleanTelegramError(message) }, { status: 500 });
    }
  });
}
