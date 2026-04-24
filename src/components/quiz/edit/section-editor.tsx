"use client";

import { useDroppable } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { CopyPlus, MessageSquarePlus, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Surface, SurfaceInset } from "@/components/ui/surface";
import type { QuizEditAgentReference } from "@/lib/quiz/edit-agent/types";
import { cn } from "@/lib/utils";

import { SortableQuestionEditor } from "./question-editor";
import { SortableHandle } from "./sortable-handle";
import {
  type EditorQuestion,
  type EditorSection,
  QUESTION_TYPE,
  SECTION_DROP_TYPE,
  SECTION_GROUP,
  SECTION_TYPE,
  SORTABLE_TRANSITION,
  type SectionDragData,
  type SectionDropTargetData,
  sectionDropId,
} from "./types";

function EmptySectionDropZone({
  compact,
  sectionId,
}: {
  compact: boolean;
  sectionId: string;
}) {
  const { isDropTarget, ref } = useDroppable({
    accept: QUESTION_TYPE,
    data: {
      sectionId,
      type: "section-drop",
    } satisfies SectionDropTargetData,
    id: sectionDropId(sectionId),
    type: SECTION_DROP_TYPE,
  });

  return (
    <div
      className={cn(
        "text-muted-foreground flex items-center justify-center rounded-2xl border-2 border-dashed",
        compact ? "px-3 py-4 text-xs" : "px-4 py-6 text-sm",
        isDropTarget
          ? "border-ring bg-secondary/60"
          : "border-border/60 bg-secondary/30",
      )}
      ref={ref}
    >
      Drop question here
    </div>
  );
}

export function SectionCompactCard({
  handleRef,
  isDragSource,
  section,
}: {
  handleRef?: (element: Element | null) => void;
  isDragSource?: boolean;
  section: EditorSection;
}) {
  return (
    <div
      className={cn(
        "bg-background border-border/70 flex items-center gap-3 rounded-lg border p-2",
        isDragSource && "ring-ring opacity-60 ring-1",
      )}
    >
      <SortableHandle handleRef={handleRef} label="Reorder section" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {section.name || "Untitled section"}
        </p>
        <p className="text-muted-foreground truncate text-xs">
          {section.questions
            .slice(0, 3)
            .map((question) => question.prompt)
            .join(" • ") || "No questions yet"}
        </p>
      </div>
      <Badge variant="outline">
        {section.questions.length} question
        {section.questions.length === 1 ? "" : "s"}
      </Badge>
    </div>
  );
}

type SortableSectionEditorProps = {
  addQuestion: (sectionId: string) => void;
  compactQuestions: boolean;
  compactSection: boolean;
  duplicateQuestion: (sectionId: string, questionId: string) => void;
  duplicateSection: (sectionId: string) => void;
  isQuestionDragActive: boolean;
  onReference?: (reference: QuizEditAgentReference) => void;
  removeQuestion: (sectionId: string, questionId: string) => void;
  removeSection: (sectionId: string) => void;
  section: EditorSection;
  sectionIndex: number;
  sectionsLength: number;
  updateQuestion: (
    sectionId: string,
    questionId: string,
    updater: (question: EditorQuestion) => EditorQuestion,
  ) => void;
  updateSection: (
    sectionId: string,
    updater: (section: EditorSection) => EditorSection,
  ) => void;
};

export function SortableSectionEditor({
  addQuestion,
  compactQuestions,
  compactSection,
  duplicateQuestion,
  duplicateSection,
  isQuestionDragActive,
  onReference,
  removeQuestion,
  removeSection,
  section,
  sectionIndex,
  sectionsLength,
  updateQuestion,
  updateSection,
}: SortableSectionEditorProps) {
  const { handleRef, isDragSource, ref } = useSortable({
    accept: SECTION_TYPE,
    data: {
      type: "section",
      sectionId: section.id,
    } satisfies SectionDragData,
    group: SECTION_GROUP,
    id: section.id,
    index: sectionIndex,
    transition: SORTABLE_TRANSITION,
    type: SECTION_TYPE,
  });

  if (compactSection) {
    return (
      <section ref={ref}>
        <SectionCompactCard
          handleRef={handleRef}
          isDragSource={isDragSource}
          section={section}
        />
      </section>
    );
  }

  return (
    <Surface
      className={cn(
        "flex flex-col gap-3",
        isDragSource && "ring-ring opacity-60 ring-1",
      )}
      ref={ref}
    >
      <SurfaceInset className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SortableHandle handleRef={handleRef} label="Reorder section" />
          <Field className="min-w-64 flex-1">
            <FieldLabel className="sr-only">Section name</FieldLabel>
            <Input
              onChange={(event) =>
                updateSection(section.id, (current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              value={section.name}
            />
          </Field>
          {onReference ? (
            <Button
              onClick={() =>
                onReference({
                  sectionId: section.id,
                  type: "section",
                })
              }
              size="icon-sm"
              type="button"
              variant="ghost"
              className="text-primary"
            >
              <MessageSquarePlus data-icon="inline-start" />
              <span className="sr-only">Reference section</span>
            </Button>
          ) : null}
          <Button
            onClick={() => duplicateSection(section.id)}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <CopyPlus data-icon="inline-start" />
          </Button>
          <Button
            disabled={sectionsLength <= 1}
            onClick={() => removeSection(section.id)}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <Trash2 data-icon="inline-start" />
          </Button>
        </div>
      </SurfaceInset>

      {section.questions.map((question, questionIndex) => (
        <SortableQuestionEditor
          compact={compactQuestions}
          duplicateQuestion={duplicateQuestion}
          key={question.id}
          onReference={onReference}
          question={question}
          questionIndex={questionIndex}
          removeQuestion={removeQuestion}
          sectionId={section.id}
          updateQuestion={updateQuestion}
        />
      ))}
      {section.questions.length === 0 && isQuestionDragActive ? (
        <EmptySectionDropZone
          compact={compactQuestions}
          sectionId={section.id}
        />
      ) : null}
      {!compactQuestions ? (
        <Button
          className="w-full bg-background"
          onClick={() => addQuestion(section.id)}
          type="button"
          variant="secondary"
        >
          <Plus data-icon="inline-start" />
          Add question
        </Button>
      ) : null}
    </Surface>
  );
}
