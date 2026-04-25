"use client";

import {
  BarChart3Icon,
  SparklesIcon,
  TrendingDownIcon,
  TrophyIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Surface, SurfaceInset } from "@/components/ui/surface";
import type { QuizAttemptDashboardRecord } from "@/lib/quiz/preview";
import { cn } from "@/lib/utils";

import { AttemptsCharts } from "@/components/quiz/attempts/charts";
import { MetricCard } from "@/components/quiz/attempts/shell";
import { AttemptsTable } from "@/components/quiz/attempts/table";
import {
  type QuizScopeFilter,
  type SolverFilter,
  type StatusFilter,
} from "@/components/quiz/attempts/types";
import {
  buildAttemptsSummary,
  buildQuestionTypeData,
  buildScoreTrendData,
  buildSolverData,
  matchesSolverFilter,
  prepareAttempt,
} from "@/components/quiz/attempts/utils";

export function AttemptsDashboard({
  attempts,
  showQuizMetrics = true,
}: {
  attempts: QuizAttemptDashboardRecord[];
  showQuizMetrics?: boolean;
}) {
  const [solverFilter, setSolverFilter] = useState<SolverFilter>("all");
  const [quizScopeFilter, setQuizScopeFilter] =
    useState<QuizScopeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const preparedAttempts = useMemo(
    () => attempts.map((attempt) => prepareAttempt(attempt)),
    [attempts],
  );

  const filteredAttempts = useMemo(
    () =>
      preparedAttempts.filter((attempt) => {
        const matchesQuizScope =
          quizScopeFilter === "all" || attempt.attemptScope === quizScopeFilter;
        const matchesStatus =
          statusFilter === "all" || attempt.status === statusFilter;

        return (
          matchesSolverFilter(attempt, solverFilter) &&
          matchesQuizScope &&
          matchesStatus
        );
      }),
    [preparedAttempts, quizScopeFilter, solverFilter, statusFilter],
  );

  const summary = useMemo(
    () => buildAttemptsSummary(filteredAttempts),
    [filteredAttempts],
  );
  const scoreTrendData = useMemo(
    () => buildScoreTrendData(filteredAttempts),
    [filteredAttempts],
  );
  const solverData = useMemo(
    () => buildSolverData(filteredAttempts),
    [filteredAttempts],
  );
  const questionTypeData = useMemo(
    () => buildQuestionTypeData(filteredAttempts),
    [filteredAttempts],
  );

  if (attempts.length === 0) {
    return (
      <Surface>
        <SurfaceInset>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <BarChart3Icon />
              </EmptyMedia>
              <EmptyTitle>No attempts yet</EmptyTitle>
              <EmptyDescription>
                Attempts you make and attempts from shared quiz links will show
                up here.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </SurfaceInset>
      </Surface>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Surface className="flex flex-col gap-3">
        <div
          className={cn(
            "grid gap-3 md:grid-cols-2",
            showQuizMetrics && "xl:grid-cols-4",
          )}
        >
          <MetricCard
            description="In the current filter"
            icon={BarChart3Icon}
            title="Attempts"
            value={summary.totalAttempts.toLocaleString()}
          />
          <MetricCard
            description="Completed and reviewed attempts"
            icon={SparklesIcon}
            title="Average score"
            value={
              summary.averageScore === null ? "N/A" : `${summary.averageScore}%`
            }
          />
          {showQuizMetrics ? (
            <>
              <MetricCard
                description={
                  summary.topQuiz
                    ? `${summary.topQuiz.title} · ${summary.topQuiz.count} reviewed`
                    : "No reviewed attempts"
                }
                href={summary.topQuiz?.href}
                icon={TrophyIcon}
                title="Top quiz"
                value={summary.topQuiz ? `${summary.topQuiz.average}%` : "N/A"}
              />
              <MetricCard
                description={
                  summary.lowestQuiz
                    ? `${summary.lowestQuiz.title} · ${summary.lowestQuiz.count} reviewed`
                    : "No reviewed attempts"
                }
                href={summary.lowestQuiz?.href}
                icon={TrendingDownIcon}
                title="Lowest average"
                value={
                  summary.lowestQuiz ? `${summary.lowestQuiz.average}%` : "N/A"
                }
              />
            </>
          ) : null}
        </div>
        <AttemptsCharts
          questionTypeData={questionTypeData}
          scoreTrendData={scoreTrendData}
          solverData={solverData}
        />
      </Surface>
      <AttemptsTable
        attempts={filteredAttempts}
        quizScopeFilter={quizScopeFilter}
        setQuizScopeFilter={setQuizScopeFilter}
        setSolverFilter={setSolverFilter}
        setStatusFilter={setStatusFilter}
        solverFilter={solverFilter}
        statusFilter={statusFilter}
      />
    </div>
  );
}
