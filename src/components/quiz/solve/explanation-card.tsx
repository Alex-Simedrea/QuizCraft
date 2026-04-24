import type { QuizAttemptQuestionResult, QuizQuestion } from "@/lib/quiz/preview";

export function ExplanationCard({
  pending,
  question,
  result,
}: {
  pending: boolean;
  question: QuizQuestion;
  result: QuizAttemptQuestionResult;
}) {
  const canShowModelFeedback =
    question.type === "short-text" || question.type === "long-text";

  return (
    <div className="border-border bg-secondary/50 grid gap-2 rounded-2xl border px-4 py-3 text-sm">
      <div className="font-medium">Explanation</div>
      <p className="text-muted-foreground">{question.explanation}</p>
      {question.type === "short-text" ? (
        <p className="text-muted-foreground">
          Accepted answer: {question.acceptableAnswers.join(", ")}
        </p>
      ) : null}
      {question.type === "long-text" ? (
        <div className="grid gap-1 text-muted-foreground">
          <p>Sample answer: {question.sampleAnswer}</p>
          <p>Rubric: {question.rubricPoints.join(" · ")}</p>
        </div>
      ) : null}
      {!pending &&
      canShowModelFeedback &&
      result.feedback.trim().length > 0 &&
      result.feedback.trim() !== question.explanation.trim() ? (
        <p className="text-muted-foreground">Feedback: {result.feedback}</p>
      ) : null}
    </div>
  );
}

