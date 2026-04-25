"use server";

import { cookies } from "next/headers";

import { getCurrentSession } from "@/lib/auth/session";
import {
  getGuestAttemptCookieName,
  getGuestQuizAttempt,
  getLatestQuizAttemptForUser,
  getQuizAttemptDashboardForUser,
  getQuizAttemptForUser,
  getQuizAttemptsForUser,
  getQuizAttemptsMadeByUser,
  submitGuestQuizAttempt,
  submitPublicQuizAttemptForUser,
  submitQuizAttemptForUser,
} from "@/lib/quiz/attempts/service";

async function getActionUserId() {
  const { requireCurrentSession } = await import("@/lib/auth/session");
  const session = await requireCurrentSession();
  return session.user.id;
}

export async function getLatestQuizAttemptAction(quizId: string) {
  return getLatestQuizAttemptForUser(quizId, await getActionUserId());
}

export async function getQuizAttemptsAction(quizId: string) {
  return getQuizAttemptsForUser(quizId, await getActionUserId());
}

export async function getQuizAttemptAction(quizId: string, attemptId: string) {
  return getQuizAttemptForUser(quizId, attemptId, await getActionUserId());
}

export async function getMyExternalQuizAttemptsAction() {
  return getQuizAttemptsMadeByUser(await getActionUserId());
}

export async function getQuizAttemptDashboardAction() {
  return getQuizAttemptDashboardForUser(await getActionUserId());
}

export async function submitQuizAttemptAction(quizId: string, input: unknown) {
  return submitQuizAttemptForUser(quizId, input, await getActionUserId());
}

export async function submitPublicQuizAttemptAction(
  quizId: string,
  input: unknown,
) {
  const session = await getCurrentSession();

  if (!session) {
    return {
      message: "Log in to submit this quiz from your account.",
      success: false as const,
    };
  }

  return submitPublicQuizAttemptForUser(quizId, input, session.user.id);
}

export async function submitGuestQuizAttemptAction(
  quizId: string,
  input: unknown,
) {
  const result = await submitGuestQuizAttempt(quizId, input);

  if (result.success) {
    const cookieStore = await cookies();
    cookieStore.set(
      getGuestAttemptCookieName(result.attemptId),
      result.accessToken,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: `/share/${quizId}/attempts/${result.attemptId}`,
        priority: "high",
      },
    );
  }

  return {
    attemptId: result.success ? result.attemptId : undefined,
    message: result.success ? undefined : result.message,
    success: result.success,
  };
}

export async function getGuestQuizAttemptAction(
  quizId: string,
  attemptId: string,
) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(
    getGuestAttemptCookieName(attemptId),
  )?.value;

  if (!accessToken) {
    return null;
  }

  return getGuestQuizAttempt(quizId, attemptId, accessToken);
}
