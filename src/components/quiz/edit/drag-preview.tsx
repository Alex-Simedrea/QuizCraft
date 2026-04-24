"use client";

import { GripVertical } from "lucide-react";

import { Badge } from "@/components/ui/badge";

import { findEditorQuestion } from "./state";
import {
  type AnswerKind,
  type EditorQuestion,
  type EditorSection,
  QUESTION_TYPE_LABELS,
  type SortableDragData,
} from "./types";

const ANSWER_KIND_LABEL: Record<AnswerKind, string> = {
  choice: "Answer option",
  "acceptable-answer": "Accepted answer",
  "rubric-point": "Rubric point",
};

function getAnswerLabel(
  question: EditorQuestion | undefined,
  kind: AnswerKind,
  answerId: string,
): string {
  const fallback = ANSWER_KIND_LABEL[kind];
  if (!question) return fallback;
  if (
    kind === "choice" &&
    (question.type === "single-choice" || question.type === "multiple-choice")
  ) {
    return (
      question.answers.find((answer) => answer.id === answerId)?.value ??
      fallback
    );
  }
  if (kind === "acceptable-answer" && question.type === "short-text") {
    return (
      question.acceptableAnswers.find((answer) => answer.id === answerId)
        ?.value ?? fallback
    );
  }
  if (kind === "rubric-point" && question.type === "long-text") {
    return (
      question.rubricPoints.find((answer) => answer.id === answerId)?.value ??
      fallback
    );
  }
  return fallback;
}

function PreviewShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background border-border/70 pointer-events-none flex w-full max-w-xl items-center gap-3 rounded-lg border p-2 shadow-lg">
      <div className="text-muted-foreground flex size-8 shrink-0 items-center justify-center">
        <GripVertical data-icon="inline-start" />
      </div>
      {children}
    </div>
  );
}

export function QuizDragPreview({
  data,
  sections,
}: {
  data: SortableDragData | null;
  sections: EditorSection[];
}) {
  if (!data) return null;

  if (data.type === "section") {
    const section = sections.find((s) => s.id === data.sectionId);
    if (!section) return null;
    return (
      <PreviewShell>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{section.name}</p>
          <p className="text-muted-foreground truncate text-xs">
            {section.questions.length} question
            {section.questions.length === 1 ? "" : "s"}
          </p>
        </div>
      </PreviewShell>
    );
  }

  if (data.type === "question") {
    const location = findEditorQuestion(sections, data.questionId);
    if (!location) return null;
    return (
      <PreviewShell>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            Question {location.questionIndex + 1}
          </p>
          <p className="text-muted-foreground truncate text-xs">
            {location.question.prompt}
          </p>
        </div>
        <Badge className="capitalize" variant="outline">
          {location.question.difficulty}
        </Badge>
        <Badge className="hidden md:inline-flex" variant="secondary">
          {QUESTION_TYPE_LABELS[location.question.type]}
        </Badge>
      </PreviewShell>
    );
  }

  if (data.type === "answer") {
    const location = findEditorQuestion(sections, data.questionId);
    const label = getAnswerLabel(location?.question, data.kind, data.answerId);
    return (
      <PreviewShell>
        <p className="min-w-0 flex-1 truncate text-sm">{label}</p>
      </PreviewShell>
    );
  }

  return null;
}
