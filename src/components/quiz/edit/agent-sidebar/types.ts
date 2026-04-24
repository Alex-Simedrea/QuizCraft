"use client";

import type { EditorSection } from "@/components/quiz/edit/types";
import type { QuizEditAgentReference } from "@/lib/quiz/edit-agent/types";
import type { QuizRecord } from "@/lib/quiz/preview";

export type QuizEditAgentSidebarProps = {
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  onClearReferences: () => void;
  onQuizUpdated: (quiz: QuizRecord) => void;
  onRemoveReference: (index: number) => void;
  onSaveChanges: () => void;
  quizId: string;
  references: QuizEditAgentReference[];
  sections: EditorSection[];
};

export const DRAFT_CHAT_ID = "draft-new-chat";
