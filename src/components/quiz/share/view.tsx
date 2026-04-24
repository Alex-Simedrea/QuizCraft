"use client";

import { BookOpen, CopyPlus, LogIn, Play } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { QuizSolvingView } from "@/components/quiz/solve/view";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { copyPublicQuizAction } from "@/lib/quiz/generation/actions";
import type { QuizRecord } from "@/lib/quiz/preview";

type SharedQuizViewProps = {
  isAuthenticated: boolean;
  quiz: QuizRecord;
};

export function SharedQuizView({ isAuthenticated, quiz }: SharedQuizViewProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"intro" | "solve-account" | "solve-guest">(
    "intro",
  );
  const [guestName, setGuestName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaving] = useTransition();

  function saveQuiz() {
    setError(null);
    startSaving(() => {
      void copyPublicQuizAction(quiz.id).then((result) => {
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
        quizId={quiz.id}
        sections={quiz.generatedSections}
        submitMode={{ kind: "public-user" }}
        title={quiz.title}
      />
    );
  }

  if (mode === "solve-guest") {
    return (
      <QuizSolvingView
        initialAttempt={null}
        quizId={quiz.id}
        sections={quiz.generatedSections}
        submitMode={{ kind: "guest", guestName }}
        title={quiz.title}
      />
    );
  }

  const loginHref = `/login?next=${encodeURIComponent(`/share/${quiz.id}`)}`;
  const canStartGuest = guestName.trim().length > 0;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col gap-5 p-6 md:p-8 lg:p-10">
      <header className="flex flex-col gap-2 py-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpen />
          Shared quiz
        </div>
        <h1 className="text-3xl font-semibold">{quiz.title}</h1>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Use your account</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button
              disabled={!isAuthenticated}
              onClick={() => setMode("solve-account")}
              type="button"
            >
              <Play data-icon="inline-start" />
              Make an attempt
            </Button>
            {isAuthenticated ? (
              <Button
                disabled={isSaving}
                onClick={saveQuiz}
                type="button"
                variant="secondary"
              >
                <CopyPlus data-icon="inline-start" />
                Save quiz to my account
              </Button>
            ) : (
              <Button asChild variant="secondary">
                <Link href={loginHref}>
                  <LogIn data-icon="inline-start" />
                  Log in to save
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Continue as guest</CardTitle>
          </CardHeader>
          <CardContent>
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
                  Your result will be visible to the quiz owner.
                </FieldDescription>
              </Field>
              <Button
                disabled={!canStartGuest}
                onClick={() => setMode("solve-guest")}
                type="button"
              >
                <Play data-icon="inline-start" />
                Start as guest
              </Button>
            </FieldGroup>
          </CardContent>
        </Card>
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Could not save quiz</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </main>
  );
}
