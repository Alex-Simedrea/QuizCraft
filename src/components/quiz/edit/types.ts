import type { QuestionDifficulty, QuestionType } from "@/lib/quiz/draft";

export type AnswerKind = "choice" | "acceptable-answer" | "rubric-point";

export type EditorAnswer = {
  id: string;
  value: string;
};

export type EditorChoiceQuestion = {
  id: string;
  type: "single-choice";
  prompt: string;
  difficulty: QuestionDifficulty;
  explanation: string;
  answers: EditorAnswer[];
  correctAnswerId: string;
};

export type EditorMultiSelectQuestion = {
  id: string;
  type: "multiple-choice";
  prompt: string;
  difficulty: QuestionDifficulty;
  explanation: string;
  answers: EditorAnswer[];
  correctAnswerIds: string[];
};

export type EditorTrueFalseQuestion = {
  id: string;
  type: "true-false";
  prompt: string;
  difficulty: QuestionDifficulty;
  explanation: string;
  correctAnswer: boolean;
};

export type EditorShortTextQuestion = {
  id: string;
  type: "short-text";
  prompt: string;
  difficulty: QuestionDifficulty;
  explanation: string;
  acceptableAnswers: EditorAnswer[];
};

export type EditorLongTextQuestion = {
  id: string;
  type: "long-text";
  prompt: string;
  difficulty: QuestionDifficulty;
  explanation: string;
  sampleAnswer: string;
  rubricPoints: EditorAnswer[];
};

export type EditorQuestion =
  | EditorChoiceQuestion
  | EditorMultiSelectQuestion
  | EditorTrueFalseQuestion
  | EditorShortTextQuestion
  | EditorLongTextQuestion;

export type EditorSection = {
  id: string;
  name: string;
  questions: EditorQuestion[];
};

export type SectionDragData = {
  type: "section";
  sectionId: string;
};

export type QuestionDragData = {
  type: "question";
  sectionId: string;
  questionId: string;
};

export type AnswerDragData = {
  type: "answer";
  kind: AnswerKind;
  questionId: string;
  answerId: string;
};

export type SectionDropTargetData = {
  type: "section-drop";
  sectionId: string;
};

export type SortableDragData =
  | SectionDragData
  | QuestionDragData
  | AnswerDragData;

export type DropTargetData = SortableDragData | SectionDropTargetData;

export const SECTION_GROUP = "sections";
export const SECTION_TYPE = "section";
export const QUESTION_TYPE = "question";
export const SECTION_DROP_TYPE = "section-drop";

export function sectionDropId(sectionId: string) {
  return `section-drop:${sectionId}`;
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  "single-choice": "Single choice",
  "multiple-choice": "Multiple choice",
  "true-false": "True / false",
  "short-text": "Short text",
  "long-text": "Long text",
};

export const SORTABLE_TRANSITION = {
  duration: 180,
  easing: "cubic-bezier(0.2, 0, 0, 1)",
  idle: true,
};

export function answerGroupId(kind: AnswerKind, questionId: string) {
  return `answers:${kind}:${questionId}`;
}
