import { ClipboardList, PencilLine, Play } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

type QuizOverviewActionsProps = {
  attemptsHref: string;
  editHref: string;
  solveHref: string;
};

export function QuizOverviewActions({
  attemptsHref,
  editHref,
  solveHref,
}: QuizOverviewActionsProps) {
  return (
    <section className="bg-secondary flex flex-col gap-2 rounded-4xl p-3">
      <Button asChild>
        <Link href={solveHref}>
          <Play data-icon="inline-start" />
          Start solving
        </Link>
      </Button>
      <Button className="bg-background" asChild variant="secondary">
        <Link href={editHref}>
          <PencilLine data-icon="inline-start" />
          Edit quiz
        </Link>
      </Button>
      <Button className="bg-background" asChild variant="secondary">
        <Link href={attemptsHref}>
          <ClipboardList data-icon="inline-start" />
          Attempts
        </Link>
      </Button>
    </section>
  );
}
