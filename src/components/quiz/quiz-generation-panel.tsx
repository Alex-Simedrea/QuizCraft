"use client";

import { CheckCircle2, LoaderCircle } from "lucide-react";

import {
  getGenerationLabel,
  getGenerationLabelFromRequest,
  type QuizDraftSnapshot,
  type QuizGenerationChunk,
} from "@/lib/quiz-preview";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

type QuizGenerationPanelProps = {
  completedChunkIds: Set<string>;
  currentChunkId: string | null;
  progressValue: number;
  snapshot: QuizDraftSnapshot;
  chunks: QuizGenerationChunk[];
};

export function QuizGenerationPanel({
  completedChunkIds,
  currentChunkId,
  progressValue,
  snapshot,
  chunks,
}: QuizGenerationPanelProps) {
  const completedCount = completedChunkIds.size;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.9fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Generating quiz</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">
                Chunk {Math.min(completedCount + 1, chunks.length)} of {chunks.length}
              </span>
              <Badge variant="secondary">{Math.round(progressValue)}%</Badge>
            </div>
            <Progress value={progressValue} />
          </div>
          <div className="grid gap-2">
            {chunks.map((chunk) => {
              const isDone = completedChunkIds.has(chunk.id);
              const isCurrent = currentChunkId === chunk.id;

              return (
                <div
                  className="flex items-center gap-3 rounded-3xl border bg-background px-4 py-3"
                  key={chunk.id}
                >
                  <div className="flex size-9 items-center justify-center rounded-full bg-muted">
                    {isDone ? (
                      <CheckCircle2 className="text-primary" />
                    ) : (
                      <LoaderCircle className={isCurrent ? "animate-spin text-primary" : "text-muted-foreground"} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{chunk.sectionName}</p>
                    <p className="truncate text-sm text-muted-foreground">
                      {getGenerationLabel(chunk)}
                    </p>
                  </div>
                  <Badge variant={isDone ? "default" : isCurrent ? "secondary" : "outline"}>
                    {isDone ? "Done" : isCurrent ? "Working" : "Queued"}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{snapshot.sections.length} sections</Badge>
            <Badge variant="outline">{snapshot.resourceNames.length} resources</Badge>
            <Badge variant="outline">{chunks.length} generation chunks</Badge>
          </div>
          <div className="flex flex-col gap-3">
            {snapshot.sections.map((section) => (
              <div className="rounded-3xl border bg-background px-4 py-3" key={section.id}>
                <p className="text-sm font-medium">{section.name}</p>
                <p className="pt-1 text-sm text-muted-foreground">
                  {section.groups
                    .map((group) => getGenerationLabelFromRequest(group))
                    .join(" • ")}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
