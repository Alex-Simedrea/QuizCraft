"use client";

import { FileQuestion, Layers, PencilLine } from "lucide-react";
import type { ReactNode } from "react";

import {
  formatQuestionType,
  getQuestionDiffRows,
} from "@/components/quiz/edit/agent-sidebar/question-diff";
import type {
  QuizEditAgentOperation,
  QuizEditAgentSectionSnapshot,
} from "@/lib/quiz/edit-agent/types";
import { cn } from "@/lib/utils";

function EntityHeader({
  icon,
  subtitle,
  title,
}: {
  icon: ReactNode;
  subtitle?: string;
  title: string;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2 overflow-hidden">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-background/80">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="truncate text-xs font-medium">{title}</div>
        {subtitle ? (
          <div className="text-muted-foreground truncate text-[0.7rem]">
            {subtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SectionPreview({
  section,
  tone,
}: {
  section: QuizEditAgentSectionSnapshot;
  tone: "created" | "deleted";
}) {
  return (
    <div
      className={cn(
        "min-w-0 overflow-hidden rounded-xl border p-2.5",
        tone === "created"
          ? "border-emerald-200 bg-emerald-50 text-emerald-950"
          : "border-rose-200 bg-rose-50 text-rose-950",
      )}
    >
      <EntityHeader
        icon={<Layers className="size-4" />}
        subtitle={`${section.questionCount} question${section.questionCount === 1 ? "" : "s"}`}
        title={tone === "created" ? "New section" : "Deleted section"}
      />
      <div
        className={cn(
          "mt-2 truncate text-sm font-medium",
          tone === "deleted" && "text-rose-700 line-through",
        )}
      >
        {section.name}
      </div>
    </div>
  );
}

function SectionDiffPreview({
  after,
  before,
}: {
  after: QuizEditAgentSectionSnapshot;
  before: QuizEditAgentSectionSnapshot;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-amber-950">
      <EntityHeader
        icon={<PencilLine className="size-4" />}
        subtitle={`${after.questionCount} question${after.questionCount === 1 ? "" : "s"}`}
        title="Renamed section"
      />
      <div className="mt-2 grid min-w-0 gap-1 text-sm">
        <div className="truncate text-rose-700 line-through">{before.name}</div>
        <div className="truncate font-medium text-emerald-700">
          {after.name}
        </div>
      </div>
    </div>
  );
}

function QuestionPreview({
  operation,
}: {
  operation: Extract<
    QuizEditAgentOperation,
    { kind: "question_created" | "question_deleted" }
  >;
}) {
  const isCreated = operation.kind === "question_created";
  const question = isCreated ? operation.after : operation.before;

  return (
    <div
      className={cn(
        "min-w-0 overflow-hidden rounded-xl border p-2.5",
        isCreated
          ? "border-emerald-200 bg-emerald-50 text-emerald-950"
          : "border-rose-200 bg-rose-50 text-rose-950",
      )}
    >
      <EntityHeader
        icon={<FileQuestion className="size-4" />}
        subtitle={`${formatQuestionType(question.type)} · ${question.difficulty} · ${operation.section.name}`}
        title={isCreated ? "New question" : "Deleted question"}
      />
      <div
        className={cn(
          "mt-2 truncate text-sm font-medium",
          !isCreated && "text-rose-700 line-through",
        )}
      >
        {question.prompt}
      </div>
    </div>
  );
}

function QuestionDiffPreview({
  operation,
}: {
  operation: Extract<
    QuizEditAgentOperation,
    {
      kind:
        | "answer_created"
        | "answer_deleted"
        | "answer_updated"
        | "correct_answers_updated"
        | "question_updated";
    }
  >;
}) {
  if (!operation.before || !operation.after) return null;
  const diffRows = getQuestionDiffRows(operation.before, operation.after);

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-sky-200 bg-sky-50 p-2.5 text-sky-950">
      <EntityHeader
        icon={<PencilLine className="size-4" />}
        subtitle={`${formatQuestionType(operation.after.type)} · ${operation.after.difficulty} · ${operation.section.name}`}
        title="Updated question"
      />
      <div className="mt-2 grid min-w-0 gap-1.5 overflow-hidden">
        {diffRows.length > 0 ? (
          diffRows.map((row) => (
            <div
              className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] gap-2 text-xs"
              key={row.label}
            >
              <div className="text-muted-foreground truncate">{row.label}</div>
              <div className="grid min-w-0 gap-0.5">
                <div className="truncate text-rose-700 line-through">
                  {row.before || "Empty"}
                </div>
                <div className="truncate font-medium text-emerald-700">
                  {row.after || "Empty"}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-muted-foreground truncate text-xs">
            No visible field changes.
          </div>
        )}
      </div>
    </div>
  );
}

function QuizTitleDiffPreview({
  operation,
}: {
  operation: Extract<QuizEditAgentOperation, { kind: "quiz_title_updated" }>;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-amber-950">
      <EntityHeader
        icon={<PencilLine className="size-4" />}
        title="Renamed quiz"
      />
      <div className="mt-2 grid min-w-0 gap-1 text-sm">
        <div className="truncate text-rose-700 line-through">
          {operation.beforeTitle}
        </div>
        <div className="truncate font-medium text-emerald-700">
          {operation.afterTitle}
        </div>
      </div>
    </div>
  );
}

function OperationPreview({
  operation,
}: {
  operation: QuizEditAgentOperation;
}) {
  if (operation.kind === "section_created") {
    return <SectionPreview section={operation.section} tone="created" />;
  }
  if (operation.kind === "section_deleted") {
    return <SectionPreview section={operation.section} tone="deleted" />;
  }
  if (operation.kind === "section_updated") {
    return (
      <SectionDiffPreview after={operation.after} before={operation.before} />
    );
  }
  if (
    operation.kind === "question_created" ||
    operation.kind === "question_deleted"
  ) {
    return <QuestionPreview operation={operation} />;
  }
  if (operation.kind === "quiz_title_updated") {
    return <QuizTitleDiffPreview operation={operation} />;
  }
  return <QuestionDiffPreview operation={operation} />;
}

export function OperationPreviewList({
  operations,
}: {
  operations: QuizEditAgentOperation[];
}) {
  return (
    <div className="grid min-w-0 gap-2 overflow-hidden pt-1">
      {operations.map((operation, index) => (
        <OperationPreview
          key={`${operation.kind}-${index}`}
          operation={operation}
        />
      ))}
    </div>
  );
}
