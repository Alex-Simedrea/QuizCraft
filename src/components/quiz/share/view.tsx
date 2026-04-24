"use client";

import { CopyPlus, LogIn, Play, Share2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { QuizSolvingView } from "@/components/quiz/solve/view";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Surface, SurfaceInset } from "@/components/ui/surface";
import {
  copyPublicQuizAction,
  getPublicQuizRecordAction,
} from "@/lib/quiz/generation/actions";
import type { QuizRecord } from "@/lib/quiz/preview";

type SharedQuizViewProps = {
  isAuthenticated: boolean;
  quiz: QuizRecord;
};

export function SharedQuizView({ isAuthenticated, quiz }: SharedQuizViewProps) {
  const router = useRouter();
  const [currentQuiz, setCurrentQuiz] = useState(quiz);
  const [mode, setMode] = useState<"intro" | "solve-account" | "solve-guest">(
    "intro",
  );
  const [guestName, setGuestName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isStarting, startAttempt] = useTransition();
  const [isSaving, startSaving] = useTransition();

  function startSolving(nextMode: "solve-account" | "solve-guest") {
    setError(null);
    startAttempt(() => {
      void getPublicQuizRecordAction(currentQuiz.id).then((latestQuiz) => {
        if (!latestQuiz) {
          setError("This quiz is no longer public.");
          router.refresh();
          return;
        }

        setCurrentQuiz(latestQuiz);
        setMode(nextMode);
      });
    });
  }

  function saveQuiz() {
    setError(null);
    startSaving(() => {
      void copyPublicQuizAction(currentQuiz.id).then((result) => {
        if (!result.success) {
          setError(result.message);
          return;
        }

        router.push(`/quiz/${result.quizId}`);
      });
    });
  }

  if (mode === "solve-account") {
    return (
      <QuizSolvingView
        initialAttempt={null}
        quizId={currentQuiz.id}
        sections={currentQuiz.generatedSections}
        submitMode={{ kind: "public-user" }}
        title={currentQuiz.title}
      />
    );
  }

  if (mode === "solve-guest") {
    return (
      <QuizSolvingView
        initialAttempt={null}
        quizId={currentQuiz.id}
        sections={currentQuiz.generatedSections}
        submitMode={{ kind: "guest", guestName }}
        title={currentQuiz.title}
      />
    );
  }

  const loginHref = `/login?next=${encodeURIComponent(`/share/${currentQuiz.id}`)}`;
  const canStartGuest = guestName.trim().length > 0;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col gap-5 p-6 md:p-8 lg:p-10">
      <header className="flex flex-col gap-2 py-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Share2 className="size-4" />
          Shared quiz
        </div>
        <h1 className="text-3xl font-semibold">{currentQuiz.title}</h1>
      </header>
      <Surface className="grid gap-3 md:grid-cols-2">
        <SurfaceInset className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Use your account</h2>
          <div className="flex flex-col gap-3">
            {isAuthenticated ? (
              <>
                <Button
                  disabled={!isAuthenticated || isStarting}
                  onClick={() => startSolving("solve-account")}
                  type="button"
                >
                  <Play data-icon="inline-start" />
                  Make an attempt
                </Button>
                <Button
                  disabled={isSaving}
                  onClick={saveQuiz}
                  type="button"
                  variant="secondary"
                >
                  <CopyPlus data-icon="inline-start" />
                  Save quiz to my account
                </Button>
              </>
            ) : (
              <Button asChild>
                <Link href={loginHref}>
                  <LogIn data-icon="inline-start" />
                  Log in to save this quiz and your attempts
                </Link>
              </Button>
            )}
          </div>
        </SurfaceInset>
        <SurfaceInset className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Continue as guest</h2>
          <div>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="guest-name">Name</FieldLabel>
                <Input
                  id="guest-name"
                  maxLength={120}
                  onChange={(event) => setGuestName(event.target.value)}
                  placeholder="Your name"
                  value={guestName}
                />
                <FieldDescription>
                  Your result will be visible to the owner.
                </FieldDescription>
              </Field>
              <Button
                disabled={!canStartGuest || isStarting}
                onClick={() => startSolving("solve-guest")}
                type="button"
              >
                <Play data-icon="inline-start" />
                Start as guest
              </Button>
            </FieldGroup>
          </div>
        </SurfaceInset>
      </Surface>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Shared quiz unavailable</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </main>
  );
}
