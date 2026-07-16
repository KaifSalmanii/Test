import fs from "fs";
import fsp from "fs/promises";
import os from "os";
import path from "path";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { files, users } from "@/db/schema";
import { newId } from "@/lib/crypto";
import { categoryFromMime, withUserClient, Api } from "@/lib/telegram";
import { CustomFile } from "telegram/client/uploads";

const BASE_DIR = path.join(os.tmpdir(), "unlimtd-uploads");

export const RECOMMENDED_CHUNK_SIZE = 8 * 1024 * 1024; // 8MB
export const UPLOAD_WORKERS = 8;

interface Manifest {
  ownerUserId: string;
  folderId: string | null;
  name: string;
  size: number;
  mimeType: string;
  uploadedByGuest: boolean;
  guestLabel: string | null;
  createdAt: number;
}

function dirFor(uploadId: string) {
  return path.join(BASE_DIR, uploadId);
}

async function ensureDir(dir: string) {
  await fsp.mkdir(dir, { recursive: true });
}

export async function initUpload(params: {
  ownerUserId: string;
  folderId: string | null;
  name: string;
  size: number;
  mimeType: string;
  uploadedByGuest?: boolean;
  guestLabel?: string | null;
}): Promise<{ uploadId: string; chunkSize: number }> {
  const uploadId = newId();
  const dir = dirFor(uploadId);
  await ensureDir(dir);
  const manifest: Manifest = {
    ownerUserId: params.ownerUserId,
    folderId: params.folderId,
    name: params.name,
    size: params.size,
    mimeType: params.mimeType || "application/octet-stream",
    uploadedByGuest: Boolean(params.uploadedByGuest),
    guestLabel: params.guestLabel ?? null,
    createdAt: Date.now(),
  };
  await fsp.writeFile(path.join(dir, "manifest.json"), JSON.stringify(manifest));
  return { uploadId, chunkSize: RECOMMENDED_CHUNK_SIZE };
}

async function readManifest(uploadId: string): Promise<Manifest> {
  const raw = await fsp.readFile(path.join(dirFor(uploadId), "manifest.json"), "utf8");
  return JSON.parse(raw) as Manifest;
}

export async function getUploadOwner(uploadId: string): Promise<string | null> {
  try {
    const m = await readManifest(uploadId);
    return m.ownerUserId;
  } catch {
    return null;
  }
}

export async function writeChunk(uploadId: string, index: number, data: Buffer) {
  const dir = dirFor(uploadId);
  await ensureDir(dir);
  await fsp.writeFile(path.join(dir, `part-${index}.bin`), data);
}

export async function cancelUpload(uploadId: string) {
  const dir = dirFor(uploadId);
  await fsp.rm(dir, { recursive: true, force: true });
}

export async function finalizeUpload(
  uploadId: string,
  onProgress?: (sent: number, total: number) => void
) {
  const dir = dirFor(uploadId);
  const manifest = await readManifest(uploadId);

  const entries = await fsp.readdir(dir);
  const parts = entries
    .filter((f) => f.startsWith("part-"))
    .map((f) => ({ f, idx: parseInt(f.slice(5, -4), 10) }))
    .sort((a, b) => a.idx - b.idx);

  if (parts.length === 0) throw new Error("No chunks uploaded");

  const assembledPath = path.join(dir, "assembled.bin");
  const writeStream = fs.createWriteStream(assembledPath);
  for (const p of parts) {
    const buf = await fsp.readFile(path.join(dir, p.f));
    await new Promise<void>((resolve, reject) => {
      writeStream.write(buf, (err) => (err ? reject(err) : resolve()));
    });
  }
  await new Promise<void>((resolve) => writeStream.end(resolve));

  const stat = await fsp.stat(assembledPath);
  const category = categoryFromMime(manifest.mimeType);

  const ownerRows = await db.select().from(users).where(eq(users.id, manifest.ownerUserId)).limit(1);
  const owner = ownerRows[0];
  if (!owner) throw new Error("Owner account not found");

  const customFile = new CustomFile(manifest.name, stat.size, assembledPath);

  const message = await withUserClient(owner.sessionEncrypted, async (client) => {
    return client.sendFile("me", {
      file: customFile,
      workers: UPLOAD_WORKERS,
      forceDocument: category === "document" || category === "other",
      progressCallback: onProgress
        ? (progress: number) => {
            try {
              onProgress(Math.round(progress * stat.size), stat.size);
            } catch {
              // ignore
            }
          }
        : undefined,
    });
  });

  let width: number | null = null;
  let height: number | null = null;
  let duration: number | null = null;
  try {
    const anyMsg = message as unknown as {
      photo?: { sizes?: Array<{ w?: number; h?: number }> };
      video?: { w?: number; h?: number; duration?: number };
      document?: { attributes?: Api.TypeDocumentAttribute[] };
    };
    if (anyMsg.video) {
      width = anyMsg.video.w ?? null;
      height = anyMsg.video.h ?? null;
      duration = anyMsg.video.duration ? Math.round(anyMsg.video.duration) : null;
    } else if (anyMsg.photo?.sizes?.length) {
      const last = anyMsg.photo.sizes[anyMsg.photo.sizes.length - 1];
      width = last.w ?? null;
      height = last.h ?? null;
    } else if (anyMsg.document?.attributes) {
      for (const attr of anyMsg.document.attributes) {
        if (attr instanceof Api.DocumentAttributeVideo) {
          width = attr.w;
          height = attr.h;
          duration = Math.round(attr.duration);
        }
        if (attr instanceof Api.DocumentAttributeAudio) {
          duration = Math.round(attr.duration);
        }
      }
    }
  } catch {
    // best effort only
  }

  const fileId = newId();
  await db.insert(files).values({
    id: fileId,
    userId: manifest.ownerUserId,
    folderId: manifest.folderId,
    name: manifest.name,
    mimeType: manifest.mimeType,
    size: stat.size,
    category,
    telegramChatId: "me",
    telegramMessageId: message.id,
    width,
    height,
    duration,
    uploadedByGuest: manifest.uploadedByGuest,
    guestLabel: manifest.guestLabel,
  });

  await fsp.rm(dir, { recursive: true, force: true });

  return { id: fileId, name: manifest.name, size: stat.size, category };
}
