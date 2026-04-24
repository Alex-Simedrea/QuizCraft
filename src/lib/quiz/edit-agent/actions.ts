"use server";

import "server-only";

import { revalidatePath } from "next/cache";

import { requireCurrentSession } from "@/lib/auth/session";
import {
  clearQuizEditAgentHistoryForUser,
  getQuizEditAgentMessagesForUser,
  getQuizEditAgentStateForUser,
  sendQuizEditAgentMessageForUser,
  undoQuizEditAgentTurnForUser,
} from "./server";

function revalidateQuizEditPaths(quizId: string) {
  revalidatePath(`/quiz/${quizId}`);
  revalidatePath(`/quiz/${quizId}/edit`);
  revalidatePath("/dashboard");
}

export async function getQuizEditAgentMessagesAction(quizId: string) {
  const session = await requireCurrentSession();
  return getQuizEditAgentMessagesForUser(quizId, session.user.id);
}

export async function getQuizEditAgentStateAction(
  quizId: string,
  input?: unknown,
) {
  const session = await requireCurrentSession();
  return getQuizEditAgentStateForUser(quizId, session.user.id, input);
}

export async function clearQuizEditAgentHistoryAction(
  quizId: string,
  input?: unknown,
) {
  const session = await requireCurrentSession();
  return clearQuizEditAgentHistoryForUser(quizId, session.user.id, input);
}

export async function sendQuizEditAgentMessageAction(
  quizId: string,
  input: unknown,
) {
  const session = await requireCurrentSession();
  const result = await sendQuizEditAgentMessageForUser(
    quizId,
    session.user.id,
    input,
  );

  if (result.success) {
    revalidateQuizEditPaths(quizId);
  }

  return result;
}

export async function undoQuizEditAgentTurnAction(
  quizId: string,
  input: unknown,
) {
  const session = await requireCurrentSession();
  const result = await undoQuizEditAgentTurnForUser(
    quizId,
    session.user.id,
    input,
  );

  if (result.success) {
    revalidateQuizEditPaths(quizId);
  }

  return result;
}
