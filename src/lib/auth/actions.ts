"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { users } from "@/db/schema";
import type { AuthApiResponse } from "@/lib/auth/contracts";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  createUserSession,
  getCurrentSession,
  invalidateSession,
} from "@/lib/auth/session";
import {
  loginFormSchema,
  profileFormSchema,
  registerRequestSchema,
  type LoginFormValues,
  type ProfileFormValues,
  type RegisterRequestValues,
} from "@/lib/validation/auth";

async function findUserByEmail(email: string) {
  return db.query.users.findFirst({
    where: eq(users.email, email),
  });
}

function normalizeRedirectTarget(nextValue?: string) {
  if (typeof nextValue !== "string") {
    return "/dashboard";
  }

  if (!nextValue.startsWith("/") || nextValue.startsWith("//")) {
    return "/dashboard";
  }

  return nextValue;
}

export async function loginAction(
  input: LoginFormValues & {
    next?: string;
  },
): Promise<AuthApiResponse> {
  const parsedCredentials = loginFormSchema.safeParse(input);

  if (!parsedCredentials.success) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: parsedCredentials.error.flatten().fieldErrors,
    };
  }

  const user = await findUserByEmail(parsedCredentials.data.email);

  if (!user) {
    return {
      success: false,
      message: "Invalid email or password.",
    };
  }

  const isPasswordValid = await verifyPassword(
    parsedCredentials.data.password,
    user.passwordHash,
  );

  if (!isPasswordValid) {
    return {
      success: false,
      message: "Invalid email or password.",
    };
  }

  await createUserSession(user.id);

  return {
    success: true,
    redirectTo: normalizeRedirectTarget(input.next),
  };
}

export async function registerAction(
  input: RegisterRequestValues,
): Promise<AuthApiResponse> {
  const parsed = registerRequestSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const existingUser = await findUserByEmail(parsed.data.email);

  if (existingUser) {
    return {
      success: false,
      message: "An account with this email already exists.",
      fieldErrors: {
        email: ["An account with this email already exists."],
      },
    };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const [createdUser] = await db
    .insert(users)
    .values({
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      name: `${parsed.data.firstName} ${parsed.data.lastName}`,
      email: parsed.data.email,
      passwordHash,
    })
    .returning({
      id: users.id,
    });

  if (!createdUser) {
    throw new Error("User creation failed.");
  }

  try {
    await createUserSession(createdUser.id);
  } catch (error) {
    await db.delete(users).where(eq(users.id, createdUser.id));
    console.error("Failed to finalize registration session", error);

    return {
      success: false,
      message: "Something went wrong while creating your account.",
    };
  }

  return {
    success: true,
    redirectTo: "/dashboard",
  };
}

export async function updateProfileAction(
  input: ProfileFormValues,
): Promise<AuthApiResponse> {
  const session = await getCurrentSession();

  if (!session) {
    return {
      success: false,
      message: "You need to sign in again before updating your profile.",
    };
  }

  const parsed = profileFormSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const existingUser = await db.query.users.findFirst({
    where: and(
      eq(users.email, parsed.data.email),
      ne(users.id, session.user.id),
    ),
  });

  if (existingUser) {
    return {
      success: false,
      message: "An account with this email already exists.",
      fieldErrors: {
        email: ["An account with this email already exists."],
      },
    };
  }

  await db
    .update(users)
    .set({
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      name: `${parsed.data.firstName} ${parsed.data.lastName}`,
      email: parsed.data.email,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id));

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/profile");

  return {
    success: true,
    redirectTo: "/dashboard/profile",
  };
}

export async function logoutAction() {
  const session = await getCurrentSession();
  await invalidateSession(session?.sessionId);
}
