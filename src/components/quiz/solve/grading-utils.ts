import type {
  QuizAttemptAnswerValue,
  QuizAttemptQuestionResult,
  QuizQuestion,
  QuizSection,
} from "@/lib/quiz/preview";

import type { QuizAnswerValue } from "@/components/quiz/solve/answer-field";

export type QuizAnswerState = Record<string, QuizAnswerValue>;

function getCorrectAnswerLabel(question: QuizQuestion) {
  switch (question.type) {
    case "single-choice":
      return question.answers[question.correctAnswerIndex] ?? "Missing answer";
    case "multiple-choice":
      return question.correctAnswerIndices
        .map((index) => question.answers[index] ?? "Missing answer")
        .join(", ");
    case "true-false":
      return question.correctAnswer ? "True" : "False";
    case "short-text":
      return question.acceptableAnswers.join(", ");
    case "long-text":
      return question.sampleAnswer;
  }
}

function getQuestionMaxPoints(question: QuizQuestion) {
  if (question.type === "long-text") {
    return Math.max(1, question.rubricPoints.length);
  }
  return 1;
}

function normalizeIndexList(value: QuizAnswerValue | null) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value)].sort(
    (left, right) => Number(left) - Number(right),
  );
}

function gradeChoiceQuestion(
  question: Extract<
    QuizQuestion,
    { type: "single-choice" | "multiple-choice" | "true-false" }
  >,
  answer: QuizAnswerValue | null,
): QuizAttemptQuestionResult {
  let correct = false;

  if (question.type === "single-choice") {
    correct =
      typeof answer === "string" &&
      Number(answer) === question.correctAnswerIndex;
  } else if (question.type === "multiple-choice") {
    const expected = [...question.correctAnswerIndices]
      .sort((left, right) => left - right)
      .map(String);
    correct =
      JSON.stringify(normalizeIndexList(answer)) === JSON.stringify(expected);
  } else {
    correct =
      typeof answer === "string" &&
      (answer === "true") === question.correctAnswer;
  }

  return {
    correct,
    correctAnswer: getCorrectAnswerLabel(question),
    earnedPoints: correct ? 1 : 0,
    feedback: "",
    maxPoints: 1,
    questionId: question.id,
    type: question.type,
    userAnswer:
      typeof answer === "string" || Array.isArray(answer) ? answer : null,
  };
}

function createPendingResult(
  question: Extract<QuizQuestion, { type: "short-text" | "long-text" }>,
  answer: QuizAnswerValue | null,
): QuizAttemptQuestionResult {
  const maxPoints = getQuestionMaxPoints(question);

  return {
    correct: false,
    correctAnswer: getCorrectAnswerLabel(question),
    earnedPoints: 0,
    feedback: "Waiting for model review.",
    maxPoints,
    questionId: question.id,
    type: question.type,
    userAnswer:
      typeof answer === "string" || Array.isArray(answer) ? answer : null,
  };
}

export function isPendingTextResult(
  result: QuizAttemptQuestionResult | undefined,
  forcePendingTextReview = false,
) {
  return (
    Boolean(result) &&
    (result?.type === "short-text" || result?.type === "long-text") &&
    (forcePendingTextReview ||
      result.feedback === "Waiting for model review." ||
      result.feedback === "This answer still needs model review.")
  );
}

export function hasPendingTextReview(results: QuizAttemptQuestionResult[]) {
  return results.some((result) => isPendingTextResult(result));
}

export function buildImmediateResults(
  sections: QuizSection[],
  answers: QuizAnswerState,
) {
  return sections.flatMap((section) =>
    section.questions.map((question) => {
      const answer = answers[question.id] ?? null;
      if (
        question.type === "single-choice" ||
        question.type === "multiple-choice" ||
        question.type === "true-false"
      ) {
        return gradeChoiceQuestion(question, answer);
      }

      return createPendingResult(question, answer);
    }),
  );
}

export function toSubmitAnswers(answers: QuizAnswerState) {
  return Object.fromEntries(
    Object.entries(answers).filter(
      (entry): entry is [string, QuizAttemptAnswerValue] =>
        typeof entry[1] === "string" || Array.isArray(entry[1]),
    ),
  );
}

