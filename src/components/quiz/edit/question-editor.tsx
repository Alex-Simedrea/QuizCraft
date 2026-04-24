"use client";

import { useSortable } from "@dnd-kit/react/sortable";
import { CopyPlus, MessageSquarePlus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { QuestionDifficulty, QuestionType } from "@/lib/quiz/draft";
import { QUESTION_DIFFICULTIES, QUESTION_TYPES } from "@/lib/quiz/draft";
import type { QuizEditAgentReference } from "@/lib/quiz/edit-agent/types";
import { cn } from "@/lib/utils";

import { ChoiceAnswerEditor, TextListEditor } from "./answer-editor";
import { SortableHandle } from "./sortable-handle";
import {
  convertQuestionType,
  isQuestionDifficulty,
  isQuestionType,
} from "./state";
import {
  type EditorQuestion,
  type QuestionDragData,
  QUESTION_TYPE,
  QUESTION_TYPE_LABELS,
  SORTABLE_TRANSITION,
} from "./types";

type TypeSelectProps = {
  onChange: (value: QuestionType) => void;
  value: QuestionType;
};

function TypeSelect({ onChange, value }: TypeSelectProps) {
  return (
    <Select
      onValueChange={(nextValue) => {
        if (isQuestionType(nextValue)) onChange(nextValue);
      }}
      value={value}
    >
      <SelectTrigger className="w-full md:w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {QUESTION_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {QUESTION_TYPE_LABELS[type]}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

type DifficultySelectProps = {
  onChange: (value: QuestionDifficulty) => void;
  value: QuestionDifficulty;
};

function DifficultySelect({ onChange, value }: DifficultySelectProps) {
  return (
    <Select
      onValueChange={(nextValue) => {
        if (isQuestionDifficulty(nextValue)) onChange(nextValue);
      }}
      value={value}
    >
      <SelectTrigger className="w-full md:w-36">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {QUESTION_DIFFICULTIES.map((difficulty) => (
            <SelectItem key={difficulty} value={difficulty}>
              {difficulty[0]?.toUpperCase()}
              {difficulty.slice(1)}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

type QuestionBodyEditorProps = {
  onQuestionChange: (question: EditorQuestion) => void;
  onReference?: (reference: QuizEditAgentReference) => void;
  question: EditorQuestion;
  sectionId: string;
};

function QuestionBodyEditor({
  onQuestionChange,
  onReference,
  question,
  sectionId,
}: QuestionBodyEditorProps) {
  switch (question.type) {
    case "single-choice":
    case "multiple-choice":
      return (
        <ChoiceAnswerEditor
          onQuestionChange={onQuestionChange}
          onReference={onReference}
          question={question}
          sectionId={sectionId}
        />
      );
    case "true-false":
      return (
        <FieldSet>
          <FieldLegend>Correct answer</FieldLegend>
          <RadioGroup
            onValueChange={(value) =>
              onQuestionChange({
                ...question,
                correctAnswer: value === "true",
              })
            }
            value={String(question.correctAnswer)}
          >
            <Field orientation="horizontal">
              <RadioGroupItem value="true" />
              <FieldLabel>True</FieldLabel>
            </Field>
            <Field orientation="horizontal">
              <RadioGroupItem value="false" />
              <FieldLabel>False</FieldLabel>
            </Field>
          </RadioGroup>
        </FieldSet>
      );
    case "short-text":
      return (
        <TextListEditor
          addLabel="Add accepted answer"
          kind="acceptable-answer"
          items={question.acceptableAnswers}
          label="Accepted answers"
          minItems={1}
          onItemsChange={(acceptableAnswers) =>
            onQuestionChange({ ...question, acceptableAnswers })
          }
          onReference={onReference}
          questionId={question.id}
        />
      );
    case "long-text":
      return (
        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel>Sample answer</FieldLabel>
            <Textarea
              onChange={(event) =>
                onQuestionChange({
                  ...question,
                  sampleAnswer: event.target.value,
                })
              }
              rows={4}
              value={question.sampleAnswer}
            />
          </Field>
          <TextListEditor
            addLabel="Add rubric point"
            kind="rubric-point"
            items={question.rubricPoints}
            label="Rubric points"
            minItems={1}
            onItemsChange={(rubricPoints) =>
              onQuestionChange({ ...question, rubricPoints })
            }
            onReference={onReference}
            questionId={question.id}
          />
        </div>
      );
  }
}

export function QuestionCompactCard({
  handleRef,
  isDragSource,
  question,
  questionIndex,
}: {
  handleRef?: (element: Element | null) => void;
  isDragSource?: boolean;
  question: EditorQuestion;
  questionIndex: number;
}) {
  return (
    <div
      className={cn(
        "bg-background border-border/70 flex items-center gap-3 rounded-lg border p-2",
        isDragSource && "ring-ring opacity-60 ring-1",
      )}
    >
      <SortableHandle handleRef={handleRef} label="Reorder question" />
      <div className="min-w-0 flex-1">
        <p className="text-ellipsis line-clamp-2 text-sm font-medium">
          {question.prompt}
        </p>
      </div>
      <Badge className="capitalize" variant="outline">
        {question.difficulty}
      </Badge>
      <Badge className="hidden md:inline-flex" variant="secondary">
        {QUESTION_TYPE_LABELS[question.type]}
      </Badge>
    </div>
  );
}

type SortableQuestionEditorProps = {
  compact: boolean;
  duplicateQuestion: (sectionId: string, questionId: string) => void;
  onReference?: (reference: QuizEditAgentReference) => void;
  question: EditorQuestion;
  questionIndex: number;
  removeQuestion: (sectionId: string, questionId: string) => void;
  sectionId: string;
  updateQuestion: (
    sectionId: string,
    questionId: string,
    updater: (question: EditorQuestion) => EditorQuestion,
  ) => void;
};

export function SortableQuestionEditor({
  compact,
  duplicateQuestion,
  onReference,
  question,
  questionIndex,
  removeQuestion,
  sectionId,
  updateQuestion,
}: SortableQuestionEditorProps) {
  const { handleRef, isDragSource, ref } = useSortable({
    accept: QUESTION_TYPE,
    data: {
      type: "question",
      questionId: question.id,
      sectionId,
    } satisfies QuestionDragData,
    group: sectionId,
    id: question.id,
    index: questionIndex,
    transition: SORTABLE_TRANSITION,
    type: QUESTION_TYPE,
  });

  if (compact) {
    return (
      <div ref={ref}>
        <QuestionCompactCard
          handleRef={handleRef}
          isDragSource={isDragSource}
          question={question}
          questionIndex={questionIndex}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-background flex flex-col gap-4 rounded-2xl p-3",
        isDragSource && "ring-ring opacity-60 ring-1",
      )}
      ref={ref}
    >
      <div className="flex flex-wrap items-start gap-3 justify-between">
        <SortableHandle handleRef={handleRef} label="Reorder question" />
        <div className="flex gap-2">
          {onReference ? (
            <Button
              onClick={() =>
                onReference({
                  questionId: question.id,
                  type: "question",
                })
              }
              size="icon-sm"
              type="button"
              variant="ghost"
              className="text-primary"
            >
              <MessageSquarePlus />
              <span className="sr-only">Reference question</span>
            </Button>
          ) : null}
          <Button
            onClick={() => duplicateQuestion(sectionId, question.id)}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <CopyPlus data-icon="inline-start" />
          </Button>
          <Button
            onClick={() => removeQuestion(sectionId, question.id)}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <Trash2 data-icon="inline-start" />
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
          <Field>
            <FieldLabel>Question</FieldLabel>
            <Textarea
              onChange={(event) =>
                updateQuestion(sectionId, question.id, (current) => ({
                  ...current,
                  prompt: event.target.value,
                }))
              }
              rows={2}
              value={question.prompt}
            />
          </Field>
          <Field>
            <FieldLabel>Type</FieldLabel>
            <TypeSelect
              onChange={(type) =>
                updateQuestion(sectionId, question.id, (current) =>
                  convertQuestionType(current, type),
                )
              }
              value={question.type}
            />
          </Field>
          <Field>
            <FieldLabel>Difficulty</FieldLabel>
            <DifficultySelect
              onChange={(difficulty) =>
                updateQuestion(sectionId, question.id, (current) => ({
                  ...current,
                  difficulty,
                }))
              }
              value={question.difficulty}
            />
          </Field>
        </div>
      </div>

      <QuestionBodyEditor
        onQuestionChange={(nextQuestion) =>
          updateQuestion(sectionId, question.id, () => nextQuestion)
        }
        onReference={onReference}
        question={question}
        sectionId={sectionId}
      />

      <Field>
        <FieldLabel>Explanation</FieldLabel>
        <Textarea
          onChange={(event) =>
            updateQuestion(sectionId, question.id, (current) => ({
              ...current,
              explanation: event.target.value,
            }))
          }
          rows={3}
          value={question.explanation}
        />
      </Field>
    </div>
  );
}
