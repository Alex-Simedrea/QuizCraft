import { notFound } from "next/navigation";

import { getQuizRecordForCurrentUser } from "@/lib/quiz/generation/actions";
import { QuizWorkspace } from "@/components/quiz/workspace/view";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = await params;
  const quiz = await getQuizRecordForCurrentUser(quizId);

  if (!quiz) {
    notFound();
  }

  return <QuizWorkspace initialQuiz={quiz} />;
}
