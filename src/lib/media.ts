import bigInt from "big-integer";
import { Api, createClient } from "@/lib/telegram";
import { decryptText } from "@/lib/crypto";

const CHUNK = 1024 * 1024; // 1MB aligned chunks required by Telegram file API

interface MediaLocationInfo {
  location: Api.TypeInputFileLocation;
  size: number;
  dcId?: number;
}

function resolveMediaLocation(message: unknown): MediaLocationInfo | null {
  const msg = message as {
    photo?: {
      id: unknown;
      accessHash: unknown;
      fileReference: Buffer;
      dcId?: number;
      sizes?: Array<{ type?: string; size?: number; w?: number; h?: number }>;
    };
    document?: {
      id: unknown;
      accessHash: unknown;
      fileReference: Buffer;
      dcId?: number;
      size?: unknown;
    };
  };

  if (msg.document) {
    const doc = msg.document;
    return {
      location: new Api.InputDocumentFileLocation({
        id: doc.id as never,
        accessHash: doc.accessHash as never,
        fileReference: doc.fileReference,
        thumbSize: "",
      }),
      size: Number(doc.size || 0),
      dcId: doc.dcId,
    };
  }
  if (msg.photo) {
    const photo = msg.photo;
    const sizes = photo.sizes || [];
    const largest = sizes.reduce<{ type?: string; size?: number } | undefined>((best, s) => {
      if (!best) return s;
      return (s.size || 0) > (best.size || 0) ? s : best;
    }, undefined);
    return {
      location: new Api.InputPhotoFileLocation({
        id: photo.id as never,
        accessHash: photo.accessHash as never,
        fileReference: photo.fileReference,
        thumbSize: largest?.type || "y",
      }),
      size: Number(largest?.size || 0),
      dcId: photo.dcId,
    };
  }
  return null;
}

export interface OpenedStream {
  stream: ReadableStream<Uint8Array>;
  status: number;
  start: number;
  end: number;
  totalSize: number;
}

export async function openMediaStream(
  sessionEncrypted: string,
  telegramMessageId: number,
  rangeHeader: string | null,
  forThumb = false
): Promise<OpenedStream> {
  const sessionString = decryptText(sessionEncrypted);
  const client = createClient(sessionString);
  await client.connect();

  let disconnected = false;
  const disconnectOnce = async () => {
    if (disconnected) return;
    disconnected = true;
    try {
      await client.disconnect();
    } catch {
      // ignore
    }
  };

  try {
    const messages = await client.getMessages("me", { ids: [telegramMessageId] });
    const message = messages?.[0];
    if (!message) throw new Error("File not found on Telegram (it may have been deleted)");

    let info: MediaLocationInfo | null;
    if (forThumb) {
      const msg = message as unknown as {
        photo?: { id: unknown; accessHash: unknown; fileReference: Buffer; dcId?: number; sizes?: Array<{ type?: string; size?: number }> };
        document?: { id: unknown; accessHash: unknown; fileReference: Buffer; dcId?: number; thumbs?: Array<{ type?: string; size?: number }> };
      };
      const thumbs = msg.photo?.sizes || msg.document?.thumbs;
      const small = thumbs?.[0];
      if (msg.photo && small) {
        info = {
          location: new Api.InputPhotoFileLocation({
            id: msg.photo.id as never,
            accessHash: msg.photo.accessHash as never,
            fileReference: msg.photo.fileReference,
            thumbSize: small.type || "s",
          }),
          size: Number(small.size || 65536),
          dcId: msg.photo.dcId,
        };
      } else if (msg.document && small) {
        info = {
          location: new Api.InputDocumentFileLocation({
            id: msg.document.id as never,
            accessHash: msg.document.accessHash as never,
            fileReference: msg.document.fileReference,
            thumbSize: small.type || "s",
          }),
          size: Number(small.size || 65536),
          dcId: msg.document.dcId,
        };
      } else {
        info = resolveMediaLocation(message);
      }
    } else {
      info = resolveMediaLocation(message);
    }

    if (!info || !info.size) throw new Error("No downloadable media on this file");

    const totalSize = info.size;
    let start = 0;
    let end = totalSize - 1;
    let status = 200;
    if (rangeHeader) {
      const m = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
      if (m) {
        start = parseInt(m[1], 10);
        end = m[2] ? parseInt(m[2], 10) : totalSize - 1;
        status = 206;
      }
    }
    if (end >= totalSize) end = totalSize - 1;
    if (start > end) start = end;

    const alignedStart = Math.floor(start / CHUNK) * CHUNK;
    const contentLength = end - start + 1;

    const iter = client.iterDownload({
      file: info.location,
      offset: bigInt(alignedStart),
      requestSize: CHUNK,
      dcId: info.dcId,
    });
    const asyncIter = iter[Symbol.asyncIterator]();

    let posInAligned = alignedStart;
    let bytesWritten = 0;

    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          if (bytesWritten >= contentLength) {
            controller.close();
            await iter.close().catch(() => {});
            await disconnectOnce();
            return;
          }
          const { value, done } = await asyncIter.next();
          if (done || !value || value.length === 0) {
            controller.close();
            await iter.close().catch(() => {});
            await disconnectOnce();
            return;
          }
          const chunk: Buffer = value;
          const chunkStart = posInAligned;
          const chunkEnd = posInAligned + chunk.length;
          posInAligned = chunkEnd;

          let sliceStart = 0;
          let sliceEnd = chunk.length;
          if (chunkStart < start) sliceStart = start - chunkStart;
          if (chunkEnd > end + 1) sliceEnd = chunk.length - (chunkEnd - (end + 1));

          if (sliceStart < sliceEnd) {
            const piece = chunk.subarray(sliceStart, sliceEnd);
            controller.enqueue(new Uint8Array(piece));
            bytesWritten += piece.length;
          }
          if (chunkEnd > end) {
            controller.close();
            await iter.close().catch(() => {});
            await disconnectOnce();
          }
        } catch (err) {
          controller.error(err);
          await iter.close().catch(() => {});
          await disconnectOnce();
        }
      },
      async cancel() {
        await iter.close().catch(() => {});
        await disconnectOnce();
      },
    });

    return { stream, status, start, end, totalSize };
  } catch (err) {
    await disconnectOnce();
    throw err;
  }
}
