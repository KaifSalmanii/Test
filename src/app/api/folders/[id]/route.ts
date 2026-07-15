import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { folders } from "@/db/schema";
import { withAccount } from "@/lib/apiHelpers";
import { deleteFolderRecursive, isDescendantOrSelf } from "@/lib/folderTree";
import { safeFileName } from "@/lib/format";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const { id } = await params;
  return withAccount(async (account) => {
    const body = await req.json().catch(() => ({}));
    const updates: Partial<typeof folders.$inferInsert> = { updatedAt: new Date() };

    if (typeof body.name === "string") updates.name = safeFileName(body.name);
    if (typeof body.description === "string") updates.description = body.description.slice(0, 500);

    if (typeof body.parentId !== "undefined") {
      const newParent = body.parentId ? String(body.parentId) : null;
      if (newParent) {
        const invalid = await isDescendantOrSelf(account.id, newParent, id);
        if (invalid) {
          return NextResponse.json(
            { error: "Cannot move a folder into itself or its own subfolder." },
            { status: 400 }
          );
        }
      }
      updates.parentId = newParent;
    }

    const [row] = await db
      .update(folders)
      .set(updates)
      .where(and(eq(folders.id, id), eq(folders.ownerId, account.id)))
      .returning();

    if (!row) return NextResponse.json({ error: "Folder not found." }, { status: 404 });
    return NextResponse.json({ folder: row });
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { id } = await params;
  return withAccount(async (account) => {
    const result = await deleteFolderRecursive(account, id);
    return NextResponse.json({ ok: true, ...result });
  });
}
