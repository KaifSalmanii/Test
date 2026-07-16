import { TelegramClient, Api } from "telegram";
import { StringSession } from "telegram/sessions";
import { getTelegramCreds } from "./env";
import { decryptText } from "./crypto";

export function assertTelegramConfigured() {
  const { configured } = getTelegramCreds();
  if (!configured) {
    throw new Error(
      "Telegram API credentials are not configured. Set TELEGRAM_API_ID and TELEGRAM_API_HASH in the environment (see README)."
    );
  }
}

export function createClient(sessionString = ""): TelegramClient {
  const { apiId, apiHash } = getTelegramCreds();
  return new TelegramClient(new StringSession(sessionString), apiId, apiHash, {
    connectionRetries: 3,
    useWSS: false,
  });
}

export async function withRawClient<T>(
  sessionString: string,
  fn: (client: TelegramClient) => Promise<T>
): Promise<T> {
  assertTelegramConfigured();
  const client = createClient(sessionString);
  await client.connect();
  try {
    return await fn(client);
  } finally {
    try {
      await client.disconnect();
    } catch {
      // ignore
    }
  }
}

export async function withUserClient<T>(
  encryptedSession: string,
  fn: (client: TelegramClient) => Promise<T>
): Promise<T> {
  const sessionString = decryptText(encryptedSession);
  return withRawClient(sessionString, fn);
}

export function categoryFromMime(mime: string): "photo" | "video" | "audio" | "document" | "other" {
  if (!mime) return "other";
  if (mime.startsWith("image/")) return "photo";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (
    mime === "application/pdf" ||
    mime.startsWith("text/") ||
    mime.includes("word") ||
    mime.includes("excel") ||
    mime.includes("powerpoint") ||
    mime.includes("sheet") ||
    mime.includes("presentation") ||
    mime === "application/zip" ||
    mime === "application/x-rar-compressed" ||
    mime === "application/json"
  ) {
    return "document";
  }
  return "other";
}

export async function fetchProfilePhotoDataUrl(client: TelegramClient): Promise<string | null> {
  try {
    const buf = (await client.downloadProfilePhoto("me", { isBig: false })) as Buffer | undefined;
    if (!buf || buf.length === 0) return null;
    return `data:image/jpeg;base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

export function userDisplayName(u: { firstName?: string | null; lastName?: string | null; username?: string | null }) {
  const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  if (name) return name;
  if (u.username) return `@${u.username}`;
  return "Telegram User";
}

export { Api, TelegramClient, StringSession };
