"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { QuizGenerationPanel } from "@/components/quiz/generation/panel";
import { QuizGenerationPausedPanel } from "@/components/quiz/generation/paused-panel";
import { QuizOverviewActions } from "@/components/quiz/overview/actions";
import { QuizStructure } from "@/components/quiz/overview/structure";
import { QuizWorkspaceShell } from "@/components/quiz/workspace/shell";
import { retryQuizGenerationAction } from "@/lib/quiz/generation/actions";
import { getQuizGenerationChunks, type QuizRecord } from "@/lib/quiz/preview";

type QuizWorkspaceProps = {
  initialQuiz: QuizRecord;
};

export function QuizWorkspace({ initialQuiz }: QuizWorkspaceProps) {
  const router = useRouter();
  const [quiz, setQuiz] = useState(initialQuiz);
  const [isRetrying, startRetry] = useTransition();

  useEffect(() => {
    setQuiz(initialQuiz);
  }, [initialQuiz]);

  useEffect(() => {
    if (quiz.status === "ready" || quiz.status === "failed") {
      return;
    }

    let isDisposed = false;

    async function refreshQuiz() {
      try {
        const response = await fetch(`/api/quizzes/${quiz.id}`, {
          cache: "no-store",
        });

        if (isDisposed) {
          return;
        }

        if (response.status === 404 || response.status === 401) {
          router.refresh();
          return;
        }

        if (!response.ok) {
          return;
        }

        const nextQuiz = (await response.json()) as QuizRecord;
        const shouldRefreshShell =
          quiz.title !== nextQuiz.title ||
          (quiz.status !== nextQuiz.status &&
            (nextQuiz.status === "ready" || nextQuiz.status === "failed"));

        setQuiz(nextQuiz);

        if (shouldRefreshShell) {
          router.refresh();
        }
      } catch {
        // Polling should fail softly and retry on the next interval.
      }
    }

    void refreshQuiz();

    const intervalId = window.setInterval(() => {
      void refreshQuiz();
    }, 1500);

    return () => {
      isDisposed = true;
      window.clearInterval(intervalId);
    };
  }, [quiz.id, quiz.status, router]);

  const chunks = getQuizGenerationChunks(quiz.draftSnapshot);
  const completedChunkIds = new Set(
    chunks.slice(0, quiz.completedChunks).map((chunk) => chunk.id),
  );
  const currentChunkId =
    quiz.activeChunkId ??
    (quiz.status === "ready"
      ? null
      : (chunks[quiz.completedChunks]?.id ?? null));
  const progressValue =
    quiz.totalChunks === 0
      ? 100
      : (quiz.completedChunks / quiz.totalChunks) * 100;

  function retryGeneration() {
    startRetry(() => {
      void retryQuizGenerationAction(quiz.id).then((nextQuiz) => {
        if (!nextQuiz) {
          router.refresh();
          return;
        }

        setQuiz(nextQuiz);
        router.refresh();
      });
    });
  }

  if (quiz.status !== "ready") {
    return (
      <QuizWorkspaceShell title={quiz.title}>
        {quiz.status === "failed" ? (
          <QuizGenerationPausedPanel
            errorMessage={quiz.errorMessage}
            isRetrying={isRetrying}
            onRetry={retryGeneration}
          />
        ) : (
          <QuizGenerationPanel
            chunks={chunks}
            completedChunkIds={completedChunkIds}
            currentChunkId={currentChunkId}
            progressValue={progressValue}
          />
        )}
        <QuizStructure
          prompt={quiz.prompt}
          quizId={quiz.id}
          resources={quiz.resources}
          sections={quiz.draftSnapshot.sections}
        />
      </QuizWorkspaceShell>
    );
  }

  return (
    <QuizWorkspaceShell title={quiz.title}>
      <QuizOverviewActions
        attemptsHref={`/quiz/${quiz.id}/attempts`}
        editHref={`/quiz/${quiz.id}/edit`}
        isPublic={quiz.isPublic}
        quizId={quiz.id}
        solveHref={`/quiz/${quiz.id}/solve`}
      />
      <div className="pt-8 gap-3 flex flex-col">
        <QuizStructure
          prompt={quiz.prompt}
          quizId={quiz.id}
          resources={quiz.resources}
          sections={quiz.draftSnapshot.sections}
        />
      </div>
    </QuizWorkspaceShell>
  );
}
