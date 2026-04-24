import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import type { QuizAttemptQuestionResult } from "@/lib/quiz/preview";
import { cn } from "@/lib/utils";

import { isPendingTextResult } from "@/components/quiz/solve/grading-utils";

export function ResultBadge({
  pending,
  result,
}: {
  pending: boolean;
  result: QuizAttemptQuestionResult;
}) {
  const isPendingText = isPendingTextResult(result, pending);

  return (
    <div
      className={cn(
        "inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
        isPendingText
          ? "border-amber-200 bg-amber-50 text-amber-950"
          : result.correct
            ? "border-emerald-200 bg-emerald-50 text-emerald-950"
            : "border-rose-200 bg-rose-50 text-rose-950",
      )}
    >
      <div className="flex items-center gap-2 font-medium">
        {isPendingText ? (
          <Loader2 className="size-4 animate-spin" />
        ) : result.correct ? (
          <CheckCircle2 className="size-4" />
        ) : (
          <XCircle className="size-4" />
        )}
        <span>
          {isPendingText
            ? "Model review in progress"
            : `${result.earnedPoints}/${result.maxPoints} point${result.maxPoints === 1 ? "" : "s"}`}
        </span>
      </div>
    </div>
  );
}
