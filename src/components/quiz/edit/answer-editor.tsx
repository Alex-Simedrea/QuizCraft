"use client";

import { useSortable } from "@dnd-kit/react/sortable";
import { MessageSquarePlus, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { QuizEditAgentReference } from "@/lib/quiz/edit-agent/types";
import { cn } from "@/lib/utils";

import { SortableHandle } from "./sortable-handle";
import {
  addAnswer,
  removeAnswer,
  updateAnswerValue,
  updateChoiceAnswerValue,
} from "./state";
import {
  type AnswerDragData,
  type AnswerKind,
  type EditorAnswer,
  type EditorChoiceQuestion,
  type EditorMultiSelectQuestion,
  type EditorQuestion,
  SORTABLE_TRANSITION,
  answerGroupId,
} from "./types";

type SortableAnswerRowProps = {
  answerId: string;
  children: React.ReactNode;
  index: number;
  kind: AnswerKind;
  label: string;
  questionId: string;
};

function SortableAnswerRow({
  answerId,
  children,
  index,
  kind,
  label,
  questionId,
}: SortableAnswerRowProps) {
  const { handleRef, isDragSource, ref } = useSortable({
    accept: kind,
    data: {
      type: "answer",
      kind,
      questionId,
      answerId,
    } satisfies AnswerDragData,
    group: answerGroupId(kind, questionId),
    id: answerId,
    index,
    transition: SORTABLE_TRANSITION,
    type: kind,
  });

  return (
    <div
      className={cn(
        "bg-background flex items-center gap-2 rounded-2xl p-2",
        isDragSource && "ring-ring opacity-60 ring-1",
      )}
      ref={ref}
    >
      <SortableHandle handleRef={handleRef} label={label} />
      {children}
    </div>
  );
}

type ChoiceAnswerEditorProps = {
  onQuestionChange: (question: EditorQuestion) => void;
  onReference?: (reference: QuizEditAgentReference) => void;
  question: EditorChoiceQuestion | EditorMultiSelectQuestion;
  sectionId: string;
};

export function ChoiceAnswerEditor({
  onQuestionChange,
  onReference,
  question,
}: ChoiceAnswerEditorProps) {
  function updateAnswer(answerId: string, value: string) {
    onQuestionChange(updateChoiceAnswerValue(question, answerId, value));
  }

  if (question.type === "single-choice") {
    return (
      <FieldSet>
        <FieldLegend className="sr-only">Answer options</FieldLegend>
        <RadioGroup
          className="flex flex-col gap-2"
          onValueChange={(value) =>
            onQuestionChange({ ...question, correctAnswerId: value })
          }
          value={question.correctAnswerId}
        >
          {question.answers.map((answer, answerIndex) => (
            <SortableAnswerRow
              answerId={answer.id}
              index={answerIndex}
              key={answer.id}
              kind="choice"
              label="Reorder answer"
              questionId={question.id}
            >
              <RadioGroupItem value={answer.id} />
              <Field className="min-w-0 flex-1">
                <FieldLabel className="sr-only">
                  Answer {answerIndex + 1}
                </FieldLabel>
                <Input
                  onChange={(event) =>
                    updateAnswer(answer.id, event.target.value)
                  }
                  value={answer.value}
                />
              </Field>
              {onReference ? (
                <Button
                  onClick={() =>
                    onReference({
                      answerIndex,
                      kind: "choice",
                      questionId: question.id,
                      type: "answer",
                    })
                  }
                  size="icon-sm"
                  type="button"
                  variant="ghost"
                  className="text-primary"
                >
                  <MessageSquarePlus />
                  <span className="sr-only">Reference answer</span>
                </Button>
              ) : null}
            </SortableAnswerRow>
          ))}
        </RadioGroup>
      </FieldSet>
    );
  }

  return (
    <FieldSet>
      <FieldLegend className="sr-only">Answer options</FieldLegend>
      <div className="flex flex-col gap-2">
        {question.answers.map((answer, answerIndex) => (
          <SortableAnswerRow
            answerId={answer.id}
            index={answerIndex}
            key={answer.id}
            kind="choice"
            label="Reorder answer"
            questionId={question.id}
          >
            <Checkbox
              checked={question.correctAnswerIds.includes(answer.id)}
              onCheckedChange={(checked) => {
                const nextCorrect = checked
                  ? [...question.correctAnswerIds, answer.id]
                  : question.correctAnswerIds.filter((id) => id !== answer.id);
                if (nextCorrect.length < 2) return;
                onQuestionChange({
                  ...question,
                  correctAnswerIds: [...new Set(nextCorrect)],
                });
              }}
            />
            <Field className="min-w-0 flex-1">
              <FieldLabel className="sr-only">
                Answer {answerIndex + 1}
              </FieldLabel>
              <Input
                onChange={(event) =>
                  updateAnswer(answer.id, event.target.value)
                }
                value={answer.value}
              />
            </Field>
            {onReference ? (
              <Button
                onClick={() =>
                  onReference({
                    answerIndex,
                    kind: "choice",
                    questionId: question.id,
                    type: "answer",
                  })
                }
                size="icon-sm"
                type="button"
                variant="ghost"
                className="text-primary"
              >
                <MessageSquarePlus />
                <span className="sr-only">Reference answer</span>
              </Button>
            ) : null}
          </SortableAnswerRow>
        ))}
      </div>
    </FieldSet>
  );
}

type TextListEditorProps = {
  addLabel: string;
  kind: Extract<AnswerKind, "acceptable-answer" | "rubric-point">;
  items: EditorAnswer[];
  label: string;
  minItems: number;
  onItemsChange: (items: EditorAnswer[]) => void;
  onReference?: (reference: QuizEditAgentReference) => void;
  questionId: string;
};

export function TextListEditor({
  addLabel,
  kind,
  items,
  label,
  minItems,
  onItemsChange,
  onReference,
  questionId,
}: TextListEditorProps) {
  return (
    <FieldSet>
      <FieldLegend>{label}</FieldLegend>
      <div className="flex flex-col gap-2">
        {items.map((item, itemIndex) => (
          <SortableAnswerRow
            answerId={item.id}
            index={itemIndex}
            key={item.id}
            kind={kind}
            label={`Reorder ${label.toLowerCase()}`}
            questionId={questionId}
          >
            <Input
              onChange={(event) =>
                onItemsChange(
                  updateAnswerValue(items, item.id, event.target.value),
                )
              }
              value={item.value}
            />
            {onReference ? (
              <Button
                onClick={() =>
                  onReference({
                    answerIndex: itemIndex,
                    kind,
                    questionId,
                    type: "answer",
                  })
                }
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <MessageSquarePlus />
                <span className="sr-only">Reference item</span>
              </Button>
            ) : null}
            <Button
              disabled={items.length <= minItems}
              onClick={() => onItemsChange(removeAnswer(items, item.id))}
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <Trash2 data-icon="inline-start" />
            </Button>
          </SortableAnswerRow>
        ))}
        <Button
          onClick={() => onItemsChange(addAnswer(items, "New item"))}
          type="button"
          variant="secondary"
        >
          <Plus data-icon="inline-start" />
          {addLabel}
        </Button>
      </div>
    </FieldSet>
  );
}
