"use client";

import { Check, ClipboardList, Copy, PencilLine, Play } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Surface, SurfaceInset } from "@/components/ui/surface";
import { Switch } from "@/components/ui/switch";
import { updateQuizPublicAction } from "@/lib/quiz/generation/actions";

type QuizOverviewActionsProps = {
  attemptsHref: string;
  editHref: string;
  isPublic: boolean;
  quizId: string;
  solveHref: string;
};

export function QuizOverviewActions({
  attemptsHref,
  editHref,
  isPublic: initialIsPublic,
  quizId,
  solveHref,
}: QuizOverviewActionsProps) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, startUpdating] = useTransition();
  const shareHref = `/share/${quizId}`;
  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return shareHref;
    return `${window.location.origin}${shareHref}`;
  }, [shareHref]);

  function updatePublic(nextValue: boolean) {
    setError(null);
    setIsPublic(nextValue);

    startUpdating(() => {
      void updateQuizPublicAction(quizId, nextValue).then((result) => {
        if (!result.success) {
          setIsPublic(!nextValue);
          setError(result.message);
          return;
        }

        setIsPublic(result.quiz.isPublic);
      });
    });
  }

  function copyShareLink() {
    void navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <Surface className="flex flex-col gap-3">
      <Button asChild>
        <Link href={solveHref}>
          <Play data-icon="inline-start" />
          Start solving
        </Link>
      </Button>
      <Button className="bg-background" asChild variant="secondary">
        <Link href={editHref}>
          <PencilLine data-icon="inline-start" />
          Edit quiz
        </Link>
      </Button>
      <Button className="bg-background" asChild variant="secondary">
        <Link href={attemptsHref}>
          <ClipboardList data-icon="inline-start" />
          Attempts
        </Link>
      </Button>
      <SurfaceInset className="gap-3 flex flex-col">
        <Field orientation="horizontal" className="items-center!">
          <FieldContent className="gap-0">
            <FieldLabel>Public sharing</FieldLabel>
            <FieldDescription>
              Allow anyone with the link to attempt this quiz.
            </FieldDescription>
          </FieldContent>
          <Switch
            checked={isPublic}
            disabled={isUpdating}
            onCheckedChange={(value) => updatePublic(value === true)}
          />
        </Field>
        {isPublic ? (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Input readOnly value={shareUrl} />
              <Button
                aria-label="Copy share link"
                onClick={copyShareLink}
                size="icon"
                type="button"
                variant="secondary"
              >
                {copied ? <Check /> : <Copy />}
              </Button>
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : null}
      </SurfaceInset>
    </Surface>
  );
}
