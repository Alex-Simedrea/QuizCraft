import { notFound } from "next/navigation";

import { QuizSolvingView } from "@/components/quiz/solve/view";
import { getCurrentSession } from "@/lib/auth/session";
import {
  getGuestQuizAttemptAction,
  getQuizAttemptAction,
} from "@/lib/quiz/attempts/actions";

export default async function SharedQuizAttemptPage({
  params,
}: {
  params: Promise<{ attemptId: string; quizId: string }>;
}) {
  const { attemptId, quizId } = await params;
  const session = await getCurrentSession();
  const accountAttempt = session
    ? await getQuizAttemptAction(quizId, attemptId)
    : null;
  const attempt =
    accountAttempt ?? (await getGuestQuizAttemptAction(quizId, attemptId));

  if (!attempt) {
    notFound();
  }

  return (
    <QuizSolvingView
      initialAttempt={attempt}
      quizId={quizId}
      sections={attempt.quizSections}
      title={attempt.quizTitle}
    />
  );
}
