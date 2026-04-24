import { notFound, redirect } from "next/navigation";

import { QuizEditWorkspace } from "@/components/quiz/edit/workspace";
import { getQuizRecordForCurrentUser } from "@/lib/quiz/generation/actions";

export default async function QuizEditPage({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = await params;
  const quiz = await getQuizRecordForCurrentUser(quizId);

  if (!quiz) {
    notFound();
  }

  if (quiz.status !== "ready") {
    redirect(`/quiz/${quiz.id}`);
  }

  return <QuizEditWorkspace initialQuiz={quiz} />;
}
