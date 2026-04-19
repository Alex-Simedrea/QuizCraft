import { JWTPayload, SignJWT, jwtVerify } from "jose";

import { getAuthEnv } from "@/lib/env";

export type SessionTokenPayload = JWTPayload & {
  sessionId: string;
  userId: string;
  expiresAt: string;
};

function getSessionSecret() {
  return new TextEncoder().encode(getAuthEnv().SESSION_SECRET);
}

export async function signSessionToken(payload: SessionTokenPayload) {
  const secret = getSessionSecret();

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime(new Date(payload.expiresAt))
    .sign(secret);
}

export async function verifySessionToken(token: string) {
  try {
    const secret = getSessionSecret();
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    if (
      typeof payload.sessionId !== "string" ||
      typeof payload.userId !== "string" ||
      typeof payload.expiresAt !== "string"
    ) {
      return null;
    }

    return payload as SessionTokenPayload;
  } catch {
    return null;
  }
}
