import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import {
  type QuizAttemptQuestionResult,
  type QuizQuestion,
} from "@/lib/quiz/preview";
import { cn } from "@/lib/utils";

export type QuizAnswerValue = string | string[] | boolean;

type QuizAnswerFieldProps = {
  disabled?: boolean;
  onMultipleChoiceChange: (
    questionId: string,
    optionIndex: number,
    checked: boolean,
  ) => void;
  onValueChange: (questionId: string, value: string) => void;
  question: QuizQuestion;
  result?: QuizAttemptQuestionResult;
  value: QuizAnswerValue | undefined;
};

function getChoiceTone({
  correct,
  selected,
}: {
  correct: boolean;
  selected: boolean;
}) {
  if (correct) {
    return "border-emerald-200 bg-emerald-50 text-emerald-950";
  }
  if (selected) {
    return "border-rose-200 bg-rose-50 text-rose-950";
  }
  return "border-transparent";
}

function ChoiceFields({
  correctValue,
  disabled,
  legend,
  onValueChange,
  options,
  selectedValue,
}: {
  correctValue?: string;
  disabled: boolean;
  legend: string;
  onValueChange: (value: string) => void;
  options: Array<{
    label: string;
    value: string;
  }>;
  selectedValue: string | undefined;
}) {
  return (
    <FieldSet>
      <FieldLegend className="sr-only">{legend}</FieldLegend>
      <RadioGroup
        disabled={disabled}
        onValueChange={onValueChange}
        value={selectedValue}
        className="gap-2"
      >
        {options.map((option) => (
          <Field
            className={cn(
              "rounded-2xl border px-3 py-2 transition-colors",
              correctValue === undefined
                ? "border-transparent"
                : getChoiceTone({
                    correct: option.value === correctValue,
                    selected: option.value === selectedValue,
                  }),
            )}
            key={option.value}
            orientation="horizontal"
          >
            <RadioGroupItem value={option.value} />
            <FieldLabel>{option.label}</FieldLabel>
          </Field>
        ))}
      </RadioGroup>
    </FieldSet>
  );
}

export function QuizAnswerField({
  disabled = false,
  onMultipleChoiceChange,
  onValueChange,
  question,
  result,
  value,
}: QuizAnswerFieldProps) {
  const selectedValue = typeof value === "string" ? value : undefined;
  const selectedValues = Array.isArray(value) ? value : [];

  switch (question.type) {
    case "single-choice":
      return (
        <ChoiceFields
          correctValue={
            result ? String(question.correctAnswerIndex) : undefined
          }
          disabled={disabled}
          legend="Single choice answers"
          onValueChange={(nextValue) => onValueChange(question.id, nextValue)}
          options={question.answers.map((answer, answerIndex) => ({
            label: answer,
            value: String(answerIndex),
          }))}
          selectedValue={selectedValue}
        />
      );
    case "multiple-choice":
      return (
        <FieldSet>
          <FieldLegend className="sr-only">Multiple choice answers</FieldLegend>
          <div className="flex flex-col gap-2">
            {question.answers.map((answer, answerIndex) => (
              <Field
                className={cn(
                  "rounded-2xl border px-3 py-2 transition-colors",
                  result
                    ? getChoiceTone({
                        correct:
                          question.correctAnswerIndices.includes(answerIndex),
                        selected: selectedValues.includes(String(answerIndex)),
                      })
                    : "border-transparent",
                )}
                key={`${answer}-${answerIndex}`}
                orientation="horizontal"
              >
                <Checkbox
                  checked={selectedValues.includes(String(answerIndex))}
                  disabled={disabled}
                  onCheckedChange={(checked) =>
                    onMultipleChoiceChange(
                      question.id,
                      answerIndex,
                      checked === true,
                    )
                  }
                />
                <FieldLabel>{answer}</FieldLabel>
              </Field>
            ))}
          </div>
        </FieldSet>
      );
    case "true-false":
      return (
        <ChoiceFields
          correctValue={result ? String(question.correctAnswer) : undefined}
          disabled={disabled}
          legend="True or false"
          onValueChange={(nextValue) => onValueChange(question.id, nextValue)}
          options={[
            { label: "True", value: "true" },
            { label: "False", value: "false" },
          ]}
          selectedValue={selectedValue}
        />
      );
    case "short-text":
      return (
        <Field>
          <FieldLabel className="sr-only">Short answer</FieldLabel>
          <Input
            className={cn(
              result &&
                (result.correct
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-rose-300 bg-rose-50"),
            )}
            disabled={disabled}
            onChange={(event) => onValueChange(question.id, event.target.value)}
            placeholder="Write your answer"
            value={selectedValue ?? ""}
          />
        </Field>
      );
    case "long-text":
      return (
        <Field>
          <FieldLabel className="sr-only">Long answer</FieldLabel>
          <Textarea
            className={cn(
              result &&
                (result.correct
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-rose-300 bg-rose-50"),
            )}
            disabled={disabled}
            onChange={(event) => onValueChange(question.id, event.target.value)}
            placeholder="Write your answer"
            rows={6}
            value={selectedValue ?? ""}
          />
        </Field>
      );
  }
}
