import { Loader2, Sparkles } from "lucide-react";

import type { QuizAttemptRecord } from "@/lib/quiz/preview";
import { cn } from "@/lib/utils";

function SuggestionsPanel({
  attempt,
  scoreFinal,
}: {
  attempt: QuizAttemptRecord;
  scoreFinal: boolean;
}) {
  if (attempt.status === "failed") {
    return (
      <div className="text-sm text-destructive">
        {attempt.errorMessage ?? "The attempt could not be graded."}
      </div>
    );
  }

  const showLoading = attempt.status === "grading";
  const tips = attempt.tips ?? [];
  const showTips = attempt.status === "completed" && tips.length > 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {showLoading ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : (
            <Sparkles className="size-4 text-muted-foreground" />
          )}
          <div className="text-sm font-medium">What to improve</div>
        </div>
        {showLoading ? (
          <div className="text-muted-foreground text-xs">
            {scoreFinal ? "Suggestions loading" : "Score is not final"}
          </div>
        ) : null}
      </div>

      {showTips ? (
        <ul className="grid gap-2 text-sm">
          {tips.map((tip, index) => (
            <li className="flex gap-2" key={`${tip}-${index}`}>
              <span className="text-muted-foreground">{index + 1}.</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      ) : showLoading ? (
        <p className="text-muted-foreground text-sm animate-pulse">
          The AI is preparing personalized suggestions for what to review next.
        </p>
      ) : (
        <p className="text-muted-foreground text-sm">
          Suggestions will appear here after grading completes.
        </p>
      )}
    </div>
  );
}

export function AttemptSummary({
  attempt,
  scoreFinal,
}: {
  attempt: QuizAttemptRecord;
  scoreFinal: boolean;
}) {
  const percentage =
    attempt.maxPoints === 0
      ? 0
      : Math.round((attempt.earnedPoints / attempt.maxPoints) * 100);

  return (
    <section className="bg-secondary rounded-4xl flex flex-col gap-3 p-3">
      <div className="bg-background flex flex-col gap-2 rounded-2xl px-5 py-4">
        <div className="text-lg font-medium flex items-center gap-2">
          {attempt.status === "grading" && (
            <Loader2 className="animate-spin size-4" />
          )}
          Attempt Score
        </div>
        <div
          className={cn("text-3xl font-semibold", {
            "animate-pulse": attempt.status === "grading",
          })}
        >
          {percentage}%
        </div>
        <div className="flex justify-between">
          <p
            className={cn("text-muted-foreground text-sm", {
              "animate-pulse": attempt.status === "grading",
            })}
          >
            {attempt.status === "failed"
              ? "Grading failed"
              : scoreFinal
                ? `${attempt.earnedPoints}/${attempt.maxPoints} points`
                : `${attempt.earnedPoints}/${attempt.maxPoints} points so far`}
          </p>
          <p className="text-muted-foreground text-sm">
            Submitted {new Date(attempt.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-background flex flex-col gap-2 rounded-2xl px-5 py-4">
        <SuggestionsPanel attempt={attempt} scoreFinal={scoreFinal} />
      </div>
    </section>
  );
}
