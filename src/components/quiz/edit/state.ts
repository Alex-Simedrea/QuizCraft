import type { QuestionDifficulty, QuestionType } from "@/lib/quiz/draft";
import { QUESTION_DIFFICULTIES, QUESTION_TYPES } from "@/lib/quiz/draft";
import type { QuizQuestion, QuizSection } from "@/lib/quiz/preview";

import type {
  EditorAnswer,
  EditorChoiceQuestion,
  EditorMultiSelectQuestion,
  EditorQuestion,
  EditorSection,
} from "./types";

const DEFAULT_ANSWERS = ["Option 1", "Option 2", "Option 3", "Option 4"];

export function createId() {
  return crypto.randomUUID();
}

export function isQuestionType(value: string): value is QuestionType {
  return QUESTION_TYPES.includes(value as QuestionType);
}

export function isQuestionDifficulty(
  value: string,
): value is QuestionDifficulty {
  return QUESTION_DIFFICULTIES.includes(value as QuestionDifficulty);
}

function makeAnswer(value: string): EditorAnswer {
  return { id: createId(), value };
}

function makeAnswersFromStrings(values: string[]): EditorAnswer[] {
  return values.map((value) => makeAnswer(value));
}

function ensureFourEditorAnswers(
  answers?: EditorAnswer[] | string[],
): EditorAnswer[] {
  return DEFAULT_ANSWERS.map((fallback, index) => {
    const existing = answers?.[index];
    if (existing === undefined) return makeAnswer(fallback);
    if (typeof existing === "string") return makeAnswer(existing);
    return existing;
  });
}

export function createDefaultQuestion(): EditorQuestion {
  const answers = ensureFourEditorAnswers();
  return {
    id: createId(),
    type: "single-choice",
    prompt: "New question",
    difficulty: "medium",
    explanation: "Explain why the answer is correct.",
    answers,
    correctAnswerId: answers[0]!.id,
  };
}

export function createDefaultSection(index: number): EditorSection {
  return {
    id: createId(),
    name: `Section ${index}`,
    questions: [createDefaultQuestion()],
  };
}

export function cloneQuestion(question: EditorQuestion): EditorQuestion {
  const id = createId();
  switch (question.type) {
    case "single-choice": {
      const answers = question.answers.map((answer) => ({
        id: createId(),
        value: answer.value,
      }));
      const previousIndex = question.answers.findIndex(
        (answer) => answer.id === question.correctAnswerId,
      );
      const correctIndex = previousIndex >= 0 ? previousIndex : 0;
      return {
        ...question,
        id,
        answers,
        correctAnswerId: answers[correctIndex]!.id,
      };
    }
    case "multiple-choice": {
      const answers = question.answers.map((answer) => ({
        id: createId(),
        value: answer.value,
      }));
      const correctIndices = question.correctAnswerIds
        .map((correctId) =>
          question.answers.findIndex((answer) => answer.id === correctId),
        )
        .filter((index) => index >= 0);
      return {
        ...question,
        id,
        answers,
        correctAnswerIds: correctIndices.map((index) => answers[index]!.id),
      };
    }
    case "true-false":
      return { ...question, id };
    case "short-text":
      return {
        ...question,
        id,
        acceptableAnswers: question.acceptableAnswers.map((answer) => ({
          id: createId(),
          value: answer.value,
        })),
      };
    case "long-text":
      return {
        ...question,
        id,
        rubricPoints: question.rubricPoints.map((answer) => ({
          id: createId(),
          value: answer.value,
        })),
      };
  }
}

export function cloneSection(section: EditorSection): EditorSection {
  return {
    ...section,
    id: createId(),
    name: `${section.name} copy`,
    questions: section.questions.map((question) => cloneQuestion(question)),
  };
}

function getQuestionAnswers(
  question: EditorQuestion,
): EditorAnswer[] | undefined {
  if (
    question.type === "single-choice" ||
    question.type === "multiple-choice"
  ) {
    return question.answers;
  }
  return undefined;
}

export function convertQuestionType(
  question: EditorQuestion,
  type: QuestionType,
): EditorQuestion {
  const base = {
    id: question.id,
    prompt: question.prompt,
    difficulty: question.difficulty,
    explanation: question.explanation,
  };
  const answers = ensureFourEditorAnswers(getQuestionAnswers(question));
  const previousSingleId =
    question.type === "single-choice" ? question.correctAnswerId : undefined;
  const previousMultipleIds =
    question.type === "multiple-choice" ? question.correctAnswerIds : [];

  function resolveId(id: string | undefined) {
    if (!id) return answers[0]!.id;
    const match = answers.find((answer) => answer.id === id);
    return match?.id ?? answers[0]!.id;
  }

  switch (type) {
    case "single-choice": {
      const firstId =
        previousMultipleIds[0] ?? previousSingleId ?? answers[0]!.id;
      return {
        ...base,
        type,
        answers,
        correctAnswerId: resolveId(firstId),
      };
    }
    case "multiple-choice": {
      const fromExisting = previousMultipleIds
        .map((id) => answers.find((answer) => answer.id === id)?.id)
        .filter((value): value is string => typeof value === "string");
      if (fromExisting.length >= 2) {
        return {
          ...base,
          type,
          answers,
          correctAnswerIds: fromExisting,
        };
      }
      const fallbackFirst = previousSingleId
        ? resolveId(previousSingleId)
        : answers[0]!.id;
      const fallbackSecond =
        answers.find((answer) => answer.id !== fallbackFirst)?.id ??
        answers[0]!.id;
      return {
        ...base,
        type,
        answers,
        correctAnswerIds: [fallbackFirst, fallbackSecond],
      };
    }
    case "true-false":
      return {
        ...base,
        type,
        correctAnswer:
          question.type === "true-false" ? question.correctAnswer : true,
      };
    case "short-text":
      return {
        ...base,
        type,
        acceptableAnswers:
          question.type === "short-text"
            ? question.acceptableAnswers
            : [makeAnswer("Accepted answer")],
      };
    case "long-text":
      return {
        ...base,
        type,
        sampleAnswer:
          question.type === "long-text"
            ? question.sampleAnswer
            : "Sample long-form answer.",
        rubricPoints:
          question.type === "long-text"
            ? question.rubricPoints
            : [makeAnswer("Covers the key idea.")],
      };
  }
}

export function findEditorQuestion(
  sections: EditorSection[],
  questionId: string,
) {
  for (const section of sections) {
    const index = section.questions.findIndex((q) => q.id === questionId);
    if (index >= 0) {
      return {
        section,
        questionIndex: index,
        question: section.questions[index] as EditorQuestion,
      };
    }
  }
  return null;
}

export function toEditorQuestion(question: QuizQuestion): EditorQuestion {
  switch (question.type) {
    case "single-choice": {
      const answers = makeAnswersFromStrings(question.answers);
      const correctIndex = Math.min(
        Math.max(question.correctAnswerIndex, 0),
        answers.length - 1,
      );
      return {
        id: question.id,
        type: "single-choice",
        prompt: question.prompt,
        difficulty: question.difficulty,
        explanation: question.explanation,
        answers,
        correctAnswerId: answers[correctIndex]?.id ?? answers[0]!.id,
      };
    }
    case "multiple-choice": {
      const answers = makeAnswersFromStrings(question.answers);
      const correctAnswerIds = question.correctAnswerIndices
        .map((index) => answers[index]?.id)
        .filter((id): id is string => typeof id === "string");
      return {
        id: question.id,
        type: "multiple-choice",
        prompt: question.prompt,
        difficulty: question.difficulty,
        explanation: question.explanation,
        answers,
        correctAnswerIds,
      };
    }
    case "true-false":
      return {
        id: question.id,
        type: "true-false",
        prompt: question.prompt,
        difficulty: question.difficulty,
        explanation: question.explanation,
        correctAnswer: question.correctAnswer,
      };
    case "short-text":
      return {
        id: question.id,
        type: "short-text",
        prompt: question.prompt,
        difficulty: question.difficulty,
        explanation: question.explanation,
        acceptableAnswers: makeAnswersFromStrings(question.acceptableAnswers),
      };
    case "long-text":
      return {
        id: question.id,
        type: "long-text",
        prompt: question.prompt,
        difficulty: question.difficulty,
        explanation: question.explanation,
        sampleAnswer: question.sampleAnswer,
        rubricPoints: makeAnswersFromStrings(question.rubricPoints),
      };
  }
}

export function fromEditorQuestion(question: EditorQuestion): QuizQuestion {
  switch (question.type) {
    case "single-choice": {
      const answers = question.answers.map((answer) => answer.value);
      const correctIndex = question.answers.findIndex(
        (answer) => answer.id === question.correctAnswerId,
      );
      return {
        id: question.id,
        type: "single-choice",
        prompt: question.prompt,
        difficulty: question.difficulty,
        explanation: question.explanation,
        answers,
        correctAnswerIndex: Math.max(correctIndex, 0),
      };
    }
    case "multiple-choice": {
      const answers = question.answers.map((answer) => answer.value);
      const correctAnswerIndices = question.correctAnswerIds
        .map((id) => question.answers.findIndex((answer) => answer.id === id))
        .filter((index) => index >= 0)
        .sort((a, b) => a - b);
      return {
        id: question.id,
        type: "multiple-choice",
        prompt: question.prompt,
        difficulty: question.difficulty,
        explanation: question.explanation,
        answers,
        correctAnswerIndices,
      };
    }
    case "true-false":
      return {
        id: question.id,
        type: "true-false",
        prompt: question.prompt,
        difficulty: question.difficulty,
        explanation: question.explanation,
        correctAnswer: question.correctAnswer,
      };
    case "short-text":
      return {
        id: question.id,
        type: "short-text",
        prompt: question.prompt,
        difficulty: question.difficulty,
        explanation: question.explanation,
        acceptableAnswers: question.acceptableAnswers.map(
          (answer) => answer.value,
        ),
      };
    case "long-text":
      return {
        id: question.id,
        type: "long-text",
        prompt: question.prompt,
        difficulty: question.difficulty,
        explanation: question.explanation,
        sampleAnswer: question.sampleAnswer,
        rubricPoints: question.rubricPoints.map((answer) => answer.value),
      };
  }
}

export function toEditorSections(sections: QuizSection[]): EditorSection[] {
  return sections.map((section) => ({
    id: section.id,
    name: section.name,
    questions: section.questions.map((question) => toEditorQuestion(question)),
  }));
}

export function fromEditorSections(sections: EditorSection[]): QuizSection[] {
  return sections.map((section) => ({
    id: section.id,
    name: section.name,
    questions: section.questions.map((question) =>
      fromEditorQuestion(question),
    ),
  }));
}

export function updateChoiceAnswerValue(
  question: EditorChoiceQuestion | EditorMultiSelectQuestion,
  answerId: string,
  value: string,
): EditorChoiceQuestion | EditorMultiSelectQuestion {
  return {
    ...question,
    answers: question.answers.map((answer) =>
      answer.id === answerId ? { ...answer, value } : answer,
    ),
  };
}

export function addAnswer(
  items: EditorAnswer[],
  value: string,
): EditorAnswer[] {
  return [...items, makeAnswer(value)];
}

export function removeAnswer(
  items: EditorAnswer[],
  answerId: string,
): EditorAnswer[] {
  return items.filter((answer) => answer.id !== answerId);
}

export function updateAnswerValue(
  items: EditorAnswer[],
  answerId: string,
  value: string,
): EditorAnswer[] {
  return items.map((answer) =>
    answer.id === answerId ? { ...answer, value } : answer,
  );
}
