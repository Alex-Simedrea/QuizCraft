import { notFound } from "next/navigation";

import { SharedQuizView } from "@/components/quiz/share/view";
import { getCurrentSession } from "@/lib/auth/session";
import { getPublicQuizRecord } from "@/lib/quiz/generation/service";

export default async function SharedQuizPage({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = await params;
  const [quiz, session] = await Promise.all([
    getPublicQuizRecord(quizId),
    getCurrentSession(),
  ]);

  if (!quiz) {
    notFound();
  }

  return <SharedQuizView isAuthenticated={Boolean(session)} quiz={quiz} />;
}
