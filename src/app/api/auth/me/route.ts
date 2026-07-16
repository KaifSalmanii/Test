import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { userDisplayName } from "@/lib/telegram";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null });

  await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, user.id));

  return NextResponse.json({
    user: {
      id: user.id,
      name: userDisplayName(user),
      username: user.username,
      phone: user.phone,
      photoDataUrl: user.photoDataUrl,
      isAdmin: user.isAdmin,
      createdAt: user.createdAt,
    },
  });
}
