import "server-only";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appSessions, telegramAccounts } from "@/db/schema";
import { randomToken } from "@/lib/crypto";

export const COOKIE_NAME = "unlimtd_session";
const SESSION_DAYS = 30;

export class AuthError extends Error {
  constructor() {
    super("Not authenticated");
    this.name = "AuthError";
  }
}

export async function createSession(accountId: string) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400 * 1000);
  await db.insert(appSessions).values({ token, accountId, expiresAt });

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return token;
}

export async function getCurrentAccount() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const sessionRows = await db
    .select()
    .from(appSessions)
    .where(eq(appSessions.token, token))
    .limit(1);
  const session = sessionRows[0];
  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await db.delete(appSessions).where(eq(appSessions.token, token));
    return null;
  }

  const accountRows = await db
    .select()
    .from(telegramAccounts)
    .where(eq(telegramAccounts.id, session.accountId))
    .limit(1);

  return accountRows[0] ?? null;
}

export async function requireAccount() {
  const account = await getCurrentAccount();
  if (!account) throw new AuthError();
  return account;
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (token) {
    await db.delete(appSessions).where(eq(appSessions.token, token));
  }
  store.delete(COOKIE_NAME);
}

export function publicAccount(account: typeof telegramAccounts.$inferSelect) {
  return {
    id: account.id,
    firstName: account.firstName,
    lastName: account.lastName,
    username: account.username,
    phone: account.phone,
  };
}
