import "server-only";

import { and, eq, gt } from "drizzle-orm";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { SESSION_COOKIE_NAME, SESSION_DURATION_MS } from "@/lib/auth/constants";
import { signSessionToken, verifySessionToken } from "@/lib/auth/token";

function getSessionExpiryDate() {
  return new Date(Date.now() + SESSION_DURATION_MS);
}

async function setSessionCookie(value: string, expiresAt: Date) {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    priority: "high",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
    priority: "high",
  });
}

export async function createUserSession(userId: string) {
  const expiresAt = getSessionExpiryDate();

  const [session] = await db
    .insert(sessions)
    .values({
      userId,
      expiresAt,
    })
    .returning({
      id: sessions.id,
    });

  if (!session) {
    throw new Error("Failed to create session.");
  }

  const token = await signSessionToken({
    sessionId: session.id,
    userId,
    expiresAt: expiresAt.toISOString(),
  });

  await setSessionCookie(token, expiresAt);
}

export async function invalidateSession(sessionId?: string | null) {
  if (sessionId) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  }

  await clearSessionCookie();
}

export const getCurrentSession = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = await verifySessionToken(token);

  if (!payload) {
    return null;
  }

  const [record] = await db
    .select({
      sessionId: sessions.id,
      sessionExpiresAt: sessions.expiresAt,
      userId: users.id,
      userFirstName: users.firstName,
      userLastName: users.lastName,
      userName: users.name,
      userEmail: users.email,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(eq(sessions.id, payload.sessionId), gt(sessions.expiresAt, new Date())),
    )
    .limit(1);

  if (!record) {
    return null;
  }

  return {
    sessionId: record.sessionId,
    expiresAt: record.sessionExpiresAt,
    user: {
      id: record.userId,
      firstName: record.userFirstName,
      lastName: record.userLastName,
      name: record.userName,
      email: record.userEmail,
    },
  };
});

export async function requireCurrentSession() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}
