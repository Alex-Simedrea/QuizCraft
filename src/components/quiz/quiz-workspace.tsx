"use client";

import { AlertCircle, PencilLine, Play, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { retryQuizGenerationAction } from "@/lib/quiz-generation";
import {
  getGenerationLabelFromRequest,
  getQuizGenerationChunks,
  getQuizQuestionCount,
  type QuizRecord,
} from "@/lib/quiz-preview";
import { QuizGenerationPanel } from "@/components/quiz/quiz-generation-panel";
import { QuizSolvingView } from "@/components/quiz/quiz-solving-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type QuizWorkspaceProps = {
  initialQuiz: QuizRecord;
};

type QuizWorkspaceMode = "overview" | "solving" | "editing-preview";

export function QuizWorkspace({ initialQuiz }: QuizWorkspaceProps) {
  const router = useRouter();
  const [quiz, setQuiz] = useState(initialQuiz);
  const [mode, setMode] = useState<QuizWorkspaceMode>("overview");
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
          quiz.status !== nextQuiz.status &&
          (nextQuiz.status === "ready" || nextQuiz.status === "failed");

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
    (quiz.status === "ready" ? null : (chunks[quiz.completedChunks]?.id ?? null));
  const progressValue =
    quiz.totalChunks === 0 ? 100 : (quiz.completedChunks / quiz.totalChunks) * 100;

  if (quiz.status !== "ready") {
    return (
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6 md:p-8 lg:p-10">
        <QuizGenerationPanel
          chunks={chunks}
          completedChunkIds={completedChunkIds}
          currentChunkId={currentChunkId}
          progressValue={progressValue}
          snapshot={quiz.draftSnapshot}
        />
        {quiz.status === "failed" ? (
          <Card>
            <CardHeader>
              <CardTitle>Generation paused</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-start gap-3 rounded-3xl border bg-background px-4 py-4">
                <div className="flex size-9 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <AlertCircle />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">The last chunk failed validation.</p>
                  <p className="pt-1 text-sm text-muted-foreground">
                    {quiz.errorMessage ?? "Generation failed."}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  disabled={isRetrying}
                  onClick={() => {
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
                  }}
                  type="button"
                >
                  Resume generation
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    );
  }

  if (mode === "solving") {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6 md:p-8 lg:p-10">
        <QuizSolvingView
          onBack={() => setMode("overview")}
          sections={quiz.generatedSections}
        />
      </div>
    );
  }

  if (mode === "editing-preview") {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6 md:p-8 lg:p-10">
        <Card>
          <CardHeader>
            <CardTitle>Edit quiz</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              The editor slice will reuse this persisted quiz record, so the loading and solving
              flow no longer needs to change when editing lands.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => setMode("overview")} type="button" variant="outline">
                Back to overview
              </Button>
              <Button onClick={() => setMode("solving")} type="button">
                Start solving instead
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6 md:p-8 lg:p-10">
      <Card>
        <CardHeader>
          <CardTitle>{quiz.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              <Sparkles data-icon="inline-start" />
              Generation complete
            </Badge>
            <Badge variant="outline">{quiz.generatedSections.length} sections</Badge>
            <Badge variant="outline">
              {getQuizQuestionCount(quiz.generatedSections)} questions
            </Badge>
          </div>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.9fr)]">
            <div className="flex flex-col gap-4">
              {quiz.generatedSections.map((section) => (
                <div className="rounded-3xl border bg-background px-4 py-4" key={section.id}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{section.name}</p>
                    <Badge variant="outline">{section.questions.length} questions</Badge>
                  </div>
                  <div className="pt-3">
                    {section.questions.map((question) => (
                      <p
                        className="truncate py-1 text-sm text-muted-foreground"
                        key={question.id}
                      >
                        {question.prompt}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-4">
              <Card size="sm">
                <CardHeader>
                  <CardTitle>Next step</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <Button onClick={() => setMode("solving")} type="button">
                    <Play data-icon="inline-start" />
                    Start solving
                  </Button>
                  <Button
                    onClick={() => setMode("editing-preview")}
                    type="button"
                    variant="outline"
                  >
                    <PencilLine data-icon="inline-start" />
                    Edit quiz
                  </Button>
                </CardContent>
              </Card>
              <Card size="sm">
                <CardHeader>
                  <CardTitle>Generated from</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <p className="text-sm text-muted-foreground">{quiz.prompt}</p>
                  <div className="flex flex-col gap-2">
                    {quiz.draftSnapshot.sections.map((section) =>
                      section.groups.map((group) => (
                        <div
                          className="flex items-center justify-between gap-3 rounded-3xl border bg-background px-4 py-3"
                          key={group.id}
                        >
                          <span className="truncate text-sm">{section.name}</span>
                          <Badge variant="outline">
                            {getGenerationLabelFromRequest(group)}
                          </Badge>
                        </div>
                      )),
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
