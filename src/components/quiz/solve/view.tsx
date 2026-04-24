"use client";

import { CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";

import { useDashboardHeader } from "@/components/dashboard/dashboard-header-context";
import { AttemptSummary } from "@/components/quiz/solve/attempt-summary";
import {
  buildImmediateResults,
  hasPendingTextReview,
  type QuizAnswerState,
  toSubmitAnswers,
} from "@/components/quiz/solve/grading-utils";
import { QuizSolvingSection } from "@/components/quiz/solve/solving-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import {
  submitGuestQuizAttemptAction,
  submitPublicQuizAttemptAction,
  submitQuizAttemptAction,
} from "@/lib/quiz/attempts/actions";
import {
  type QuizAttemptQuestionResult,
  type QuizAttemptRecord,
  type QuizSection,
} from "@/lib/quiz/preview";

type QuizSolvingViewProps = {
  initialAttempt: QuizAttemptRecord | null;
  quizId: string;
  sections: QuizSection[];
  submitMode?:
    | { kind: "guest"; guestName: string }
    | { kind: "owner" }
    | { kind: "public-user" };
  title: string;
};

export function QuizSolvingView({
  initialAttempt,
  quizId,
  sections,
  submitMode = { kind: "owner" },
  title,
}: QuizSolvingViewProps) {
  const router = useRouter();
  const [answers, setAnswers] = useState<QuizAnswerState>(
    () => initialAttempt?.answers ?? {},
  );
  const [attempt, setAttempt] = useState<QuizAttemptRecord | null>(
    initialAttempt,
  );
  const [optimisticResults, setOptimisticResults] = useState<
    QuizAttemptQuestionResult[] | null
  >(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, startSubmitting] = useTransition();

  useEffect(() => {
    setAttempt(initialAttempt);
    if (initialAttempt) {
      setAnswers(initialAttempt.answers);
      setOptimisticResults(null);
    }
  }, [initialAttempt]);

  useEffect(() => {
    if (attempt?.status !== "grading") return;

    const intervalId = window.setInterval(() => {
      router.refresh();
    }, 2000);

    return () => window.clearInterval(intervalId);
  }, [attempt?.status, router]);

  const submitAttempt = useCallback(() => {
    setSubmitError(null);
    const immediateResults = buildImmediateResults(sections, answers);
    setOptimisticResults(immediateResults);

    startSubmitting(() => {
      const payload =
        submitMode.kind === "guest"
          ? {
              answers: toSubmitAnswers(answers),
              guestName: submitMode.guestName,
            }
          : {
              answers: toSubmitAnswers(answers),
            };
      const request =
        submitMode.kind === "guest"
          ? submitGuestQuizAttemptAction(quizId, payload)
          : submitMode.kind === "public-user"
            ? submitPublicQuizAttemptAction(quizId, payload)
            : submitQuizAttemptAction(quizId, payload);

      void request.then((result) => {
        if (!result.success) {
          setSubmitError(result.message ?? "The quiz could not be submitted.");
          return;
        }

        const attemptHref =
          submitMode.kind === "guest"
            ? `/share/${quizId}/attempts/${result.attemptId}`
            : `/quiz/${quizId}/attempts/${result.attemptId}`;

        router.push(attemptHref);
      });
    });
  }, [answers, quizId, router, sections, submitMode]);

  const headerConfig = useMemo(
    () => ({
      backButton: { label: "Back to overview" },
      title,
    }),
    [title],
  );

  useDashboardHeader(headerConfig);

  const displayedResults = optimisticResults ?? attempt?.results ?? [];
  const pendingTextReview =
    (attempt?.status === "grading" &&
      displayedResults.some(
        (result) => result.type === "short-text" || result.type === "long-text",
      )) ||
    hasPendingTextReview(displayedResults);
  const scoreFinal = Boolean(attempt) && !pendingTextReview;
  const resultsByQuestionId = useMemo(
    () =>
      new Map(displayedResults.map((result) => [result.questionId, result])),
    [displayedResults],
  );
  const submitted = displayedResults.length > 0;

  function updateAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  }

  function updateMultipleChoiceAnswer(
    questionId: string,
    optionIndex: number,
    checked: boolean,
  ) {
    const nextValues = Array.isArray(answers[questionId])
      ? [...answers[questionId]]
      : [];

    if (checked) {
      if (!nextValues.includes(String(optionIndex))) {
        nextValues.push(String(optionIndex));
      }
    } else {
      const index = nextValues.indexOf(String(optionIndex));

      if (index >= 0) {
        nextValues.splice(index, 1);
      }
    }

    setAnswers((prev) => ({
      ...prev,
      [questionId]: nextValues,
    }));
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6 pt-20 md:p-8 md:pt-20 lg:p-10 lg:pt-20">
      {attempt ? (
        <AttemptSummary attempt={attempt} scoreFinal={scoreFinal} />
      ) : null}
      {attempt?.status === "failed" ? (
        <Card>
          <CardTitle>Error</CardTitle>
          <CardContent className="pt-6 text-sm text-destructive">
            {attempt.errorMessage ?? "The attempt could not be graded."}
          </CardContent>
        </Card>
      ) : null}
      {submitError ? (
        <Card>
          <CardTitle>Error</CardTitle>
          <CardContent className="pt-6 text-sm text-destructive">
            {submitError}
          </CardContent>
        </Card>
      ) : null}
      {sections.map((section) => (
        <QuizSolvingSection
          answers={answers}
          key={section.id}
          onMultipleChoiceChange={updateMultipleChoiceAnswer}
          onValueChange={updateAnswer}
          pendingTextReview={pendingTextReview}
          resultsByQuestionId={resultsByQuestionId}
          section={section}
          submitted={submitted}
        />
      ))}
      {attempt ? null : (
        <div className="flex">
          <Button
            className="h-12 w-full text-base"
            disabled={isSubmitting}
            onClick={submitAttempt}
            type="button"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" data-icon="inline-start" />
            ) : (
              <CheckCircle2 data-icon="inline-start" />
            )}
            Submit quiz
          </Button>
        </div>
      )}
    </div>
  );
}
