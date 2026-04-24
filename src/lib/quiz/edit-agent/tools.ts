import { type Tool } from "ollama";
import { z } from "zod";

import { QUESTION_DIFFICULTIES } from "@/lib/quiz/draft";
import type {
  QuizEditAgentOperation,
  QuizEditAgentSectionSnapshot,
} from "@/lib/quiz/edit-agent/types";
import type { QuizQuestion, QuizSection } from "@/lib/quiz/preview";

const quizDifficultySchema = z.enum(QUESTION_DIFFICULTIES);

export const referenceSchema = z.discriminatedUnion("type", [
  z.object({
    sectionId: z.string().uuid(),
    type: z.literal("section"),
  }),
  z.object({
    questionId: z.string().uuid(),
    type: z.literal("question"),
  }),
  z.object({
    answerIndex: z.number().int().min(0),
    kind: z.enum(["choice", "acceptable-answer", "rubric-point"]),
    questionId: z.string().uuid(),
    type: z.literal("answer"),
  }),
]);

export const sendInputSchema = z.object({
  chatId: z.string().uuid().optional(),
  createChat: z.boolean().optional(),
  message: z.string().trim().min(1).max(4000),
  references: z.array(referenceSchema).max(12).default([]),
});

export const chatInputSchema = z.object({
  chatId: z.string().uuid().optional(),
  discardEmptyChatId: z.string().uuid().optional(),
});

export const undoInputSchema = z.object({
  chatId: z.string().uuid(),
  undoId: z.string().uuid(),
});

const questionBaseSchema = z.object({
  difficulty: quizDifficultySchema,
  explanation: z.string().trim().min(1),
  prompt: z.string().trim().min(1),
});

const agentSingleChoiceQuestionSchema = questionBaseSchema.extend({
  answers: z.array(z.string().trim().min(1)).length(4),
  correctAnswerIndex: z.number().int().min(0).max(3),
  type: z.literal("single-choice"),
});

const agentMultipleChoiceQuestionSchema = questionBaseSchema
  .extend({
    answers: z.array(z.string().trim().min(1)).length(4),
    correctAnswerIndices: z.array(z.number().int().min(0).max(3)).min(2).max(4),
    type: z.literal("multiple-choice"),
  })
  .superRefine((value, ctx) => {
    if (
      new Set(value.correctAnswerIndices).size !==
      value.correctAnswerIndices.length
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Multiple choice correct answers must be unique.",
        path: ["correctAnswerIndices"],
      });
    }
  });

const agentTrueFalseQuestionSchema = questionBaseSchema.extend({
  correctAnswer: z.boolean(),
  type: z.literal("true-false"),
});

const agentShortTextQuestionSchema = questionBaseSchema.extend({
  acceptableAnswers: z.array(z.string().trim().min(1)).min(1),
  type: z.literal("short-text"),
});

const agentLongTextQuestionSchema = questionBaseSchema.extend({
  rubricPoints: z.array(z.string().trim().min(1)).min(1),
  sampleAnswer: z.string().trim().min(1),
  type: z.literal("long-text"),
});

const agentQuestionSchema = z.discriminatedUnion("type", [
  agentSingleChoiceQuestionSchema,
  agentMultipleChoiceQuestionSchema,
  agentTrueFalseQuestionSchema,
  agentShortTextQuestionSchema,
  agentLongTextQuestionSchema,
]);

const persistedQuestionSchema = z.discriminatedUnion("type", [
  agentSingleChoiceQuestionSchema.extend({ id: z.string().uuid() }),
  agentMultipleChoiceQuestionSchema.extend({ id: z.string().uuid() }),
  agentTrueFalseQuestionSchema.extend({ id: z.string().uuid() }),
  agentShortTextQuestionSchema.extend({ id: z.string().uuid() }),
  agentLongTextQuestionSchema.extend({ id: z.string().uuid() }),
]);

const sectionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  questions: z.array(persistedQuestionSchema),
});

export const sectionsSchema = z
  .array(sectionSchema)
  .min(1)
  .superRefine((value, ctx) => {
    const sectionIds = new Set<string>();
    const questionIds = new Set<string>();

    value.forEach((section, sectionIndex) => {
      if (sectionIds.has(section.id)) {
        ctx.addIssue({
          code: "custom",
          message: "Section identifiers must be unique.",
          path: [sectionIndex, "id"],
        });
      }
      sectionIds.add(section.id);

      section.questions.forEach((question, questionIndex) => {
        if (questionIds.has(question.id)) {
          ctx.addIssue({
            code: "custom",
            message: "Question identifiers must be unique.",
            path: [sectionIndex, "questions", questionIndex, "id"],
          });
        }
        questionIds.add(question.id);
      });
    });
  });

const toolArgumentSchemas = {
  create_answer: z.object({
    afterAnswerIndex: z.number().int().min(0).optional(),
    kind: z.enum(["acceptable-answer", "rubric-point"]),
    questionId: z.string().uuid(),
    value: z.string().trim().min(1),
  }),
  create_question: z.object({
    afterQuestionId: z.string().uuid().optional(),
    question: agentQuestionSchema,
    sectionId: z.string().uuid(),
  }),
  create_section: z.object({
    afterSectionId: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(120),
  }),
  delete_answer: z.object({
    answerIndex: z.number().int().min(0),
    kind: z.enum(["acceptable-answer", "rubric-point"]),
    questionId: z.string().uuid(),
  }),
  delete_question: z.object({
    questionId: z.string().uuid(),
  }),
  delete_section: z.object({
    sectionId: z.string().uuid(),
  }),
  set_correct_answers: z.object({
    correctAnswer: z.boolean().optional(),
    correctAnswerIndex: z.number().int().min(0).max(3).optional(),
    correctAnswerIndices: z
      .array(z.number().int().min(0).max(3))
      .min(2)
      .max(4)
      .optional(),
    questionId: z.string().uuid(),
  }),
  update_answer: z.object({
    answerIndex: z.number().int().min(0),
    kind: z.enum(["choice", "acceptable-answer", "rubric-point"]),
    questionId: z.string().uuid(),
    value: z.string().trim().min(1),
  }),
  update_question: z.object({
    question: agentQuestionSchema,
    questionId: z.string().uuid(),
  }),
  update_quiz_title: z.object({
    title: z.string().trim().min(1).max(160),
  }),
  update_section_title: z.object({
    name: z.string().trim().min(1).max(120),
    sectionId: z.string().uuid(),
  }),
};

export type ToolName = keyof typeof toolArgumentSchemas;
export type MutableQuiz = {
  sections: QuizSection[];
  title: string;
};

export type ToolExecutionResult = {
  id?: string;
  operation: QuizEditAgentOperation;
  summary: string;
};

export const tools: Tool[] = [
  {
    type: "function",
    function: {
      name: "create_section",
      description:
        "Create a new quiz section. Use afterSectionId to insert after an existing section, otherwise appends at the end.",
      parameters: {
        type: "object",
        required: ["name"],
        properties: {
          afterSectionId: {
            type: "string",
            description: "Optional UUID of the section to insert after.",
          },
          name: { type: "string", description: "The new section title." },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_section_title",
      description: "Rename an existing section.",
      parameters: {
        type: "object",
        required: ["sectionId", "name"],
        properties: {
          name: { type: "string" },
          sectionId: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_section",
      description:
        "Delete an existing section. The quiz must keep at least one section.",
      parameters: {
        type: "object",
        required: ["sectionId"],
        properties: {
          sectionId: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_question",
      description:
        "Create a new question in a section. The question object must include all fields required by its type.",
      parameters: {
        type: "object",
        required: ["sectionId", "question"],
        properties: {
          afterQuestionId: { type: "string" },
          question: { type: "object" },
          sectionId: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_question",
      description:
        "Replace an existing question with a fully specified question object. When changing difficulty, type, or prompt meaning, also update explanation, answers, and correct-answer metadata so the whole question stays coherent. Preserve only fields that should not change.",
      parameters: {
        type: "object",
        required: ["questionId", "question"],
        properties: {
          question: { type: "object" },
          questionId: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_question",
      description: "Delete an existing question by UUID.",
      parameters: {
        type: "object",
        required: ["questionId"],
        properties: {
          questionId: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_quiz_title",
      description: "Update the saved quiz title.",
      parameters: {
        type: "object",
        required: ["title"],
        properties: {
          title: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_answer",
      description:
        "Edit one answer string by zero-based index. For choice answers, kind must be choice and the index is 0 to 3.",
      parameters: {
        type: "object",
        required: ["questionId", "kind", "answerIndex", "value"],
        properties: {
          answerIndex: { type: "number" },
          kind: {
            type: "string",
            enum: ["choice", "acceptable-answer", "rubric-point"],
          },
          questionId: { type: "string" },
          value: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_answer",
      description:
        "Add an accepted answer to a short-text question or a rubric point to a long-text question. Do not use for choice options.",
      parameters: {
        type: "object",
        required: ["questionId", "kind", "value"],
        properties: {
          afterAnswerIndex: { type: "number" },
          kind: { type: "string", enum: ["acceptable-answer", "rubric-point"] },
          questionId: { type: "string" },
          value: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_answer",
      description:
        "Delete an accepted answer from a short-text question or a rubric point from a long-text question. Do not use for choice options.",
      parameters: {
        type: "object",
        required: ["questionId", "kind", "answerIndex"],
        properties: {
          answerIndex: { type: "number" },
          kind: { type: "string", enum: ["acceptable-answer", "rubric-point"] },
          questionId: { type: "string" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_correct_answers",
      description:
        "Set correctness for a question. Use correctAnswerIndex for single-choice, correctAnswerIndices for multiple-choice, and correctAnswer for true-false.",
      parameters: {
        type: "object",
        required: ["questionId"],
        properties: {
          correctAnswer: { type: "boolean" },
          correctAnswerIndex: { type: "number" },
          correctAnswerIndices: { items: { type: "number" }, type: "array" },
          questionId: { type: "string" },
        },
      },
    },
  },
];

function findQuestion(sections: QuizSection[], questionId: string) {
  for (const section of sections) {
    const questionIndex = section.questions.findIndex(
      (question) => question.id === questionId,
    );
    if (questionIndex >= 0) {
      return {
        question: section.questions[questionIndex] as QuizQuestion,
        questionIndex,
        section,
      };
    }
  }
  return null;
}

function getAnswerList(question: QuizQuestion, kind: string) {
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

function snapshotSection(section: QuizSection): QuizEditAgentSectionSnapshot {
  return {
    id: section.id,
    name: section.name,
    questionCount: section.questions.length,
  };
}

function cloneQuestionSnapshot(question: QuizQuestion) {
  return structuredClone(question);
}

function createQuestion(question: z.infer<typeof agentQuestionSchema>) {
  return {
    id: crypto.randomUUID(),
    ...question,
  } as QuizQuestion;
}

function replaceQuestion(
  questionId: string,
  question: z.infer<typeof agentQuestionSchema>,
): QuizQuestion {
  return {
    id: questionId,
    ...question,
  } as QuizQuestion;
}

function updateQuestionInPlace(
  sections: QuizSection[],
  questionId: string,
  updater: (question: QuizQuestion) => QuizQuestion,
) {
  const match = findQuestion(sections, questionId);
  if (!match) {
    throw new Error(`Question not found: ${questionId}`);
  }

  match.section.questions[match.questionIndex] = updater(match.question);
}

function parseToolArguments(rawArguments: unknown) {
  if (typeof rawArguments !== "string") {
    return rawArguments;
  }

  return JSON.parse(rawArguments) as unknown;
}

export function getToolName(value: string | undefined): ToolName {
  if (!value || !(value in toolArgumentSchemas)) {
    throw new Error(
      `Unsupported tool "${value ?? "unknown"}". Only quiz editing tools are available.`,
    );
  }
  return value as ToolName;
}

export function executeToolCall(
  quiz: MutableQuiz,
  name: ToolName,
  rawArguments: unknown,
): ToolExecutionResult {
  const parsedArguments = parseToolArguments(rawArguments);

  switch (name) {
    case "create_section": {
      const args = toolArgumentSchemas.create_section.parse(parsedArguments);
      const section = {
        id: crypto.randomUUID(),
        name: args.name,
        questions: [],
      } satisfies QuizSection;
      const afterIndex = args.afterSectionId
        ? quiz.sections.findIndex((item) => item.id === args.afterSectionId)
        : -1;
      quiz.sections.splice(
        afterIndex >= 0 ? afterIndex + 1 : quiz.sections.length,
        0,
        section,
      );
      return {
        id: section.id,
        operation: {
          kind: "section_created",
          section: snapshotSection(section),
        },
        summary: `Created section "${section.name}".`,
      };
    }
    case "update_section_title": {
      const args =
        toolArgumentSchemas.update_section_title.parse(parsedArguments);
      const section = quiz.sections.find((item) => item.id === args.sectionId);
      if (!section) throw new Error(`Section not found: ${args.sectionId}`);
      const before = snapshotSection(section);
      section.name = args.name;
      return {
        operation: {
          after: snapshotSection(section),
          before,
          kind: "section_updated",
        },
        summary: `Renamed section "${before.name}" to "${section.name}".`,
      };
    }
    case "delete_section": {
      const args = toolArgumentSchemas.delete_section.parse(parsedArguments);
      if (quiz.sections.length <= 1) {
        throw new Error("A quiz must keep at least one section.");
      }
      const index = quiz.sections.findIndex(
        (item) => item.id === args.sectionId,
      );
      if (index < 0) throw new Error(`Section not found: ${args.sectionId}`);
      const [removed] = quiz.sections.splice(index, 1);
      return {
        operation: {
          kind: "section_deleted",
          section: snapshotSection(removed as QuizSection),
        },
        summary: `Deleted section "${removed?.name ?? args.sectionId}".`,
      };
    }
    case "create_question": {
      const args = toolArgumentSchemas.create_question.parse(parsedArguments);
      const section = quiz.sections.find((item) => item.id === args.sectionId);
      if (!section) throw new Error(`Section not found: ${args.sectionId}`);
      const question = createQuestion(args.question);
      const afterIndex = args.afterQuestionId
        ? section.questions.findIndex(
            (item) => item.id === args.afterQuestionId,
          )
        : -1;
      section.questions.splice(
        afterIndex >= 0 ? afterIndex + 1 : section.questions.length,
        0,
        question,
      );
      return {
        id: question.id,
        operation: {
          after: cloneQuestionSnapshot(question),
          kind: "question_created",
          section: snapshotSection(section),
        },
        summary: `Created ${question.type} question in "${section.name}".`,
      };
    }
    case "update_question": {
      const args = toolArgumentSchemas.update_question.parse(parsedArguments);
      const match = findQuestion(quiz.sections, args.questionId);
      if (!match) throw new Error(`Question not found: ${args.questionId}`);
      const before = cloneQuestionSnapshot(match.question);
      const after = replaceQuestion(args.questionId, args.question);
      match.section.questions[match.questionIndex] = after;
      return {
        operation: {
          after: cloneQuestionSnapshot(after),
          before,
          kind: "question_updated",
          section: snapshotSection(match.section),
        },
        summary: `Updated question ${args.questionId}.`,
      };
    }
    case "delete_question": {
      const args = toolArgumentSchemas.delete_question.parse(parsedArguments);
      const match = findQuestion(quiz.sections, args.questionId);
      if (!match) throw new Error(`Question not found: ${args.questionId}`);
      const before = cloneQuestionSnapshot(match.question);
      match.section.questions.splice(match.questionIndex, 1);
      return {
        operation: {
          before,
          kind: "question_deleted",
          section: snapshotSection(match.section),
        },
        summary: `Deleted question from "${match.section.name}".`,
      };
    }
    case "update_answer": {
      const args = toolArgumentSchemas.update_answer.parse(parsedArguments);
      const match = findQuestion(quiz.sections, args.questionId);
      if (!match) throw new Error(`Question not found: ${args.questionId}`);
      const before = cloneQuestionSnapshot(match.question);
      updateQuestionInPlace(quiz.sections, args.questionId, (question) => {
        const answers = getAnswerList(question, args.kind);
        if (!answers) {
          throw new Error(
            `Question ${question.id} does not have ${args.kind} answers.`,
          );
        }
        if (!answers[args.answerIndex]) {
          throw new Error(`Answer index ${args.answerIndex} does not exist.`);
        }
        answers[args.answerIndex] = args.value;
        return question;
      });
      const afterMatch = findQuestion(quiz.sections, args.questionId);
      return {
        operation: {
          after: cloneQuestionSnapshot(afterMatch?.question ?? match.question),
          before,
          kind: "answer_updated",
          section: snapshotSection(match.section),
        },
        summary: `Updated ${args.kind} answer ${args.answerIndex + 1}.`,
      };
    }
    case "create_answer": {
      const args = toolArgumentSchemas.create_answer.parse(parsedArguments);
      const match = findQuestion(quiz.sections, args.questionId);
      if (!match) throw new Error(`Question not found: ${args.questionId}`);
      const before = cloneQuestionSnapshot(match.question);
      updateQuestionInPlace(quiz.sections, args.questionId, (question) => {
        const answers = getAnswerList(question, args.kind);
        if (!answers) {
          throw new Error(
            `Question ${question.id} does not have ${args.kind} answers.`,
          );
        }
        const afterIndex =
          typeof args.afterAnswerIndex === "number"
            ? args.afterAnswerIndex
            : -1;
        answers.splice(
          afterIndex >= 0 ? afterIndex + 1 : answers.length,
          0,
          args.value,
        );
        return question;
      });
      const afterMatch = findQuestion(quiz.sections, args.questionId);
      return {
        operation: {
          after: cloneQuestionSnapshot(afterMatch?.question ?? match.question),
          before,
          kind: "answer_created",
          section: snapshotSection(match.section),
        },
        summary: `Added ${args.kind}.`,
      };
    }
    case "delete_answer": {
      const args = toolArgumentSchemas.delete_answer.parse(parsedArguments);
      const match = findQuestion(quiz.sections, args.questionId);
      if (!match) throw new Error(`Question not found: ${args.questionId}`);
      const before = cloneQuestionSnapshot(match.question);
      updateQuestionInPlace(quiz.sections, args.questionId, (question) => {
        const answers = getAnswerList(question, args.kind);
        if (!answers) {
          throw new Error(
            `Question ${question.id} does not have ${args.kind} answers.`,
          );
        }
        if (!answers[args.answerIndex]) {
          throw new Error(`Answer index ${args.answerIndex} does not exist.`);
        }
        if (answers.length <= 1) {
          throw new Error(`At least one ${args.kind} must remain.`);
        }
        answers.splice(args.answerIndex, 1);
        return question;
      });
      const afterMatch = findQuestion(quiz.sections, args.questionId);
      return {
        operation: {
          after: cloneQuestionSnapshot(afterMatch?.question ?? match.question),
          before,
          kind: "answer_deleted",
          section: snapshotSection(match.section),
        },
        summary: `Deleted ${args.kind} ${args.answerIndex + 1}.`,
      };
    }
    case "set_correct_answers": {
      const args =
        toolArgumentSchemas.set_correct_answers.parse(parsedArguments);
      const match = findQuestion(quiz.sections, args.questionId);
      if (!match) throw new Error(`Question not found: ${args.questionId}`);
      const before = cloneQuestionSnapshot(match.question);
      updateQuestionInPlace(quiz.sections, args.questionId, (question) => {
        if (question.type === "single-choice") {
          if (typeof args.correctAnswerIndex !== "number") {
            throw new Error(
              "correctAnswerIndex is required for single-choice questions.",
            );
          }
          return { ...question, correctAnswerIndex: args.correctAnswerIndex };
        }
        if (question.type === "multiple-choice") {
          if (!args.correctAnswerIndices) {
            throw new Error(
              "correctAnswerIndices is required for multiple-choice questions.",
            );
          }
          if (
            new Set(args.correctAnswerIndices).size !==
            args.correctAnswerIndices.length
          ) {
            throw new Error("Multiple-choice correct indices must be unique.");
          }
          return {
            ...question,
            correctAnswerIndices: [...args.correctAnswerIndices].sort(
              (a, b) => a - b,
            ),
          };
        }
        if (question.type === "true-false") {
          if (typeof args.correctAnswer !== "boolean") {
            throw new Error(
              "correctAnswer is required for true-false questions.",
            );
          }
          return { ...question, correctAnswer: args.correctAnswer };
        }
        throw new Error(
          `Question type ${question.type} does not use correct answer indices.`,
        );
      });
      const afterMatch = findQuestion(quiz.sections, args.questionId);
      return {
        operation: {
          after: cloneQuestionSnapshot(afterMatch?.question ?? match.question),
          before,
          kind: "correct_answers_updated",
          section: snapshotSection(match.section),
        },
        summary: `Updated correct answer settings for question ${args.questionId}.`,
      };
    }
    case "update_quiz_title": {
      const args = toolArgumentSchemas.update_quiz_title.parse(parsedArguments);
      const previousTitle = quiz.title;
      quiz.title = args.title;
      return {
        operation: {
          afterTitle: quiz.title,
          beforeTitle: previousTitle,
          kind: "quiz_title_updated",
        },
        summary: `Changed quiz title from "${previousTitle}" to "${quiz.title}".`,
      };
    }
  }
}
