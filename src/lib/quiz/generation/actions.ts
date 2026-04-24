"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { requireCurrentSession } from "@/lib/auth/session";
import {
  copyPublicQuizForUser,
  createQuizDraftForUser,
  getPublicQuizRecord,
  getQuizRecordForUser,
  retryQuizGenerationForUser,
  updateQuizContentForUser,
  updateQuizPublicForUser,
  type CopyPublicQuizResult,
  type CreateQuizDraftResult,
  type UpdateQuizPublicResult,
} from "@/lib/quiz/generation/service";

export type { CreateQuizDraftResult } from "@/lib/quiz/generation/service";

export async function getQuizRecordForCurrentUser(quizId: string) {
  const session = await requireCurrentSession();
  return getQuizRecordForUser(quizId, session.user.id);
}

export async function getPublicQuizRecordAction(quizId: string) {
  return getPublicQuizRecord(quizId);
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

export async function updateQuizContentAction(quizId: string, input: unknown) {
  const session = await requireCurrentSession();
  const result = await updateQuizContentForUser(quizId, session.user.id, input);

  if (result.success) {
    revalidatePath(`/quiz/${quizId}`);
    revalidatePath(`/quiz/${quizId}/edit`);
    revalidatePath("/dashboard");
  }

  return result;
}

export async function updateQuizPublicAction(
  quizId: string,
  isPublic: boolean,
): Promise<UpdateQuizPublicResult> {
  const session = await requireCurrentSession();
  const result = await updateQuizPublicForUser(
    quizId,
    session.user.id,
    isPublic,
  );

  if (result.success) {
    revalidatePath(`/quiz/${quizId}`);
  }

  return result;
}

export async function copyPublicQuizAction(
  quizId: string,
): Promise<CopyPublicQuizResult> {
  const session = await requireCurrentSession();
  const result = await copyPublicQuizForUser(quizId, session.user.id);

  if (result.success) {
    revalidatePath("/dashboard");
  }

  return result;
}
