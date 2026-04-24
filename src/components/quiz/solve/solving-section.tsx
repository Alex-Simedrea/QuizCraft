import type {
  QuizAttemptQuestionResult,
  QuizSection,
} from "@/lib/quiz/preview";

import {
  QuizAnswerField,
  type QuizAnswerValue,
} from "@/components/quiz/solve/answer-field";
import { ExplanationCard } from "@/components/quiz/solve/explanation-card";
import { isPendingTextResult } from "@/components/quiz/solve/grading-utils";
import { ResultBadge } from "@/components/quiz/solve/result-badge";

type QuizAnswerState = Record<string, QuizAnswerValue>;

export type QuizSolvingSectionProps = {
  answers: QuizAnswerState;
  onMultipleChoiceChange: (
    questionId: string,
    optionIndex: number,
    checked: boolean,
  ) => void;
  onValueChange: (questionId: string, value: string) => void;
  pendingTextReview: boolean;
  resultsByQuestionId: Map<string, QuizAttemptQuestionResult>;
  section: QuizSection;
  submitted: boolean;
};

export function QuizSolvingSection({
  answers,
  onMultipleChoiceChange,
  onValueChange,
  pendingTextReview,
  resultsByQuestionId,
  section,
  submitted,
}: QuizSolvingSectionProps) {
  return (
    <section className="bg-secondary rounded-4xl flex flex-col gap-3 p-3">
      <div className="bg-background rounded-2xl px-5 py-4">
        <h2 className="text-lg font-semibold">{section.name}</h2>
      </div>
      {section.questions.map((question, questionIndex) => {
        const result = resultsByQuestionId.get(question.id);
        const questionPendingTextReview = isPendingTextResult(
          result,
          pendingTextReview,
        );

        return (
          <div
            className="bg-background flex flex-col gap-6 rounded-2xl p-5"
            key={question.id}
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-base font-medium">
                    {questionIndex + 1}. {question.prompt}
                  </p>
                </div>
              </div>
              <QuizAnswerField
                disabled={submitted}
                onMultipleChoiceChange={onMultipleChoiceChange}
                onValueChange={onValueChange}
                question={question}
                result={questionPendingTextReview ? undefined : result}
                value={answers[question.id]}
              />
              {submitted && result ? (
                <>
                  <ResultBadge
                    pending={questionPendingTextReview}
                    result={result}
                  />
                  <ExplanationCard
                    pending={questionPendingTextReview}
                    question={question}
                    result={result}
                  />
                </>
              ) : null}
            </div>
          </div>
        );
      })}
    </section>
  );
}
