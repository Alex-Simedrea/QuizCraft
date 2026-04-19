import "server-only";

import { compare, hash } from "bcryptjs";

import { getAuthEnv } from "@/lib/env";

export async function hashPassword(password: string) {
  return await hash(password, getAuthEnv().BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return await compare(password, passwordHash);
}
