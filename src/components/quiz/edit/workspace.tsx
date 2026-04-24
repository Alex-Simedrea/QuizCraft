"use client";

import { move } from "@dnd-kit/helpers";
import {
  DragDropProvider,
  DragOverlay,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { AlertCircle, Check, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { useDashboardHeader } from "@/components/dashboard/dashboard-header-context";
import { QuizEditAgentSidebar } from "@/components/quiz/edit/agent-sidebar";
import { QuizDragPreview } from "@/components/quiz/edit/drag-preview";
import { SortableSectionEditor } from "@/components/quiz/edit/section-editor";
import {
  cloneQuestion,
  cloneSection,
  createDefaultQuestion,
  createDefaultSection,
  fromEditorSections,
  toEditorSections,
} from "@/components/quiz/edit/state";
import {
  type AnswerKind,
  type DropTargetData,
  type EditorAnswer,
  type EditorQuestion,
  type EditorSection,
  type SortableDragData,
} from "@/components/quiz/edit/types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Surface } from "@/components/ui/surface";
import type { QuizEditAgentReference } from "@/lib/quiz/edit-agent/types";
import { updateQuizContentAction } from "@/lib/quiz/generation/actions";
import type { QuizRecord } from "@/lib/quiz/preview";

type QuizEditWorkspaceProps = {
  initialQuiz: QuizRecord;
};

function SaveError({ issues, message }: { issues: string[]; message: string }) {
  return (
    <Alert variant="destructive">
      <AlertCircle />
      <AlertTitle>{message}</AlertTitle>
      {issues.length > 0 ? (
        <AlertDescription>
          <ul className="list-inside list-disc">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </AlertDescription>
      ) : null}
    </Alert>
  );
}

function getAnswerList(
  question: EditorQuestion,
  kind: AnswerKind,
): EditorAnswer[] | null {
  if (
    kind === "choice" &&
    (question.type === "single-choice" || question.type === "multiple-choice")
  ) {
    return question.answers;
  }
  if (kind === "acceptable-answer" && question.type === "short-text") {
    return question.acceptableAnswers;
  }
  if (kind === "rubric-point" && question.type === "long-text") {
    return question.rubricPoints;
  }
  return null;
}

function setAnswerList(
  question: EditorQuestion,
  kind: AnswerKind,
  list: EditorAnswer[],
): EditorQuestion {
  if (
    kind === "choice" &&
    (question.type === "single-choice" || question.type === "multiple-choice")
  ) {
    return { ...question, answers: list };
  }
  if (kind === "acceptable-answer" && question.type === "short-text") {
    return { ...question, acceptableAnswers: list };
  }
  if (kind === "rubric-point" && question.type === "long-text") {
    return { ...question, rubricPoints: list };
  }
  return question;
}

export function QuizEditWorkspace({ initialQuiz }: QuizEditWorkspaceProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialQuiz.title);
  const [sections, setSections] = useState<EditorSection[]>(() =>
    toEditorSections(initialQuiz.generatedSections),
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveError, setSaveError] = useState<{
    issues: string[];
    message: string;
  } | null>(null);
  const [agentReferences, setAgentReferences] = useState<
    QuizEditAgentReference[]
  >([]);
  const [activeDrag, setActiveDrag] = useState<SortableDragData | null>(null);
  const [isSaving, startSaving] = useTransition();

  const dragSnapshotRef = useRef<{
    sections: EditorSection[];
    hasUnsavedChanges: boolean;
  } | null>(null);

  useEffect(() => {
    setTitle(initialQuiz.title);
    setSections(toEditorSections(initialQuiz.generatedSections));
    setHasUnsavedChanges(false);
    setSaveError(null);
  }, [initialQuiz]);

  function addAgentReference(reference: QuizEditAgentReference) {
    setAgentReferences((current) => {
      if (
        current.some(
          (item) => JSON.stringify(item) === JSON.stringify(reference),
        )
      ) {
        return current;
      }
      return [...current, reference];
    });
  }

  function removeAgentReference(index: number) {
    setAgentReferences((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  function applySavedQuiz(quiz: QuizRecord) {
    setTitle(quiz.title);
    setSections(toEditorSections(quiz.generatedSections));
    setHasUnsavedChanges(false);
    setSaveError(null);
    router.refresh();
  }

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  function commitTitle(nextTitle: string) {
    setTitle(nextTitle);
    setHasUnsavedChanges(true);
  }

  function commitSections(
    updater: (sections: EditorSection[]) => EditorSection[],
  ) {
    setSections((current) => {
      const next = updater(current);
      if (next === current) return current;
      return next;
    });
    setHasUnsavedChanges(true);
  }

  function updateSection(
    sectionId: string,
    updater: (section: EditorSection) => EditorSection,
  ) {
    commitSections((current) =>
      current.map((section) =>
        section.id === sectionId ? updater(section) : section,
      ),
    );
  }

  function updateQuestion(
    sectionId: string,
    questionId: string,
    updater: (question: EditorQuestion) => EditorQuestion,
  ) {
    updateSection(sectionId, (section) => ({
      ...section,
      questions: section.questions.map((question) =>
        question.id === questionId ? updater(question) : question,
      ),
    }));
  }

  function duplicateSection(sectionId: string) {
    commitSections((current) => {
      const index = current.findIndex((section) => section.id === sectionId);
      if (index < 0) return current;
      const next = [...current];
      next.splice(index + 1, 0, cloneSection(current[index] as EditorSection));
      return next;
    });
  }

  function duplicateQuestion(sectionId: string, questionId: string) {
    updateSection(sectionId, (section) => {
      const index = section.questions.findIndex((q) => q.id === questionId);
      if (index < 0) return section;
      const questions = [...section.questions];
      questions.splice(
        index + 1,
        0,
        cloneQuestion(section.questions[index] as EditorQuestion),
      );
      return { ...section, questions };
    });
  }

  function removeSection(sectionId: string) {
    commitSections((current) =>
      current.filter((section) => section.id !== sectionId),
    );
  }

  function addQuestion(sectionId: string) {
    updateSection(sectionId, (section) => ({
      ...section,
      questions: [...section.questions, createDefaultQuestion()],
    }));
  }

  function removeQuestion(sectionId: string, questionId: string) {
    updateSection(sectionId, (section) => ({
      ...section,
      questions: section.questions.filter((q) => q.id !== questionId),
    }));
  }

  function handleDragStart(event: DragStartEvent) {
    const source = event.operation.source;
    const data = (source?.data as SortableDragData | undefined) ?? null;
    dragSnapshotRef.current = { sections, hasUnsavedChanges };
    setActiveDrag(data);
  }

  function handleDragOver(event: DragOverEvent) {
    const { source, target } = event.operation;
    if (!source || !isSortable(source)) return;
    const data = source.data as SortableDragData | undefined;
    if (!data) return;

    const targetData = (target?.data as DropTargetData | undefined) ?? null;

    if (data.type === "question" && targetData?.type === "section-drop") {
      const destinationSectionId = targetData.sectionId;
      setSections((current) => {
        let movedQuestion: EditorQuestion | undefined;
        let sourceSectionId: string | undefined;
        for (const section of current) {
          const question = section.questions.find(
            (q) => q.id === data.questionId,
          );
          if (question) {
            movedQuestion = question;
            sourceSectionId = section.id;
            break;
          }
        }
        if (!movedQuestion || !sourceSectionId) return current;
        if (sourceSectionId === destinationSectionId) return current;

        const nextSections = current.map((section) => {
          if (section.id === sourceSectionId) {
            return {
              ...section,
              questions: section.questions.filter(
                (q) => q.id !== data.questionId,
              ),
            };
          }
          if (section.id === destinationSectionId) {
            return {
              ...section,
              questions: [...section.questions, movedQuestion!],
            };
          }
          return section;
        });
        setHasUnsavedChanges(true);
        return nextSections;
      });
      return;
    }

    if (data.type === "question") {
      setSections((current) => {
        const questionsByColumn: Record<string, EditorQuestion[]> =
          Object.fromEntries(current.map((s) => [s.id, s.questions]));
        const next = move(questionsByColumn, event);
        if (next === questionsByColumn) return current;
        let changed = false;
        const nextSections = current.map((section) => {
          const nextQuestions = next[section.id] ?? section.questions;
          if (nextQuestions === section.questions) return section;
          changed = true;
          return { ...section, questions: nextQuestions };
        });
        if (!changed) return current;
        setHasUnsavedChanges(true);
        return nextSections;
      });
      return;
    }

    if (data.type === "answer") {
      setSections((current) => {
        let changed = false;
        const nextSections = current.map((section) => {
          const questionIndex = section.questions.findIndex(
            (q) => q.id === data.questionId,
          );
          if (questionIndex < 0) return section;
          const question = section.questions[questionIndex]!;
          const currentList = getAnswerList(question, data.kind);
          if (!currentList) return section;
          const nextList = move(currentList, event);
          if (nextList === currentList) return section;
          changed = true;
          const nextQuestion = setAnswerList(question, data.kind, nextList);
          const nextQuestions = [...section.questions];
          nextQuestions[questionIndex] = nextQuestion;
          return { ...section, questions: nextQuestions };
        });
        if (!changed) return current;
        setHasUnsavedChanges(true);
        return nextSections;
      });
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDrag(null);
    const snapshot = dragSnapshotRef.current;
    dragSnapshotRef.current = null;

    if (event.canceled) {
      if (snapshot) {
        setSections(snapshot.sections);
        setHasUnsavedChanges(snapshot.hasUnsavedChanges);
      }
      return;
    }

    const { source } = event.operation;
    if (!source || !isSortable(source)) return;
    const data = source.data as SortableDragData | undefined;
    if (data?.type !== "section") return;

    setSections((current) => {
      const next = move(current, event);
      if (next === current) return current;
      setHasUnsavedChanges(true);
      return next;
    });
  }

  const saveableSections = useMemo(
    () => fromEditorSections(sections),
    [sections],
  );

  function saveChanges() {
    setSaveError(null);
    startSaving(async () => {
      const result = await updateQuizContentAction(initialQuiz.id, {
        sections: saveableSections,
        title,
      });

      if (!result.success) {
        setSaveError({
          issues: result.issues ?? [],
          message: result.message,
        });
        return;
      }

      applySavedQuiz(result.quiz);
    });
  }

  const headerActions = useMemo(
    () => (
      <Button
        disabled={!hasUnsavedChanges || isSaving}
        onClick={saveChanges}
        type="button"
      >
        <Check data-icon="inline-start" />
        {isSaving ? "Saving" : "Save changes"}
      </Button>
    ),
    [hasUnsavedChanges, initialQuiz.id, isSaving, saveableSections, title],
  );
  const headerConfig = useMemo(
    () => ({
      actions: headerActions,
      backButton: { label: "Back to quiz" },
      title: "Edit quiz",
      titleAlign: "left" as const,
    }),
    [headerActions],
  );

  useDashboardHeader(headerConfig);

  const compactSections = activeDrag?.type === "section";
  const compactQuestions =
    activeDrag?.type === "section" || activeDrag?.type === "question";
  const isQuestionDragActive = activeDrag?.type === "question";

  return (
    <>
      <div className="lg:pr-[24rem]">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-6 pt-20 md:p-8 md:pt-20 lg:p-10 lg:pt-20">
          <div className="flex min-w-0 flex-col gap-4">
            <Surface className="flex items-end gap-3">
              <Field>
                <FieldLabel>Quiz title</FieldLabel>
                <Input
                  className="bg-background"
                  onChange={(event) => commitTitle(event.target.value)}
                  value={title}
                />
              </Field>
            </Surface>

            {saveError ? (
              <SaveError
                issues={saveError.issues}
                message={saveError.message}
              />
            ) : null}

            <DragDropProvider
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDragStart={handleDragStart}
            >
              <div
                className={
                  compactSections
                    ? "flex flex-col gap-2"
                    : "flex flex-col gap-4"
                }
              >
                {sections.map((section, sectionIndex) => (
                  <SortableSectionEditor
                    addQuestion={addQuestion}
                    compactQuestions={compactQuestions}
                    compactSection={compactSections}
                    duplicateQuestion={duplicateQuestion}
                    duplicateSection={duplicateSection}
                    isQuestionDragActive={isQuestionDragActive}
                    key={section.id}
                    onReference={addAgentReference}
                    removeQuestion={removeQuestion}
                    removeSection={removeSection}
                    section={section}
                    sectionIndex={sectionIndex}
                    sectionsLength={sections.length}
                    updateQuestion={updateQuestion}
                    updateSection={updateSection}
                  />
                ))}

                {!compactSections ? (
                  <>
                    <Button
                      className="w-full"
                      onClick={() =>
                        commitSections((current) => [
                          ...current,
                          createDefaultSection(current.length + 1),
                        ])
                      }
                      type="button"
                      variant="secondary"
                    >
                      <Plus data-icon="inline-start" />
                      Add section
                    </Button>
                  </>
                ) : null}
              </div>

              <DragOverlay>
                <QuizDragPreview data={activeDrag} sections={sections} />
              </DragOverlay>
            </DragDropProvider>
          </div>
        </div>
      </div>
      <QuizEditAgentSidebar
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        onClearReferences={() => setAgentReferences([])}
        onQuizUpdated={applySavedQuiz}
        onRemoveReference={removeAgentReference}
        onSaveChanges={saveChanges}
        quizId={initialQuiz.id}
        references={agentReferences}
        sections={sections}
      />
    </>
  );
}
