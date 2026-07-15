import "server-only";
import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { computeCheck } from "telegram/Password";
import { CustomFile } from "telegram/client/uploads";
import bigInt from "big-integer";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { telegramAccounts } from "@/db/schema";
import { decryptSecret, encryptSecret, randomToken } from "@/lib/crypto";

export type TelegramAccountRow = typeof telegramAccounts.$inferSelect;

export function getApiCredentials(): { apiId: number; apiHash: string } | null {
  const apiId = Number(process.env.TELEGRAM_API_ID || "");
  const apiHash = process.env.TELEGRAM_API_HASH || "";
  if (!apiId || !apiHash) return null;
  return { apiId, apiHash };
}

export function isTelegramConfigured(): boolean {
  return getApiCredentials() !== null;
}

// ---------------------------------------------------------------------------
// In-memory state (persists for the lifetime of the Node process).
// ---------------------------------------------------------------------------

type PendingPhoneLogin = {
  client: TelegramClient;
  phone: string;
  phoneCodeHash: string;
  createdAt: number;
};

type PendingQrLogin = {
  client: TelegramClient;
  token: string;
  expires: number;
  scanned: boolean;
  status: "pending" | "success" | "error" | "expired";
  account?: TelegramAccountRow;
  message?: string;
  createdAt: number;
};

const globalForTelegram = globalThis as typeof globalThis & {
  __unlimtdPendingPhone?: Map<string, PendingPhoneLogin>;
  __unlimtdPendingQr?: Map<string, PendingQrLogin>;
  __unlimtdAccountClients?: Map<string, TelegramClient>;
};

const pendingPhoneLogins =
  globalForTelegram.__unlimtdPendingPhone ?? new Map<string, PendingPhoneLogin>();
globalForTelegram.__unlimtdPendingPhone = pendingPhoneLogins;

const pendingQrLogins = globalForTelegram.__unlimtdPendingQr ?? new Map<string, PendingQrLogin>();
globalForTelegram.__unlimtdPendingQr = pendingQrLogins;

const accountClients =
  globalForTelegram.__unlimtdAccountClients ?? new Map<string, TelegramClient>();
globalForTelegram.__unlimtdAccountClients = accountClients;

function newBareClient(): TelegramClient {
  const creds = getApiCredentials();
  if (!creds) {
    throw new Error(
      "Telegram API credentials are not configured. Set TELEGRAM_API_ID and TELEGRAM_API_HASH."
    );
  }
  return new TelegramClient(new StringSession(""), creds.apiId, creds.apiHash, {
    connectionRetries: 3,
    useWSS: false,
  });
}

async function upsertAccount(client: TelegramClient): Promise<TelegramAccountRow> {
  const me = (await client.getMe()) as Api.User;
  const sessionString = client.session.save() as unknown as string;
  const telegramUserId = String(me.id);

  const existing = await db
    .select()
    .from(telegramAccounts)
    .where(eq(telegramAccounts.telegramUserId, telegramUserId))
    .limit(1);

  const values = {
    telegramUserId,
    phone: me.phone ?? null,
    firstName: me.firstName ?? null,
    lastName: me.lastName ?? null,
    username: me.username ?? null,
    sessionString: encryptSecret(sessionString),
    updatedAt: new Date(),
  };

  if (existing[0]) {
    const [row] = await db
      .update(telegramAccounts)
      .set(values)
      .where(eq(telegramAccounts.id, existing[0].id))
      .returning();
    accountClients.set(row.id, client);
    return row;
  }

  const [row] = await db.insert(telegramAccounts).values(values).returning();
  accountClients.set(row.id, client);
  return row;
}

// ---------------------------------------------------------------------------
// Phone number login flow
// ---------------------------------------------------------------------------

export async function startPhoneLogin(phone: string) {
  const creds = getApiCredentials();
  if (!creds) throw new Error("TELEGRAM_NOT_CONFIGURED");

  const client = newBareClient();
  await client.connect();

  const result = await client.invoke(
    new Api.auth.SendCode({
      phoneNumber: phone,
      apiId: creds.apiId,
      apiHash: creds.apiHash,
      settings: new Api.CodeSettings({ allowAppHash: true }),
    })
  );

  if (!(result instanceof Api.auth.SentCode)) {
    throw new Error("Unexpected response while requesting the login code.");
  }

  const authId = randomToken(16);
  pendingPhoneLogins.set(authId, {
    client,
    phone,
    phoneCodeHash: result.phoneCodeHash,
    createdAt: Date.now(),
  });

  return { authId };
}

export async function verifyPhoneCode(authId: string, code: string) {
  const pending = pendingPhoneLogins.get(authId);
  if (!pending) throw new Error("LOGIN_EXPIRED");

  try {
    await pending.client.invoke(
      new Api.auth.SignIn({
        phoneNumber: pending.phone,
        phoneCodeHash: pending.phoneCodeHash,
        phoneCode: code,
      })
    );
    const account = await upsertAccount(pending.client);
    pendingPhoneLogins.delete(authId);
    return { status: "success" as const, account };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("SESSION_PASSWORD_NEEDED")) {
      return { status: "password_required" as const };
    }
    pendingPhoneLogins.delete(authId);
    throw err;
  }
}

export async function verifyPhonePassword(authId: string, password: string) {
  const pending = pendingPhoneLogins.get(authId);
  if (!pending) throw new Error("LOGIN_EXPIRED");

  const passwordInfo = await pending.client.invoke(new Api.account.GetPassword());
  const check = await computeCheck(passwordInfo, password);
  await pending.client.invoke(new Api.auth.CheckPassword({ password: check }));
  const account = await upsertAccount(pending.client);
  pendingPhoneLogins.delete(authId);
  return { status: "success" as const, account };
}

// ---------------------------------------------------------------------------
// QR code login flow
// ---------------------------------------------------------------------------

export async function startQrLogin() {
  const creds = getApiCredentials();
  if (!creds) throw new Error("TELEGRAM_NOT_CONFIGURED");

  const client = newBareClient();
  await client.connect();

  client.addEventHandler((update: Api.TypeUpdate) => {
    if (update instanceof Api.UpdateLoginToken) {
      const entry = [...pendingQrLogins.values()].find((v) => v.client === client);
      if (entry) entry.scanned = true;
    }
  });

  const qrId = randomToken(16);
  const loginToken = await exportLoginToken(client, creds);

  pendingQrLogins.set(qrId, {
    client,
    token: loginToken.token.toString("base64url"),
    expires: loginToken.expires,
    scanned: false,
    status: "pending",
    createdAt: Date.now(),
  });

  return { qrId, token: loginToken.token.toString("base64url"), expires: loginToken.expires };
}

async function exportLoginToken(client: TelegramClient, creds: { apiId: number; apiHash: string }) {
  const result = await client.invoke(
    new Api.auth.ExportLoginToken({ apiId: creds.apiId, apiHash: creds.apiHash, exceptIds: [] })
  );
  if (result instanceof Api.auth.LoginToken) {
    return { token: result.token, expires: result.expires };
  }
  throw result;
}

export async function pollQrLogin(qrId: string) {
  const pending = pendingQrLogins.get(qrId);
  if (!pending) return { status: "expired" as const };
  if (pending.status === "success" && pending.account) {
    return { status: "success" as const, account: pending.account };
  }
  if (pending.status === "error") {
    return { status: "error" as const, message: pending.message || "Login failed" };
  }
  if (pending.status === "expired") {
    return { status: "expired" as const };
  }

  const creds = getApiCredentials();
  if (!creds) return { status: "error" as const, message: "Telegram not configured" };

  if (!pending.scanned) {
    if (Date.now() > pending.createdAt + pending.expires * 1000) {
      try {
        const fresh = await exportLoginToken(pending.client, creds);
        pending.token = fresh.token.toString("base64url");
        pending.expires = fresh.expires;
        pending.createdAt = Date.now();
      } catch {
        pending.status = "expired";
      }
    }
    return { status: "pending" as const, token: pending.token, expires: pending.expires };
  }

  try {
    const result = await pending.client.invoke(
      new Api.auth.ExportLoginToken({ apiId: creds.apiId, apiHash: creds.apiHash, exceptIds: [] })
    );

    if (result instanceof Api.auth.LoginTokenSuccess) {
      const account = await upsertAccount(pending.client);
      pending.status = "success";
      pending.account = account;
      return { status: "success" as const, account };
    }

    if (result instanceof Api.auth.LoginTokenMigrateTo) {
      await pending.client._switchDC(result.dcId);
      const imported = await pending.client.invoke(
        new Api.auth.ImportLoginToken({ token: result.token })
      );
      if (imported instanceof Api.auth.LoginTokenSuccess) {
        const account = await upsertAccount(pending.client);
        pending.status = "success";
        pending.account = account;
        return { status: "success" as const, account };
      }
    }

    if (result instanceof Api.auth.LoginToken) {
      pending.token = result.token.toString("base64url");
      pending.expires = result.expires;
      pending.createdAt = Date.now();
      pending.scanned = false;
    }

    return { status: "pending" as const, token: pending.token, expires: pending.expires };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("SESSION_PASSWORD_NEEDED")) {
      return { status: "password_required" as const, qrId };
    }
    pending.status = "error";
    pending.message = msg;
    return { status: "error" as const, message: msg };
  }
}

export async function verifyQrPassword(qrId: string, password: string) {
  const pending = pendingQrLogins.get(qrId);
  if (!pending) throw new Error("LOGIN_EXPIRED");

  const passwordInfo = await pending.client.invoke(new Api.account.GetPassword());
  const check = await computeCheck(passwordInfo, password);
  await pending.client.invoke(new Api.auth.CheckPassword({ password: check }));
  const account = await upsertAccount(pending.client);
  pending.status = "success";
  pending.account = account;
  return { status: "success" as const, account };
}

// ---------------------------------------------------------------------------
// Account client pool (used once logged in)
// ---------------------------------------------------------------------------

export async function getClientForAccount(account: TelegramAccountRow): Promise<TelegramClient> {
  const cached = accountClients.get(account.id);
  if (cached && cached.connected) return cached;

  const creds = getApiCredentials();
  if (!creds) throw new Error("TELEGRAM_NOT_CONFIGURED");

  const sessionString = decryptSecret(account.sessionString);
  const client = new TelegramClient(new StringSession(sessionString), creds.apiId, creds.apiHash, {
    connectionRetries: 5,
    useWSS: false,
  });
  await client.connect();
  accountClients.set(account.id, client);
  return client;
}

// ---------------------------------------------------------------------------
// Storage helpers: everything is stored in the account's own Saved Messages.
// ---------------------------------------------------------------------------

const SAVED = "me";

export async function uploadBufferToTelegram(
  account: TelegramAccountRow,
  params: { buffer: Buffer; name: string; mimeType: string }
) {
  const client = await getClientForAccount(account);
  const file = new CustomFile(params.name, params.buffer.length, "", params.buffer);

  const message = await client.sendFile(SAVED, {
    file,
    forceDocument: true,
    workers: 8,
    attributes: [new Api.DocumentAttributeFilename({ fileName: params.name })],
  });

  return { messageId: message.id, size: params.buffer.length };
}

export async function getTelegramMessage(account: TelegramAccountRow, messageId: number) {
  const client = await getClientForAccount(account);
  const messages = await client.getMessages(SAVED, { ids: [messageId] });
  const message = messages[0];
  if (!message || !message.media) throw new Error("FILE_NOT_FOUND_ON_TELEGRAM");
  return message;
}

export async function deleteTelegramMessages(account: TelegramAccountRow, messageIds: number[]) {
  if (messageIds.length === 0) return;
  try {
    const client = await getClientForAccount(account);
    await client.deleteMessages(SAVED, messageIds, { revoke: true });
  } catch {
    // best-effort cleanup; ignore if telegram is unreachable
  }
}

const CHUNK = 512 * 1024;

export async function downloadTelegramRange(
  account: TelegramAccountRow,
  messageId: number,
  totalSize: number,
  start = 0,
  end?: number
) {
  const client = await getClientForAccount(account);
  const message = await getTelegramMessage(account, messageId);

  const rangeEnd = Math.min(end ?? totalSize - 1, totalSize - 1);
  const alignedStart = Math.floor(start / CHUNK) * CHUNK;
  const chunksNeeded = Math.max(1, Math.ceil((rangeEnd - alignedStart + 1) / CHUNK));

  const parts: Buffer[] = [];
  const iterator = client.iterDownload({
    file: message.media as unknown as Api.TypeMessageMedia,
    offset: bigInt(alignedStart),
    limit: chunksNeeded,
    requestSize: CHUNK,
    fileSize: bigInt(totalSize),
  });

  for await (const chunk of iterator) {
    parts.push(chunk as Buffer);
  }

  const combined = Buffer.concat(parts);
  const sliceStart = start - alignedStart;
  const sliceEnd = sliceStart + (rangeEnd - start) + 1;
  const buffer = combined.subarray(sliceStart, sliceEnd);

  return { buffer, start, end: rangeEnd, total: totalSize };
}
