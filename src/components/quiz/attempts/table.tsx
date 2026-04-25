"use client";

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import {
  ChevronDownIcon,
  ChevronsUpDownIcon,
  ChevronUpIcon,
  SearchXIcon,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type {
  PreparedAttempt,
  QuizScopeFilter,
  SolverFilter,
  StatusFilter,
} from "@/components/quiz/attempts/types";
import {
  getStatusLabel,
  getStatusVariant,
} from "@/components/quiz/attempts/utils";
import { Surface, SurfaceInset } from "@/components/ui/surface";

export function AttemptsTable({
  attempts,
  quizScopeFilter,
  setQuizScopeFilter,
  setSolverFilter,
  setStatusFilter,
  solverFilter,
  statusFilter,
}: {
  attempts: PreparedAttempt[];
  quizScopeFilter: QuizScopeFilter;
  setQuizScopeFilter: (value: QuizScopeFilter) => void;
  setSolverFilter: (value: SolverFilter) => void;
  setStatusFilter: (value: StatusFilter) => void;
  solverFilter: SolverFilter;
  statusFilter: StatusFilter;
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { desc: true, id: "createdAt" },
  ]);
  const columns = useMemo<ColumnDef<PreparedAttempt>[]>(
    () => [
      {
        accessorKey: "quizTitle",
        cell: ({ row }) => {
          const attempt = row.original;

          return (
            <div className="max-w-72">
              <Link
                className="block truncate font-medium hover:underline"
                href={attempt.href}
              >
                {attempt.quizTitle}
              </Link>
              <div className="text-muted-foreground">
                {attempt.attemptScope === "owned-quiz"
                  ? "Your quiz"
                  : "Shared with you"}
              </div>
            </div>
          );
        },
        header: ({ column }) => <SortableHeader column={column} label="Quiz" />,
      },
      {
        accessorKey: "takerName",
        cell: ({ row }) => {
          const attempt = row.original;

          return (
            <div className="flex flex-col gap-1">
              <span>{attempt.takerName}</span>
              <Badge variant="outline">
                {attempt.solverScope === "you"
                  ? "You"
                  : attempt.takerType === "guest"
                    ? "Guest"
                    : "External account"}
              </Badge>
            </div>
          );
        },
        header: ({ column }) => (
          <SortableHeader column={column} label="Solver" />
        ),
      },
      {
        accessorFn: (row) => getStatusLabel(row),
        cell: ({ row }) => {
          const attempt = row.original;

          return (
            <Badge variant={getStatusVariant(attempt)}>
              {getStatusLabel(attempt)}
            </Badge>
          );
        },
        header: ({ column }) => (
          <SortableHeader column={column} label="Status" />
        ),
        id: "status",
      },
      {
        accessorFn: (row) => row.score ?? -1,
        cell: ({ row }) => {
          const attempt = row.original;

          return (
            <div className="flex min-w-28 flex-col gap-2">
              <span className="font-medium">{attempt.scoreLabel}</span>
              {attempt.score !== null ? (
                <Progress value={attempt.score} />
              ) : null}
            </div>
          );
        },
        header: ({ column }) => (
          <SortableHeader column={column} label="Score" />
        ),
        id: "score",
      },
      {
        accessorKey: "createdAt",
        cell: ({ row }) => row.original.dateLabel,
        header: ({ column }) => <SortableHeader column={column} label="Date" />,
      },
    ],
    [],
  );
  const table = useReactTable({
    columns,
    data: attempts,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  return (
    <Surface>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <Select
            onValueChange={(value) => setSolverFilter(value as SolverFilter)}
            value={solverFilter}
          >
            <SelectTrigger
              aria-label="Filter by solver"
              className="bg-background"
            >
              <SelectValue placeholder="Solver" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All solvers</SelectItem>
                <SelectItem value="you">You</SelectItem>
                <SelectItem value="external">External accounts</SelectItem>
                <SelectItem value="guest">Guests</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            onValueChange={(value) =>
              setQuizScopeFilter(value as QuizScopeFilter)
            }
            value={quizScopeFilter}
          >
            <SelectTrigger
              aria-label="Filter by quiz ownership"
              className="bg-background"
            >
              <SelectValue placeholder="Quiz ownership" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All quizzes</SelectItem>
                <SelectItem value="owned-quiz">Owned by me</SelectItem>
                <SelectItem value="shared-quiz">Shared with me</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            onValueChange={(value) => setStatusFilter(value as StatusFilter)}
            value={statusFilter}
          >
            <SelectTrigger
              aria-label="Filter by status"
              className="bg-background"
            >
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="grading">Grading</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <SurfaceInset className="py-0">
          {attempts.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchXIcon />
                </EmptyMedia>
                <EmptyTitle>No matching attempts</EmptyTitle>
                <EmptyDescription>
                  Adjust the solver or status filters to show more attempts.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    className="hover:bg-transparent"
                    key={headerGroup.id}
                  >
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow className="hover:bg-transparent" key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </SurfaceInset>
      </div>
    </Surface>
  );
}

function SortableHeader({
  column,
  label,
}: {
  column: Column<PreparedAttempt, unknown>;
  label: string;
}) {
  const sorted = column.getIsSorted();
  const SortIcon =
    sorted === "asc"
      ? ChevronUpIcon
      : sorted === "desc"
        ? ChevronDownIcon
        : ChevronsUpDownIcon;

  return (
    <Button
      className="h-auto p-0 hover:bg-transparent hover:text-foreground"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      type="button"
      variant="ghost"
    >
      {label}
      <SortIcon data-icon="inline-end" />
    </Button>
  );
}
