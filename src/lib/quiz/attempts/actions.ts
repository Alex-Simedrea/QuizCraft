"use server";

import {
  getLatestQuizAttemptForUser,
  getQuizAttemptForUser,
  getQuizAttemptsForUser,
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

export async function submitQuizAttemptAction(quizId: string, input: unknown) {
  return submitQuizAttemptForUser(quizId, input, await getActionUserId());
}
