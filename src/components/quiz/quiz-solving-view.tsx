"use client";

import { useState } from "react";

import { type QuizSection } from "@/lib/quiz-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

type QuizAnswerState = Record<string, string | string[] | boolean>;

type QuizSolvingViewProps = {
  onBack: () => void;
  sections: QuizSection[];
};

export function QuizSolvingView({ onBack, sections }: QuizSolvingViewProps) {
  const [answers, setAnswers] = useState<QuizAnswerState>({});

  function updateMultipleChoiceAnswer(
    questionId: string,
    optionIndex: number,
    checked: boolean,
  ) {
    const nextValues = Array.isArray(answers[questionId])
      ? [...answers[questionId]]
      : [];

    if (checked) {
      if (!nextValues.includes(String(optionIndex))) {
        nextValues.push(String(optionIndex));
      }
    } else {
      const index = nextValues.indexOf(String(optionIndex));

      if (index >= 0) {
        nextValues.splice(index, 1);
      }
    }

    setAnswers((prev) => ({
      ...prev,
      [questionId]: nextValues,
    }));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Solve mode</Badge>
          <Badge variant="outline">{sections.length} sections</Badge>
        </div>
        <Button onClick={onBack} type="button" variant="outline">
          Back to overview
        </Button>
      </div>
      {sections.map((section, sectionIndex) => (
        <Card key={section.id}>
          <CardHeader>
            <CardTitle>
              Section {sectionIndex + 1}: {section.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {section.questions.map((question, questionIndex) => (
              (() => {
                const answerValue = answers[question.id];
                const selectedValue =
                  typeof answerValue === "string" ? answerValue : undefined;
                const selectedValues = Array.isArray(answerValue) ? answerValue : [];

                return (
                  <div className="flex flex-col gap-4" key={question.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">
                          {questionIndex + 1}. {question.prompt}
                        </p>
                      </div>
                      <Badge variant="outline">{question.difficulty}</Badge>
                    </div>
                    {question.type === "single-choice" ? (
                      <FieldSet>
                        <FieldLegend className="sr-only">Single choice answers</FieldLegend>
                        <RadioGroup
                          onValueChange={(value) =>
                            setAnswers((prev) => ({
                              ...prev,
                              [question.id]: value,
                            }))
                          }
                          value={selectedValue}
                        >
                          {question.answers.map((answer, answerIndex) => (
                            <Field
                              key={`${question.id}-${answerIndex}`}
                              orientation="horizontal"
                            >
                              <RadioGroupItem value={String(answerIndex)} />
                              <FieldLabel>{answer}</FieldLabel>
                            </Field>
                          ))}
                        </RadioGroup>
                      </FieldSet>
                    ) : null}
                    {question.type === "multiple-choice" ? (
                      <FieldSet>
                        <FieldLegend className="sr-only">Multiple choice answers</FieldLegend>
                        <div className="flex flex-col gap-3">
                          {question.answers.map((answer, answerIndex) => (
                            <Field
                              key={`${question.id}-${answerIndex}`}
                              orientation="horizontal"
                            >
                              <Checkbox
                                checked={selectedValues.includes(String(answerIndex))}
                                onCheckedChange={(checked) =>
                                  updateMultipleChoiceAnswer(
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
                    ) : null}
                    {question.type === "true-false" ? (
                      <FieldSet>
                        <FieldLegend className="sr-only">True or false</FieldLegend>
                        <RadioGroup
                          onValueChange={(value) =>
                            setAnswers((prev) => ({
                              ...prev,
                              [question.id]: value,
                            }))
                          }
                          value={selectedValue}
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
                    ) : null}
                    {question.type === "short-text" ? (
                      <Field>
                        <FieldLabel className="sr-only">Short answer</FieldLabel>
                        <Input
                          onChange={(event) =>
                            setAnswers((prev) => ({
                              ...prev,
                              [question.id]: event.target.value,
                            }))
                          }
                          placeholder="Write your answer"
                          value={selectedValue ?? ""}
                        />
                      </Field>
                    ) : null}
                    {question.type === "long-text" ? (
                      <Field>
                        <FieldLabel className="sr-only">Long answer</FieldLabel>
                        <Textarea
                          onChange={(event) =>
                            setAnswers((prev) => ({
                              ...prev,
                              [question.id]: event.target.value,
                            }))
                          }
                          placeholder="Write your answer"
                          rows={6}
                          value={selectedValue ?? ""}
                        />
                      </Field>
                    ) : null}
                    {questionIndex < section.questions.length - 1 ? <Separator /> : null}
                  </div>
                );
              })()
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
