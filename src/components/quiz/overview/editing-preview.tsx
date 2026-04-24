import { Button } from "@/components/ui/button";
import { Surface, SurfaceInset } from "@/components/ui/surface";

type QuizEditingPreviewProps = {
  onBack: () => void;
  onStartSolving: () => void;
};

export function QuizEditingPreview({
  onBack,
  onStartSolving,
}: QuizEditingPreviewProps) {
  return (
    <Surface className="flex flex-col gap-4">
      <SurfaceInset className="px-5 py-4">
        <h2 className="text-lg font-semibold">Edit quiz</h2>
      </SurfaceInset>
      <SurfaceInset className="flex flex-col gap-4 px-5 py-5">
        <p className="text-muted-foreground text-sm">
          The editor slice will reuse this persisted quiz record, so the loading
          and solving flow no longer needs to change when editing lands.
        </p>
        <div className="flex gap-3">
          <Button onClick={onBack} type="button" variant="outline">
            Back to overview
          </Button>
          <Button onClick={onStartSolving} type="button">
            Start solving instead
          </Button>
        </div>
      </SurfaceInset>
    </Surface>
  );
}
