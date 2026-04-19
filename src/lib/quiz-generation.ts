"use server";

import "server-only";

import { requireCurrentSession } from "@/lib/auth/session";
import {
  createQuizDraftForUser,
  getQuizRecordForUser,
  retryQuizGenerationForUser,
  type CreateQuizDraftResult,
} from "@/lib/quiz-generation-service";

export type { CreateQuizDraftResult } from "@/lib/quiz-generation-service";

export async function getQuizRecordForCurrentUser(quizId: string) {
  const session = await requireCurrentSession();
  return getQuizRecordForUser(quizId, session.user.id);
}

export async function createQuizDraftAction(
  formData: FormData,
): Promise<CreateQuizDraftResult> {
  const session = await requireCurrentSession();
  return createQuizDraftForUser(session.user.id, formData);
}

export async function retryQuizGenerationAction(quizId: string) {
  const session = await requireCurrentSession();
  return retryQuizGenerationForUser(quizId, session.user.id);
}
