import { notFound, redirect } from "next/navigation";

import { QuizSolvingView } from "@/components/quiz/solve/view";
import { getQuizRecordForCurrentUser } from "@/lib/quiz/generation/actions";

export default async function QuizSolvePage({
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

  return (
    <QuizSolvingView
      initialAttempt={null}
      quizId={quiz.id}
      sections={quiz.generatedSections}
      title={quiz.title}
    />
  );
}
