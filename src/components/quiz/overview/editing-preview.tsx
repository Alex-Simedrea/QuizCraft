import { Button } from "@/components/ui/button";

type QuizEditingPreviewProps = {
  onBack: () => void;
  onStartSolving: () => void;
};

export function QuizEditingPreview({
  onBack,
  onStartSolving,
}: QuizEditingPreviewProps) {
  return (
    <section className="bg-secondary rounded-4xl p-3">
      <div className="bg-background rounded-3xl px-5 py-4">
        <h2 className="text-lg font-semibold">Edit quiz</h2>
      </div>
      <div className="bg-background mt-4 flex flex-col gap-4 rounded-3xl px-5 py-5">
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
      </div>
    </section>
  );
}
