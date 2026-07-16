import { eq, count } from "drizzle-orm";
import { db } from "@/db";
import { users, activityLogs } from "@/db/schema";
import { encryptText, newId } from "@/lib/crypto";
import { createClient, fetchProfilePhotoDataUrl, userDisplayName, Api, TelegramClient } from "@/lib/telegram";
import { createSessionCookie } from "@/lib/auth";
import { getAdminPhones } from "@/lib/env";

export async function finishLoginWithClient(client: TelegramClient, apiUser: Api.User) {
  const sessionString = client.session.save() as unknown as string;
  const encrypted = encryptText(sessionString);
  const telegramId = apiUser.id.toString();
  const phone = apiUser.phone ? `+${apiUser.phone}` : null;
  const photoDataUrl = await fetchProfilePhotoDataUrl(client);

  const existing = await db.select().from(users).where(eq(users.telegramId, telegramId)).limit(1);
  const [{ value: totalUsers }] = await db.select({ value: count() }).from(users);

  const adminPhones = getAdminPhones();
  const shouldBeAdmin =
    (phone && adminPhones.includes(phone)) || (totalUsers === 0 && existing.length === 0);

  let userId: string;
  if (existing.length > 0) {
    userId = existing[0].id;
    await db
      .update(users)
      .set({
        sessionEncrypted: encrypted,
        phone,
        firstName: apiUser.firstName ?? null,
        lastName: apiUser.lastName ?? null,
        username: apiUser.username ?? null,
        photoDataUrl: photoDataUrl ?? existing[0].photoDataUrl,
        lastLoginAt: new Date(),
        lastSeenAt: new Date(),
        loginCount: existing[0].loginCount + 1,
        isAdmin: existing[0].isAdmin || Boolean(shouldBeAdmin),
      })
      .where(eq(users.id, userId));
  } else {
    userId = newId();
    await db.insert(users).values({
      id: userId,
      telegramId,
      phone,
      firstName: apiUser.firstName ?? null,
      lastName: apiUser.lastName ?? null,
      username: apiUser.username ?? null,
      photoDataUrl,
      sessionEncrypted: encrypted,
      isAdmin: Boolean(shouldBeAdmin),
      loginCount: 1,
    });
  }

  await createSessionCookie(userId);
  await db.insert(activityLogs).values({
    id: newId(),
    userId,
    action: "login",
    meta: { name: userDisplayName(apiUser) },
  });

  return userId;
}

export function buildClientFromSession(sessionString: string) {
  return createClient(sessionString);
}
