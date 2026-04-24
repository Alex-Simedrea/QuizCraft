import { ExternalLink, FileText } from "lucide-react";

import { Surface, SurfaceInset } from "@/components/ui/surface";
import {
  type QuizDraftSnapshot,
  type QuizStoredResource,
} from "@/lib/quiz/preview";

type QuizStructureProps = {
  quizId: string;
  prompt: string;
  resources: QuizStoredResource[];
  sections: QuizDraftSnapshot["sections"];
};

function QuizPrompt({ prompt }: { prompt: string }) {
  return (
    <Surface className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">Prompt</h2>
      <SurfaceInset className="px-5 py-5">
        <p className="text-muted-foreground text-sm">{prompt}</p>
      </SurfaceInset>
    </Surface>
  );
}

function QuizResources({
  quizId,
  resources,
}: {
  quizId: string;
  resources: QuizStoredResource[];
}) {
  if (resources.length === 0) {
    return null;
  }

  return (
    <Surface className="w-1/3 max-xl:w-full">
      <div className="flex flex-col gap-3">
        {resources.map((resource, resourceIndex) => {
          const resourceHref = `/api/quizzes/${quizId}/resources/${resourceIndex}`;

          return (
            <a
              className="bg-background flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-muted/40"
              href={resourceHref}
              key={`${resource.name}-${resourceIndex}`}
              rel="noreferrer"
              target="_blank"
            >
              <div className="bg-muted relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border">
                {resource.kind === "image" ? (
                  <img
                    alt={resource.name}
                    className="h-full w-full object-cover"
                    src={resourceHref}
                  />
                ) : (
                  <FileText />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{resource.name}</p>
                <p className="text-muted-foreground text-xs">
                  {resource.kind === "image" ? "Image" : "Document"}
                </p>
              </div>
              <ExternalLink className="text-muted-foreground" size={16} />
            </a>
          );
        })}
      </div>
    </Surface>
  );
}

function getQuestionTypeLabel(
  type: QuizDraftSnapshot["sections"][number]["groups"][number]["type"],
) {
  switch (type) {
    case "single-choice":
      return "Single choice";
    case "multiple-choice":
      return "Multiple choice";
    case "true-false":
      return "True / false";
    case "short-text":
      return "Short text";
    case "long-text":
      return "Long text";
  }
}

function PlanMetric({
  label,
  value,
  valueClassName = "",
}: {
  label: string;
  value: string | number;
  valueClassName?: string;
}) {
  return (
    <div>
      <p className="text-muted-foreground text-sm">{label}</p>
      <div
        className={`bg-secondary mt-1 rounded-full px-4 py-3 text-sm ${valueClassName}`}
      >
        {value}
      </div>
    </div>
  );
}

function QuizSectionPlan({
  sections,
}: {
  sections: QuizDraftSnapshot["sections"];
}) {
  return (
    <Surface className="flex w-full flex-col gap-3">
      {sections.map((section, sectionIndex) => (
        <SurfaceInset className="flex flex-col gap-1" key={section.id}>
          <div className="px-1 py-1">
            <p className="text-base font-medium">
              {section.name || `Section ${sectionIndex + 1}`}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {section.groups.map((group) => (
              <div
                className="grid gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end"
                key={group.id}
              >
                <PlanMetric
                  label="Type"
                  value={getQuestionTypeLabel(group.type)}
                />
                <PlanMetric
                  label="Difficulty"
                  value={group.difficulty}
                  valueClassName="capitalize"
                />
                <PlanMetric label="Count" value={group.count} />
              </div>
            ))}
          </div>
        </SurfaceInset>
      ))}
    </Surface>
  );
}

export function QuizStructure({
  quizId,
  prompt,
  resources,
  sections,
}: QuizStructureProps) {
  return (
    <>
      <QuizPrompt prompt={prompt} />
      <div className="flex gap-3 max-xl:flex-col">
        <QuizResources quizId={quizId} resources={resources} />
        <QuizSectionPlan sections={sections} />
      </div>
    </>
  );
}
