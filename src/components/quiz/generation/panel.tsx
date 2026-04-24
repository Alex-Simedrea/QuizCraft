"use client";

import { CheckCircle2, LoaderCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Surface, SurfaceInset } from "@/components/ui/surface";
import {
  getGenerationLabel,
  type QuizGenerationChunk,
} from "@/lib/quiz/preview";
import { cn } from "@/lib/utils";

type QuizGenerationPanelProps = {
  completedChunkIds: Set<string>;
  currentChunkId: string | null;
  progressValue: number;
  chunks: QuizGenerationChunk[];
};

export function QuizGenerationPanel({
  completedChunkIds,
  currentChunkId,
  progressValue,
  chunks,
}: QuizGenerationPanelProps) {
  const completedCount = completedChunkIds.size;

  return (
    <div className="flex flex-col gap-4">
      <Surface className="flex flex-col gap-3">
        <SurfaceInset className="flex flex-col gap-3 px-5 py-5">
          <h2 className="text-lg font-semibold">Generating quiz</h2>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">
                Chunk {Math.min(completedCount + 1, chunks.length)} of{" "}
                {chunks.length}
              </span>
              <Badge variant="secondary">{Math.round(progressValue)}%</Badge>
            </div>
            <Progress value={progressValue} />
          </div>
        </SurfaceInset>
        {chunks.map((chunk) => {
          const isDone = completedChunkIds.has(chunk.id);
          const isCurrent = currentChunkId === chunk.id;

          return (
            <SurfaceInset className="flex gap-3 px-5 py-5" key={chunk.id}>
              <div className="flex size-9 items-center justify-center rounded-full bg-muted">
                {isDone ? (
                  <CheckCircle2 className="text-primary" />
                ) : (
                  <LoaderCircle
                    className={cn(
                      "animate-spin",
                      isCurrent ? "text-primary" : "text-muted-foreground",
                    )}
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {chunk.sectionName}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {getGenerationLabel(chunk)}
                </p>
              </div>
            </SurfaceInset>
          );
        })}
      </Surface>
    </div>
  );
}
