import Link from "next/link";

import { MyAttemptsHeader } from "@/components/quiz/attempts/my-attempts-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMyExternalQuizAttemptsAction } from "@/lib/quiz/attempts/actions";
import type { QuizAttemptRecord } from "@/lib/quiz/preview";

function hasPendingTextReview(attempt: QuizAttemptRecord) {
  return attempt.results.some(
    (result) =>
      (result.type === "short-text" || result.type === "long-text") &&
      result.feedback === "Waiting for model review.",
  );
}

export default async function MyAttemptsPage() {
  const attempts = await getMyExternalQuizAttemptsAction();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-6 pt-20 md:p-8 md:pt-20 lg:p-10 lg:pt-20">
      <MyAttemptsHeader />
      {attempts.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No attempts on shared quizzes yet.
          </CardContent>
        </Card>
      ) : (
        attempts.map((attempt) => {
          const percentage =
            attempt.maxPoints === 0
              ? 0
              : Math.round((attempt.earnedPoints / attempt.maxPoints) * 100);
          const pendingTextReview = hasPendingTextReview(attempt);

          return (
            <Card key={attempt.id}>
              <CardHeader>
                <CardTitle>{attempt.quizTitle}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                  {attempt.status === "completed" ||
                  (attempt.status === "grading" && !pendingTextReview)
                    ? `${percentage}% · ${attempt.earnedPoints}/${attempt.maxPoints} points`
                    : attempt.status === "failed"
                      ? "Grading failed"
                      : "Grading"}
                  {" · "}
                  {new Date(attempt.createdAt).toLocaleString()}
                </div>
                <Button asChild variant="secondary">
                  <Link href={`/quiz/${attempt.quizId}/attempts/${attempt.id}`}>
                    View attempt
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
