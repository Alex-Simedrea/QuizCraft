import type { QuizAttemptDashboardRecord } from "@/lib/quiz/preview";

export type SolverFilter = "all" | "you" | "external" | "guest";
export type QuizScopeFilter = "all" | "owned-quiz" | "shared-quiz";
export type StatusFilter = "all" | "completed" | "grading" | "failed";

export type PreparedAttempt = QuizAttemptDashboardRecord & {
  dateLabel: string;
  href: string;
  pendingTextReview: boolean;
  score: number | null;
  scoreLabel: string;
};

export type QuizAverageInsight = {
  average: number;
  count: number;
  href: string;
  title: string;
};

export type AttemptsSummary = {
  averageScore: number | null;
  externalAttempts: number;
  failedAttempts: number;
  guestAttempts: number;
  lowestQuiz?: QuizAverageInsight;
  pendingAttempts: number;
  topQuiz?: QuizAverageInsight;
  totalAttempts: number;
};

export type ScoreTrendDatum = {
  attempts: number;
  date: string;
  label: string;
  score: number;
  sort: number;
};

export type SolverDatum = {
  attempts: number;
  label: string;
};

export type QuestionTypeDatum = {
  accuracy: number;
  label: string;
  total: number;
};
