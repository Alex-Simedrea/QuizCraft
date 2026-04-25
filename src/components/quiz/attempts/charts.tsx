"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

import { ChartEmpty } from "@/components/quiz/attempts/shell";
import type {
  QuestionTypeDatum,
  ScoreTrendDatum,
  SolverDatum,
} from "@/components/quiz/attempts/types";
import { SurfaceInset } from "@/components/ui/surface";

const scoreTrendConfig = {
  score: {
    label: "Average score",
    color: "var(--primary)",
  },
  attempts: {
    label: "Attempts",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

const solverConfig = {
  attempts: {
    label: "Attempts",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

const questionTypeConfig = {
  accuracy: {
    label: "Accuracy",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

export function AttemptsCharts({
  questionTypeData,
  scoreTrendData,
  solverData,
}: {
  questionTypeData: QuestionTypeDatum[];
  scoreTrendData: ScoreTrendDatum[];
  solverData: SolverDatum[];
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <ScoreTrendChart data={scoreTrendData} />
      <SolverMixChart data={solverData} />
      <QuestionAccuracyChart data={questionTypeData} />
    </div>
  );
}

function ScoreTrendChart({ data }: { data: ScoreTrendDatum[] }) {
  return (
    <SurfaceInset className="flex flex-col gap-4">
      <div>
        <div className="text-base font-semibold font-heading">Score trend</div>
        <div className="text-sm text-muted-foreground font-medium">
          Daily average across reviewed attempts.
        </div>
      </div>

      {data.length === 0 ? (
        <ChartEmpty message="No scored attempts match this filter." />
      ) : (
        <ChartContainer className="h-72 w-full" config={scoreTrendConfig}>
          <LineChart accessibilityLayer data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="label"
              tickLine={false}
              tickMargin={10}
            />
            <YAxis
              axisLine={false}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              tickLine={false}
              width={36}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              dataKey="score"
              dot
              stroke="var(--color-score)"
              strokeWidth={2}
              type="monotone"
            />
          </LineChart>
        </ChartContainer>
      )}
    </SurfaceInset>
  );
}

function SolverMixChart({ data }: { data: SolverDatum[] }) {
  return (
    <SurfaceInset className="flex flex-col gap-4">
      <div>
        <div className="font-heading text-base font-semibold">Solver mix</div>
        <div className="text-sm font-medium text-muted-foreground">
          Attempts by you, signed-in shared solvers, and guests.
        </div>
      </div>
      <ChartContainer className="h-72 w-full" config={solverConfig}>
        <BarChart accessibilityLayer data={data}>
          <CartesianGrid vertical={false} />
          <XAxis
            axisLine={false}
            dataKey="label"
            tickLine={false}
            tickMargin={10}
          />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey="attempts" fill="var(--primary)" radius={6} />
        </BarChart>
      </ChartContainer>
    </SurfaceInset>
  );
}

function QuestionAccuracyChart({ data }: { data: QuestionTypeDatum[] }) {
  return (
    <SurfaceInset className="flex flex-col gap-4">
      <div>
        <div className="font-heading text-base font-semibold">
          Question accuracy
        </div>
        <div className="text-sm font-medium text-muted-foreground">
          Correct-answer rate by question type in matching attempts.
        </div>
      </div>
      {data.length === 0 ? (
        <ChartEmpty message="No question results match this filter." />
      ) : (
        <ChartContainer className="h-72 w-full" config={questionTypeConfig}>
          <BarChart accessibilityLayer data={data}>
            <CartesianGrid vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="label"
              tickLine={false}
              tickMargin={10}
            />
            <YAxis
              axisLine={false}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
              tickLine={false}
              width={36}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="accuracy" fill="var(--color-accuracy)" radius={6} />
          </BarChart>
        </ChartContainer>
      )}
    </SurfaceInset>
  );
}
