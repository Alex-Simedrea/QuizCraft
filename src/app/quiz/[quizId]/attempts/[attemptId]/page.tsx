import { notFound } from "next/navigation";

import { QuizSolvingView } from "@/components/quiz/solve/view";
import { getQuizAttemptAction } from "@/lib/quiz/attempts/actions";

export default async function QuizAttemptPage({
  params,
}: {
  params: Promise<{ attemptId: string; quizId: string }>;
}) {
  const { attemptId, quizId } = await params;
  const attempt = await getQuizAttemptAction(quizId, attemptId);

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
