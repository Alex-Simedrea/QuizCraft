import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Surface, SurfaceInset } from "@/components/ui/surface";

type QuizGenerationPausedPanelProps = {
  errorMessage: string | null;
  isRetrying: boolean;
  onRetry: () => void;
};

export function QuizGenerationPausedPanel({
  errorMessage,
  isRetrying,
  onRetry,
}: QuizGenerationPausedPanelProps) {
  return (
    <Surface>
      <SurfaceInset className="flex flex-col gap-4 px-5">
        <h2 className="text-lg font-semibold">Generation paused</h2>
        <div className="bg-secondary flex items-start gap-3 rounded-3xl px-4 py-4">
          <div className="flex size-9 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              The last chunk failed validation.
            </p>
            <p className="text-muted-foreground pt-1 text-sm">
              {errorMessage ?? "Generation failed."}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button disabled={isRetrying} onClick={onRetry} type="button">
            Resume generation
          </Button>
        </div>
      </SurfaceInset>
    </Surface>
  );
}
