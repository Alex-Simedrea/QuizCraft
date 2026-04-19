"use client";

import { FileText, Paperclip, Plus, SendHorizonal, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useReducer, useRef, useState, useTransition } from "react";

import { PromptBuilderSection } from "@/components/dashboard/prompt-builder-section";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { formatResourceSize, initialQuizDraftState, quizDraftReducer } from "@/lib/quiz-draft";
import { createQuizDraftAction } from "@/lib/quiz-generation";
import { prepareContextResourceFile } from "@/lib/resource-upload.client";

const RESOURCE_ACCEPT = "image/*,.pdf,.docx,.txt,.md";

export function PromptBuilder() {
  const router = useRouter();
  const [state, dispatch] = useReducer(quizDraftReducer, initialQuizDraftState);
  const resourceInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [isPreparingResources, setIsPreparingResources] = useState(false);
  const [resourceError, setResourceError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<
    Record<string, string>
  >({});
  const imagePreviewUrlsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    setImagePreviewUrls((prev) => {
      const next: Record<string, string> = {};
      const keepIds = new Set<string>();

      for (const resource of state.resources) {
        if (resource.kind !== "image") continue;
        keepIds.add(resource.id);
        next[resource.id] =
          prev[resource.id] ?? URL.createObjectURL(resource.file);
      }

      for (const [resourceId, url] of Object.entries(prev)) {
        if (!keepIds.has(resourceId)) {
          URL.revokeObjectURL(url);
        }
      }

      imagePreviewUrlsRef.current = next;
      return next;
    });
  }, [state.resources]);

  useEffect(() => {
    return () => {
      for (const url of Object.values(imagePreviewUrlsRef.current)) {
        URL.revokeObjectURL(url);
      }
    };
  }, []);

  async function handleResourceChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    setResourceError(null);
    setIsPreparingResources(true);

    try {
      const preparedFiles = await Promise.all(
        files.map(async (file) => {
          try {
            return await prepareContextResourceFile(file);
          } catch {
            return file;
          }
        }),
      );

      dispatch({
        type: "add-resources",
        files: preparedFiles,
      });
    } catch {
      setResourceError("Resources could not be prepared. Try selecting them again.");
    } finally {
      setIsPreparingResources(false);
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitError(null);

    const formData = new FormData();
    formData.set("prompt", state.prompt);
    formData.set(
      "sections",
      JSON.stringify(
        state.sections.map((section) => ({
          id: section.id,
          name: section.name,
          questions: section.questions.map((question) => ({
            id: question.id,
            type: question.type,
            difficulty: question.difficulty,
            count: question.count,
          })),
        })),
      ),
    );

    for (const resource of state.resources) {
      formData.append("resources", resource.file, resource.name);
    }

    startTransition(() => {
      void (async () => {
        const result = await createQuizDraftAction(formData);

        if (!result.success) {
          setSubmitError(result.issues?.[0] ?? result.message);
          return;
        }

        router.push(`/quiz/${result.quizId}`);
      })();
    });
  }

  const canSubmit =
    state.prompt.trim().length > 0 &&
    state.sections.length > 0 &&
    !isPreparingResources;

  return (
    <form
      className="flex w-full max-w-3xl flex-col gap-4 rounded-3xl pt-[10vh]"
      onSubmit={handleSubmit}
    >
      <h1 className="pb-2 text-center text-3xl font-semibold">
        Create a new Quiz
      </h1>
      <Field>
        <Textarea
          id="quiz-prompt"
          onChange={(event) =>
            dispatch({
              type: "update-prompt",
              prompt: event.target.value,
            })
          }
          placeholder="Create anything"
          rows={6}
          value={state.prompt}
          className="bg-secondary rounded-4xl"
        />
      </Field>

      <Field className="bg-secondary rounded-4xl p-2 gap-0">
        <div className="flex flex-col gap-4">
          <input
            accept={RESOURCE_ACCEPT}
            className="sr-only"
            multiple
            onChange={handleResourceChange}
            ref={resourceInputRef}
            type="file"
          />
          {state.resources.length > 0 ? (
            <div className="flex flex-col gap-2 pb-4">
              {state.resources.map((resource) => (
                <div
                  className="bg-background flex items-center gap-3 rounded-2xl px-3 py-2.5"
                  key={resource.id}
                >
                  <div className="bg-muted relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border">
                    {resource.kind === "image" ? (
                      <img
                        alt={resource.name}
                        className="h-full w-full object-cover"
                        src={imagePreviewUrls[resource.id]}
                      />
                    ) : (
                      <FileText />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {resource.name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatResourceSize(resource.size)}
                    </p>
                  </div>
                  <Button
                    aria-label={`Remove ${resource.name}`}
                    onClick={() =>
                      dispatch({
                        type: "remove-resource",
                        resourceId: resource.id,
                      })
                    }
                    size="icon-sm"
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <Button
          disabled={isPreparingResources}
          onClick={() => resourceInputRef.current?.click()}
          type="button"
          variant="secondary"
          size="lg"
          className="bg-background"
        >
          {isPreparingResources ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <Paperclip data-icon="inline-start" />
          )}
          {isPreparingResources ? "Preparing resources" : "Add resources"}
        </Button>
        {resourceError ? (
          <p className="text-sm text-destructive">{resourceError}</p>
        ) : null}
      </Field>
      <div className="flex flex-col gap-2">
        {state.sections.length > 0
          ? state.sections.map((section, index) => (
              <PromptBuilderSection
                index={index}
                key={section.id}
                onAddQuestion={() =>
                  dispatch({
                    type: "add-question",
                    sectionId: section.id,
                  })
                }
                onRemoveQuestion={(questionId) =>
                  dispatch({
                    type: "remove-question",
                    questionId,
                    sectionId: section.id,
                  })
                }
                onRemoveSection={() =>
                  dispatch({
                    type: "remove-section",
                    sectionId: section.id,
                  })
                }
                onUpdateQuestion={(questionId, patch) =>
                  dispatch({
                    type: "update-question",
                    patch,
                    questionId,
                    sectionId: section.id,
                  })
                }
                onUpdateSectionName={(name) =>
                  dispatch({
                    type: "update-section-name",
                    name,
                    sectionId: section.id,
                  })
                }
                section={section}
              />
            ))
          : null}
        <Button
          className="w-full sm:w-auto"
          onClick={() =>
            dispatch({
              type: "add-section",
            })
          }
          type="button"
          variant="secondary"
          size="lg"
        >
          <Plus data-icon="inline-start" />
          Add section
        </Button>
      </div>
      <Button
        size="lg"
        className="font-semibold"
        disabled={!canSubmit || isPending}
      >
        {isPending ? <Spinner data-icon="inline-start" /> : null}
        Create <SendHorizonal />
      </Button>
      {submitError ? (
        <p className="text-sm text-destructive">{submitError}</p>
      ) : null}
    </form>
  );
}
