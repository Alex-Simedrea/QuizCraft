import type { QuizAttemptDashboardRecord } from "@/lib/quiz/preview";

import type {
  AttemptsSummary,
  PreparedAttempt,
  QuestionTypeDatum,
  ScoreTrendDatum,
  SolverDatum,
  SolverFilter,
} from "@/components/quiz/attempts/types";

export function hasPendingTextReview(attempt: QuizAttemptDashboardRecord) {
  return attempt.results.some(
    (result) =>
      (result.type === "short-text" || result.type === "long-text") &&
      result.feedback === "Waiting for model review.",
  );
}

export function getScore(
  attempt: QuizAttemptDashboardRecord,
  pending: boolean,
) {
  if (attempt.status === "failed" || pending || attempt.maxPoints === 0) {
    return null;
  }

  return Math.round((attempt.earnedPoints / attempt.maxPoints) * 100);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

export function getAverage(values: number[]) {
  if (values.length === 0) return null;
  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

export function getQuizHref(attempt: QuizAttemptDashboardRecord) {
  return attempt.attemptScope === "owned-quiz"
    ? `/quiz/${attempt.quizId}`
    : `/share/${attempt.quizId}`;
}

export function getSolverGroup(attempt: QuizAttemptDashboardRecord) {
  if (attempt.solverScope === "you") return "you";
  return attempt.takerType === "guest" ? "guest" : "external";
}

export function formatQuestionTypeLabel(type: string) {
  const labels: Record<string, string> = {
    "long-text": "Long text",
    "multiple-choice": "Multiple choice",
    "short-text": "Short text",
    "single-choice": "Single choice",
    "true-false": "True/false",
  };

  return labels[type] ?? type.replaceAll("-", " ");
}

export function getAttemptStateLabel(
  status: PreparedAttempt["status"],
  pendingTextReview: boolean,
) {
  if (status === "failed") return "Failed";
  if (pendingTextReview) return "Reviewing";
  if (status === "grading") return "Grading";
  return "Completed";
}

export function getStatusLabel(attempt: PreparedAttempt) {
  return getAttemptStateLabel(attempt.status, attempt.pendingTextReview);
}

export function getStatusVariant(attempt: PreparedAttempt) {
  if (attempt.status === "failed") return "destructive";
  if (attempt.status === "grading") return "secondary";
  return "outline";
}

export function prepareAttempt(
  attempt: QuizAttemptDashboardRecord,
): PreparedAttempt {
  const pendingTextReview = hasPendingTextReview(attempt);
  const score = getScore(attempt, pendingTextReview);

  return {
    ...attempt,
    dateLabel: formatDate(attempt.createdAt),
    href: `/quiz/${attempt.quizId}/attempts/${attempt.id}`,
    pendingTextReview,
    score,
    scoreLabel:
      score === null
        ? getAttemptStateLabel(attempt.status, pendingTextReview)
        : `${score}%`,
  };
}

export function buildAttemptsSummary(
  filteredAttempts: PreparedAttempt[],
): AttemptsSummary {
  const scoredAttempts = filteredAttempts.filter(
    (attempt): attempt is PreparedAttempt & { score: number } =>
      attempt.score !== null,
  );
  const scores = scoredAttempts.map((attempt) => attempt.score);
  const externalAttempts = filteredAttempts.filter(
    (attempt) => getSolverGroup(attempt) === "external",
  );
  const guestAttempts = filteredAttempts.filter(
    (attempt) => getSolverGroup(attempt) === "guest",
  );
  const pendingAttempts = filteredAttempts.filter(
    (attempt) => attempt.status === "grading",
  );
  const failedAttempts = filteredAttempts.filter(
    (attempt) => attempt.status === "failed",
  );
  const quizScores = new Map<
    string,
    {
      count: number;
      href: string;
      score: number;
      title: string;
    }
  >();

  for (const attempt of scoredAttempts) {
    const existing = quizScores.get(attempt.quizId);
    quizScores.set(attempt.quizId, {
      count: (existing?.count ?? 0) + 1,
      href: existing?.href ?? getQuizHref(attempt),
      score: (existing?.score ?? 0) + attempt.score,
      title: attempt.quizTitle,
    });
  }

  const quizAverages = [...quizScores.values()]
    .map((quiz) => ({
      ...quiz,
      average: Math.round(quiz.score / quiz.count),
    }))
    .toSorted((first, second) => second.average - first.average);

  return {
    averageScore: getAverage(scores),
    externalAttempts: externalAttempts.length,
    failedAttempts: failedAttempts.length,
    guestAttempts: guestAttempts.length,
    lowestQuiz: quizAverages.at(-1),
    pendingAttempts: pendingAttempts.length,
    topQuiz: quizAverages[0],
    totalAttempts: filteredAttempts.length,
  };
}

export function buildScoreTrendData(
  filteredAttempts: PreparedAttempt[],
): ScoreTrendDatum[] {
  const byDay = new Map<
    string,
    { attempts: number; score: number; sort: number }
  >();

  for (const attempt of filteredAttempts) {
    if (attempt.score === null) continue;

    const date = new Date(attempt.createdAt);
    const key = date.toISOString().slice(0, 10);
    const existing = byDay.get(key);

    byDay.set(key, {
      attempts: (existing?.attempts ?? 0) + 1,
      score: (existing?.score ?? 0) + attempt.score,
      sort: date.getTime(),
    });
  }

  return [...byDay.entries()]
    .map(([date, item]) => ({
      attempts: item.attempts,
      date,
      label: formatShortDate(date),
      score: Math.round(item.score / item.attempts),
      sort: item.sort,
    }))
    .toSorted((first, second) => first.sort - second.sort)
    .slice(-12);
}

export function buildSolverData(
  filteredAttempts: PreparedAttempt[],
): SolverDatum[] {
  return [
    {
      attempts: filteredAttempts.filter(
        (attempt) => getSolverGroup(attempt) === "you",
      ).length,
      label: "You",
    },
    {
      attempts: filteredAttempts.filter(
        (attempt) => getSolverGroup(attempt) === "external",
      ).length,
      label: "External",
    },
    {
      attempts: filteredAttempts.filter(
        (attempt) => getSolverGroup(attempt) === "guest",
      ).length,
      label: "Guests",
    },
  ];
}

export function buildQuestionTypeData(
  filteredAttempts: PreparedAttempt[],
): QuestionTypeDatum[] {
  const byType = new Map<string, { correct: number; total: number }>();

  for (const attempt of filteredAttempts) {
    for (const result of attempt.results) {
      const existing = byType.get(result.type);
      byType.set(result.type, {
        correct: (existing?.correct ?? 0) + (result.correct ? 1 : 0),
        total: (existing?.total ?? 0) + 1,
      });
    }
  }

  return [...byType.entries()]
    .map(([type, item]) => ({
      accuracy: Math.round((item.correct / item.total) * 100),
      label: formatQuestionTypeLabel(type),
      total: item.total,
    }))
    .toSorted((first, second) => second.total - first.total);
}

export function matchesSolverFilter(
  attempt: PreparedAttempt,
  solverFilter: SolverFilter,
) {
  return solverFilter === "all" || getSolverGroup(attempt) === solverFilter;
}
