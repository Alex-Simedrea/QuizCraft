import { CopyPlus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SurfaceInset } from "@/components/ui/surface";
import type {
  QuestionDifficulty,
  QuestionDraft,
  QuestionType,
  SectionDraft,
} from "@/lib/quiz/draft";
import { QUESTION_DIFFICULTIES, QUESTION_TYPES } from "@/lib/quiz/draft";

type PromptBuilderSectionProps = {
  index: number;
  section: SectionDraft;
  onAddQuestion: () => void;
  onRemoveSection: () => void;
  onRemoveQuestion: (questionId: string) => void;
  onUpdateSectionName: (name: string) => void;
  onUpdateQuestion: (
    questionId: string,
    patch: Partial<Pick<QuestionDraft, "type" | "difficulty" | "count">>,
  ) => void;
};

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  "single-choice": "Single choice",
  "multiple-choice": "Multiple choice",
  "true-false": "True / false",
  "short-text": "Short text",
  "long-text": "Long text",
};

const QUESTION_DIFFICULTY_LABELS: Record<QuestionDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export function PromptBuilderSection({
  index,
  section,
  onAddQuestion,
  onRemoveQuestion,
  onRemoveSection,
  onUpdateSectionName,
  onUpdateQuestion,
}: PromptBuilderSectionProps) {
  return (
    <SurfaceInset className="flex flex-col gap-1">
      <div className="flex items-end gap-3">
        <Field className="flex-1">
          <Input
            id={`section-name-${section.id}`}
            onChange={(event) => onUpdateSectionName(event.target.value)}
            value={section.name}
            className="bg-background border border-secondary"
          />
        </Field>
        <Button
          aria-label={`Remove section ${index + 1}`}
          onClick={onRemoveSection}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <Trash2 />
        </Button>
      </div>
      <div className="flex flex-col">
        {section.questions.map((question, questionIndex) => (
          <div key={question.id} className="p-3">
            <FieldGroup className="gap-2 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_8rem_2rem] md:items-end">
              <Field>
                <FieldLabel>Type</FieldLabel>
                <Select
                  onValueChange={(value: QuestionType) =>
                    onUpdateQuestion(question.id, {
                      type: value,
                    })
                  }
                  value={question.type}
                >
                  <SelectTrigger className="w-full">
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
              </Field>
              <Field>
                <FieldLabel>Difficulty</FieldLabel>
                <Select
                  onValueChange={(value) =>
                    onUpdateQuestion(question.id, {
                      difficulty: value as QuestionDifficulty,
                    })
                  }
                  value={question.difficulty}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {QUESTION_DIFFICULTIES.map((difficulty) => (
                        <SelectItem key={difficulty} value={difficulty}>
                          {QUESTION_DIFFICULTY_LABELS[difficulty]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Count</FieldLabel>
                <Input
                  inputMode="numeric"
                  min={1}
                  onChange={(event) =>
                    onUpdateQuestion(question.id, {
                      count: Number(event.target.value),
                    })
                  }
                  type="number"
                  value={question.count}
                />
              </Field>
              <Button
                aria-label={`Remove question group ${questionIndex + 1}`}
                onClick={() => onRemoveQuestion(question.id)}
                size="icon-sm"
                type="button"
                variant="ghost"
              >
                <Trash2 />
              </Button>
            </FieldGroup>
          </div>
        ))}
      </div>
      <Button onClick={onAddQuestion} type="button" variant="secondary">
        <CopyPlus data-icon="inline-start" />
        Add question group
      </Button>
    </SurfaceInset>
  );
}
