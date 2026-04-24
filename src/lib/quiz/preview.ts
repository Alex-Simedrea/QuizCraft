import type { QuestionDifficulty, QuestionType } from "@/lib/quiz/draft";

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export type QuizDraftSnapshotGroup = {
  id: string;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  count: number;
};

export type QuizDraftSnapshotSection = {
  id: string;
  name: string;
  groups: QuizDraftSnapshotGroup[];
};

export type QuizDraftSnapshot = {
  createdAt: string;
  prompt: string;
  resourceNames: string[];
  sections: QuizDraftSnapshotSection[];
};

export type QuizOptionQuestion = {
  id: string;
  type: "single-choice";
  prompt: string;
  difficulty: QuestionDifficulty;
  explanation: string;
  answers: string[];
  correctAnswerIndex: number;
};

export type QuizMultiSelectQuestion = {
  id: string;
  type: "multiple-choice";
  prompt: string;
  difficulty: QuestionDifficulty;
  explanation: string;
  answers: string[];
  correctAnswerIndices: number[];
};

export type QuizTrueFalseQuestion = {
  id: string;
  type: "true-false";
  prompt: string;
  difficulty: QuestionDifficulty;
  explanation: string;
  correctAnswer: boolean;
};

export type QuizShortTextQuestion = {
  id: string;
  type: "short-text";
  prompt: string;
  difficulty: QuestionDifficulty;
  explanation: string;
  acceptableAnswers: string[];
};

export type QuizLongTextQuestion = {
  id: string;
  type: "long-text";
  prompt: string;
  difficulty: QuestionDifficulty;
  explanation: string;
  sampleAnswer: string;
  rubricPoints: string[];
};

export type QuizQuestion =
  | QuizOptionQuestion
  | QuizMultiSelectQuestion
  | QuizTrueFalseQuestion
  | QuizShortTextQuestion
  | QuizLongTextQuestion;

export type QuizSection = {
  id: string;
  name: string;
  questions: QuizQuestion[];
};

export type QuizStoredResource = {
  name: string;
  path: string;
  mimeType: string;
  kind: "image" | "document";
  extractedText?: string;
};

export type QuizStatus = "queued" | "generating" | "ready" | "failed";
export type QuizGenerationJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed";
export type QuizAttemptStatus = "grading" | "completed" | "failed";
export type QuizAttemptJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed";

export type QuizRecord = {
  id: string;
  title: string;
  prompt: string;
  status: QuizStatus;
  completedChunks: number;
  totalChunks: number;
  activeChunkId: string | null;
  errorMessage: string | null;
  draftSnapshot: QuizDraftSnapshot;
  resources: QuizStoredResource[];
  generatedSections: QuizSection[];
};

export type QuizAttemptAnswerValue = string | string[];

export type QuizAttemptQuestionResult = {
  questionId: string;
  type: QuizQuestion["type"];
  correct: boolean;
  earnedPoints: number;
  maxPoints: number;
  feedback: string;
  userAnswer: QuizAttemptAnswerValue | null;
  correctAnswer: string;
};

export type QuizAttemptRecord = {
  id: string;
  quizId: string;
  status: QuizAttemptStatus;
  errorMessage: string | null;
  quizTitle: string;
  quizSections: QuizSection[];
  answers: Record<string, QuizAttemptAnswerValue>;
  results: QuizAttemptQuestionResult[];
  tips: string[];
  earnedPoints: number;
  maxPoints: number;
  createdAt: string;
};

export type QuizGenerationChunk = {
  id: string;
  sectionId: string;
  sectionName: string;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  count: number;
};

export function createQuizDraftSnapshot(input: {
  prompt: string;
  resourceNames: string[];
  sections: Array<{
    id?: string;
    name: string;
    questions: Array<{
      id?: string;
      type: QuestionType;
      difficulty: QuestionDifficulty;
      count: number;
    }>;
  }>;
}): QuizDraftSnapshot {
  return {
    createdAt: new Date().toISOString(),
    prompt: input.prompt,
    resourceNames: input.resourceNames,
    sections: input.sections.map((section) => ({
      id: section.id ?? crypto.randomUUID(),
      name: section.name,
      groups: section.questions.map((question) => ({
        id: question.id ?? crypto.randomUUID(),
        type: question.type,
        difficulty: question.difficulty,
        count: question.count,
      })),
    })),
  };
}

export function createEmptyGeneratedSections(snapshot: QuizDraftSnapshot) {
  return snapshot.sections.map((section) => ({
    id: section.id,
    name: section.name,
    questions: [],
  })) satisfies QuizSection[];
}

export function getQuizGenerationChunks(snapshot: QuizDraftSnapshot) {
  return snapshot.sections.flatMap((section) =>
    section.groups.map((group) => ({
      id: group.id,
      sectionId: section.id,
      sectionName: section.name,
      type: group.type,
      difficulty: group.difficulty,
      count: group.count,
    })),
  );
}

export function getGenerationLabel(chunk: QuizGenerationChunk) {
  return getGenerationLabelFromRequest(chunk);
}

export function getGenerationLabelFromRequest(chunk: {
  type: QuestionType;
  difficulty: QuestionDifficulty;
  count: number;
}) {
  return `${chunk.count} ${capitalize(chunk.difficulty)} ${chunk.type.replace("-", " ")} question${chunk.count === 1 ? "" : "s"}`;
}

export function getQuizQuestionCount(sections: QuizSection[]) {
  return sections.reduce((sum, section) => sum + section.questions.length, 0);
}
