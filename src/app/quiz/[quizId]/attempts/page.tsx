import { AttemptsDashboard } from "@/components/quiz/attempts/attempts-dashboard";
import { QuizAttemptsHeader } from "@/components/quiz/attempts/header";
import { getQuizAttemptsAction } from "@/lib/quiz/attempts/actions";

export default async function QuizAttemptsPage({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = await params;
  const attempts = await getQuizAttemptsAction(quizId);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-6 pt-20 md:p-8 md:pt-20 lg:p-10 lg:pt-20">
      <QuizAttemptsHeader />
      <AttemptsDashboard attempts={attempts} showQuizMetrics={false} />
    </div>
  );
}
