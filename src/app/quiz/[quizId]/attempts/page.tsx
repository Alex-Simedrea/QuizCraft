import Link from "next/link";

import { QuizAttemptsHeader } from "@/components/quiz/attempts/header";
import { Button } from "@/components/ui/button";
import { Surface, SurfaceInset } from "@/components/ui/surface";
import { getQuizAttemptsAction } from "@/lib/quiz/attempts/actions";
import type { QuizAttemptRecord } from "@/lib/quiz/preview";

function hasPendingTextReview(attempt: QuizAttemptRecord) {
  return attempt.results.some(
    (result) =>
      (result.type === "short-text" || result.type === "long-text") &&
      result.feedback === "Waiting for model review.",
  );
}

export default async function QuizAttemptsPage({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { quizId } = await params;
  const attempts = await getQuizAttemptsAction(quizId);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-6 pt-20 md:p-8 md:pt-20 lg:p-10 lg:pt-20">
      <QuizAttemptsHeader />
      {attempts.length === 0 ? (
        <Surface>
          <SurfaceInset>
            <p className="text-sm text-muted-foreground">No attempts yet.</p>
          </SurfaceInset>
        </Surface>
      ) : (
        <Surface className="flex flex-col gap-3">
          {attempts.map((attempt) => {
            const percentage =
              attempt.maxPoints === 0
                ? 0
                : Math.round((attempt.earnedPoints / attempt.maxPoints) * 100);
            const pendingTextReview = hasPendingTextReview(attempt);
            const attemptHref = `/quiz/${quizId}/attempts/${attempt.id}`;

            return (
              <Button
                asChild
                className="h-auto w-full justify-start rounded-2xl bg-background p-3 text-left whitespace-normal"
                key={attempt.id}
                variant="secondary"
              >
                <Link href={attemptHref}>
                  <div className="flex min-w-0 flex-col gap-1">
                    <h2 className="truncate text-base font-medium">
                      {attempt.quizTitle}
                    </h2>
                    <div className="text-sm text-muted-foreground">
                      {attempt.takerName}
                      {attempt.takerType === "guest" ? " (guest)" : ""}
                      {" · "}
                      {attempt.status === "completed" ||
                      (attempt.status === "grading" && !pendingTextReview)
                        ? `${percentage}% · ${attempt.earnedPoints}/${attempt.maxPoints} points`
                        : attempt.status === "failed"
                          ? "Grading failed"
                          : "Grading"}
                      {" · "}
                      {new Date(attempt.createdAt).toLocaleString()}
                    </div>
                  </div>
                </Link>
              </Button>
            );
          })}
        </Surface>
      )}
    </div>
  );
}
