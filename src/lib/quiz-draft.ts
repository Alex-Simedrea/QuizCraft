export const QUESTION_TYPES = [
  "single-choice",
  "multiple-choice",
  "true-false",
  "short-text",
  "long-text",
] as const;

export const QUESTION_DIFFICULTIES = ["easy", "medium", "hard"] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];
export type QuestionDifficulty = (typeof QUESTION_DIFFICULTIES)[number];
export type ResourceKind = "image" | "document";

export type ContextResource = {
  id: string;
  file: File;
  kind: ResourceKind;
  name: string;
  size: number;
};

export type QuestionDraft = {
  id: string;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  count: number;
};

export type SectionDraft = {
  id: string;
  name: string;
  questions: QuestionDraft[];
};

export type QuizDraftState = {
  prompt: string;
  resources: ContextResource[];
  sections: SectionDraft[];
};

export type QuizDraftAction =
  | { type: "update-prompt"; prompt: string }
  | { type: "add-resources"; files: File[] }
  | { type: "remove-resource"; resourceId: string }
  | { type: "add-section" }
  | { type: "remove-section"; sectionId: string }
  | { type: "update-section-name"; sectionId: string; name: string }
  | { type: "add-question"; sectionId: string }
  | { type: "remove-question"; sectionId: string; questionId: string }
  | {
      type: "update-question";
      sectionId: string;
      questionId: string;
      patch: Partial<Pick<QuestionDraft, "type" | "difficulty" | "count">>;
    };

export const initialQuizDraftState: QuizDraftState = {
  prompt: "",
  resources: [],
  sections: [],
};

function createId() {
  return crypto.randomUUID();
}

function getResourceKind(file: File): ResourceKind {
  return file.type.startsWith("image/") ? "image" : "document";
}

export function createQuestionDraft(): QuestionDraft {
  return {
    id: createId(),
    type: "single-choice",
    difficulty: "medium",
    count: 1,
  };
}

export function createSectionDraft(index: number): SectionDraft {
  return {
    id: createId(),
    name: `Section ${index}`,
    questions: [createQuestionDraft()],
  };
}

function createContextResource(file: File): ContextResource {
  return {
    id: createId(),
    file,
    kind: getResourceKind(file),
    name: file.name,
    size: file.size,
  };
}

function normalizeQuestionCount(value: number) {
  if (!Number.isFinite(value) || Number.isNaN(value)) {
    return 1;
  }

  return Math.min(99, Math.max(1, Math.trunc(value)));
}

export function formatResourceSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function quizDraftReducer(
  state: QuizDraftState,
  action: QuizDraftAction,
): QuizDraftState {
  switch (action.type) {
    case "update-prompt":
      return {
        ...state,
        prompt: action.prompt,
      };
    case "add-resources":
      return {
        ...state,
        resources: [
          ...state.resources,
          ...action.files.map((file) => createContextResource(file)),
        ],
      };
    case "remove-resource":
      return {
        ...state,
        resources: state.resources.filter(
          (resource) => resource.id !== action.resourceId,
        ),
      };
    case "add-section":
      return {
        ...state,
        sections: [...state.sections, createSectionDraft(state.sections.length + 1)],
      };
    case "remove-section":
      return {
        ...state,
        sections: state.sections.filter(
          (section) => section.id !== action.sectionId,
        ),
      };
    case "update-section-name":
      return {
        ...state,
        sections: state.sections.map((section) =>
          section.id === action.sectionId
            ? {
                ...section,
                name: action.name,
              }
            : section,
        ),
      };
    case "add-question":
      return {
        ...state,
        sections: state.sections.map((section) =>
          section.id === action.sectionId
            ? {
                ...section,
                questions: [...section.questions, createQuestionDraft()],
              }
            : section,
        ),
      };
    case "remove-question":
      return {
        ...state,
        sections: state.sections.map((section) =>
          section.id === action.sectionId
            ? {
                ...section,
                questions: section.questions.filter(
                  (question) => question.id !== action.questionId,
                ),
              }
            : section,
        ),
      };
    case "update-question":
      return {
        ...state,
        sections: state.sections.map((section) =>
          section.id === action.sectionId
            ? {
                ...section,
                questions: section.questions.map((question) =>
                  question.id === action.questionId
                    ? {
                        ...question,
                        ...action.patch,
                        count:
                          action.patch.count === undefined
                            ? question.count
                            : normalizeQuestionCount(action.patch.count),
                      }
                    : question,
                ),
              }
            : section,
        ),
      };
    default:
      return state;
  }
}
