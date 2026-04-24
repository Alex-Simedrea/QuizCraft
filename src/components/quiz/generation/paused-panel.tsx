import { AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

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
    <section className="bg-secondary rounded-4xl p-3">
      <div className="bg-background rounded-2xl px-5 p-3 flex flex-col gap-4">
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
      </div>
    </section>
  );
}
