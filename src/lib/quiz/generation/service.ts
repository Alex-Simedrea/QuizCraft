import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import pdfParse from "@cedrugs/pdf-parse";
import { and, desc, eq } from "drizzle-orm";
import mammoth from "mammoth";
import { Ollama } from "ollama";
import { z } from "zod";

import { db, sql } from "@/db";
import { quizGenerationJobs, quizzes } from "@/db/schema";
import { createQuizOllamaClient } from "@/lib/ollama-client";
import { QUESTION_DIFFICULTIES, QUESTION_TYPES } from "@/lib/quiz/draft";
import {
  createEmptyGeneratedSections,
  createQuizDraftSnapshot,
  getQuizGenerationChunks,
  type QuizDraftSnapshot,
  type QuizGenerationJobStatus,
  type QuizQuestion,
  type QuizRecord,
  type QuizSection,
  type QuizStatus,
  type QuizStoredResource,
} from "@/lib/quiz/preview";

const quizQuestionTypeSchema = z.enum(QUESTION_TYPES);
const quizDifficultySchema = z.enum(QUESTION_DIFFICULTIES);

const requestQuestionSchema = z.object({
  id: z.string().uuid().optional(),
  type: quizQuestionTypeSchema,
  difficulty: quizDifficultySchema,
  count: z.coerce.number().int().min(1).max(99),
});

const requestSectionSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(120),
  questions: z.array(requestQuestionSchema).min(1),
});

const quizRequestSchema = z
  .object({
    prompt: z.string().trim(),
    sections: z.array(requestSectionSchema).min(1),
  })
  .superRefine((value, ctx) => {
    if (value.prompt.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Prompt is required.",
        path: ["prompt"],
      });
    }
  });

const questionBaseSchema = z.object({
  prompt: z.string().min(1),
  difficulty: quizDifficultySchema,
  explanation: z.string().min(1),
});
const quizTitleSchema = z.object({
  title: z.string().trim().min(6).max(120),
});

const singleChoiceQuestionSchema = questionBaseSchema.extend({
  type: z.literal("single-choice"),
  answers: z.array(z.string().min(1)).length(4),
  correctAnswerIndex: z.number().int().min(0).max(3),
});

const multipleChoiceQuestionSchema = questionBaseSchema
  .extend({
    type: z.literal("multiple-choice"),
    answers: z.array(z.string().min(1)).length(4),
    correctAnswerIndices: z.array(z.number().int().min(0).max(3)).min(2).max(4),
  })
  .superRefine((value, ctx) => {
    if (
      new Set(value.correctAnswerIndices).size !==
      value.correctAnswerIndices.length
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Multiple choice correctAnswerIndices must be unique.",
        path: ["correctAnswerIndices"],
      });
    }
  });

const trueFalseQuestionSchema = questionBaseSchema.extend({
  type: z.literal("true-false"),
  correctAnswer: z.boolean(),
});

const shortTextQuestionSchema = questionBaseSchema.extend({
  type: z.literal("short-text"),
  acceptableAnswers: z.array(z.string().min(1)).min(1),
});

const longTextQuestionSchema = questionBaseSchema.extend({
  type: z.literal("long-text"),
  sampleAnswer: z.string().min(1),
  rubricPoints: z.array(z.string().min(1)).min(2),
});

const generatedQuestionSchema = z.discriminatedUnion("type", [
  singleChoiceQuestionSchema,
  multipleChoiceQuestionSchema,
  trueFalseQuestionSchema,
  shortTextQuestionSchema,
  longTextQuestionSchema,
]);

const editableQuestionBaseSchema = questionBaseSchema.extend({
  id: z.string().uuid(),
});

const editableSingleChoiceQuestionSchema = editableQuestionBaseSchema.extend({
  type: z.literal("single-choice"),
  answers: z.array(z.string().trim().min(1)).length(4),
  correctAnswerIndex: z.number().int().min(0).max(3),
});

const editableMultipleChoiceQuestionSchema = editableQuestionBaseSchema
  .extend({
    type: z.literal("multiple-choice"),
    answers: z.array(z.string().trim().min(1)).length(4),
    correctAnswerIndices: z.array(z.number().int().min(0).max(3)).min(2).max(4),
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

const editableTrueFalseQuestionSchema = editableQuestionBaseSchema.extend({
  type: z.literal("true-false"),
  correctAnswer: z.boolean(),
});

const editableShortTextQuestionSchema = editableQuestionBaseSchema.extend({
  type: z.literal("short-text"),
  acceptableAnswers: z.array(z.string().trim().min(1)).min(1),
});

const editableLongTextQuestionSchema = editableQuestionBaseSchema.extend({
  type: z.literal("long-text"),
  sampleAnswer: z.string().trim().min(1),
  rubricPoints: z.array(z.string().trim().min(1)).min(1),
});

const editableQuestionSchema = z.discriminatedUnion("type", [
  editableSingleChoiceQuestionSchema,
  editableMultipleChoiceQuestionSchema,
  editableTrueFalseQuestionSchema,
  editableShortTextQuestionSchema,
  editableLongTextQuestionSchema,
]);

const editableQuizSectionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  questions: z.array(editableQuestionSchema),
});

const editableQuizContentSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    sections: z.array(editableQuizSectionSchema).min(1),
  })
  .superRefine((value, ctx) => {
    const sectionIds = new Set<string>();
    const questionIds = new Set<string>();

    value.sections.forEach((section, sectionIndex) => {
      if (sectionIds.has(section.id)) {
        ctx.addIssue({
          code: "custom",
          message: "Section identifiers must be unique.",
          path: ["sections", sectionIndex, "id"],
        });
      }

      sectionIds.add(section.id);

      section.questions.forEach((question, questionIndex) => {
        if (questionIds.has(question.id)) {
          ctx.addIssue({
            code: "custom",
            message: "Question identifiers must be unique.",
            path: ["sections", sectionIndex, "questions", questionIndex, "id"],
          });
        }

        questionIds.add(question.id);
      });
    });
  });

type QuizRequest = z.infer<typeof quizRequestSchema>;
type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;
type QuizRequestQuestion = QuizRequest["sections"][number]["questions"][number];
type ClaimedQuizGenerationJob = {
  id: string;
  quizId: string;
  status: QuizGenerationJobStatus;
  attempts: number;
  claimedAt: Date | null;
  claimedBy: string | null;
  lastHeartbeatAt: Date | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};
type QuizGenerationRunResult =
  | {
      outcome: "completed";
      quizId: string;
      jobId: string;
    }
  | {
      outcome: "failed";
      quizId: string;
      jobId: string;
      errorMessage: string;
    };
type QuizGenerationClaimedJob = {
  attempts: number;
  jobId: string;
  quizId: string;
};

export type CreateQuizDraftResult =
  | {
      success: true;
      quizId: string;
    }
  | {
      success: false;
      message: string;
      issues?: string[];
    };

export type UpdateQuizContentResult =
  | {
      success: true;
      quiz: QuizRecord;
    }
  | {
      success: false;
      message: string;
      issues?: string[];
    };

export type UpdateQuizPublicResult =
  | {
      success: true;
      quiz: QuizRecord;
    }
  | {
      success: false;
      message: string;
    };

export type CopyPublicQuizResult =
  | {
      success: true;
      quizId: string;
    }
  | {
      success: false;
      message: string;
    };

export type DeleteQuizResult =
  | {
      success: true;
    }
  | {
      success: false;
      message: string;
    };

export const QUIZ_GENERATION_CHANNEL = "quiz_generation_jobs";
export const QUIZ_GENERATION_RECONCILE_INTERVAL_MS = 30_000;

const QUIZ_GENERATION_MODEL = "gemma4:31b-cloud";
const TEXT_FILE_EXTENSIONS = new Set([".txt", ".md"]);
const DOCX_FILE_EXTENSIONS = new Set([".docx"]);
const MAX_GROUP_GENERATION_ATTEMPTS = 3;
const QUIZ_JOB_STALE_AFTER_MS = 60_000;
const QUIZ_JOB_HEARTBEAT_INTERVAL_MS = 5_000;

function sanitizeFileName(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();
  const baseName = path
    .basename(fileName, extension)
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_.]+|[-_.]+$/g, "");

  return `${baseName || "resource"}${extension}`;
}

function getFileExtension(fileName: string) {
  return path.extname(fileName).toLowerCase();
}

function isImageMimeType(mimeType: string) {
  return mimeType.startsWith("image/");
}

function trimExtractedText(value: string, maxLength = 12000) {
  const normalized = value.replace(/\r\n/g, "\n").trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}\n\n[truncated]`;
}

function looksLikeTrueFalseQuestionPrompt(prompt: string) {
  return prompt.trim().endsWith("?");
}

function normalizePrompt(prompt: string) {
  return prompt
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/g, "");
}

function formatGenerationError(error: unknown) {
  if (error instanceof z.ZodError) {
    return error.issues
      .map((issue) => {
        const issuePath = issue.path.length > 0 ? issue.path.join(".") : "root";
        return `${issuePath}: ${issue.message}`;
      })
      .join("; ");
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown generation error.";
}

function formatQuizEditIssue(issue: { message: string; path: PropertyKey[] }) {
  const path = issue.path.join(".");

  if (path === "title") {
    return "The quiz title is required and must be 160 characters or fewer.";
  }

  if (path.endsWith(".name")) {
    return "Every section needs a name.";
  }

  if (path.endsWith(".prompt")) {
    return "Every question needs question text.";
  }

  if (path.endsWith(".explanation")) {
    return "Every question needs an explanation.";
  }

  if (path.endsWith(".answers")) {
    return "Choice questions need exactly 4 non-empty answers.";
  }

  if (path.endsWith(".correctAnswerIndex")) {
    return "Single choice questions need one correct answer.";
  }

  if (path.endsWith(".correctAnswerIndices")) {
    return "Multiple choice questions need at least two correct answers.";
  }

  if (path.endsWith(".acceptableAnswers")) {
    return "Short text questions need at least one accepted answer.";
  }

  if (path.endsWith(".sampleAnswer")) {
    return "Long text questions need a sample answer.";
  }

  if (path.endsWith(".rubricPoints")) {
    return "Long text questions need at least one rubric point.";
  }

  return issue.message;
}

function createFallbackQuizTitle(request: QuizRequest) {
  const firstSectionName = request.sections[0]?.name?.trim();

  if (firstSectionName) {
    return firstSectionName.length > 160
      ? `${firstSectionName.slice(0, 157)}...`
      : firstSectionName;
  }

  return "Generated quiz";
}

function normalizeQuizTitle(title: string) {
  return title
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/g, "")
    .slice(0, 120);
}

function getSectionRequirementsText(section: QuizRequest["sections"][number]) {
  return section.questions
    .map(
      (question, index) =>
        `${index + 1}. ${question.count} ${question.difficulty} ${question.type} question(s)`,
    )
    .join("\n");
}

function getStoredChunk(snapshot: QuizDraftSnapshot, chunkIndex: number) {
  const chunks = getQuizGenerationChunks(snapshot);
  const chunk = chunks[chunkIndex];

  if (!chunk) {
    return null;
  }

  const section = snapshot.sections.find((item) => item.id === chunk.sectionId);
  const group = section?.groups.find((item) => item.id === chunk.id);

  if (!section || !group) {
    return null;
  }

  return {
    chunk,
    section,
    group,
  };
}

async function saveUploadedFile(
  file: File,
  targetDirectory: string,
  index: number,
) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const safeName = `${String(index + 1).padStart(2, "0")}-${sanitizeFileName(file.name)}`;
  const absolutePath = path.join(targetDirectory, safeName);

  await writeFile(absolutePath, buffer);

  return {
    absolutePath,
    buffer,
    fileName: safeName,
  };
}

async function extractDocumentText(
  absolutePath: string,
  buffer: Buffer,
  fileName: string,
) {
  const extension = getFileExtension(fileName);

  if (extension === ".pdf") {
    const parsed = await pdfParse(buffer);
    return trimExtractedText(parsed.text);
  }

  if (DOCX_FILE_EXTENSIONS.has(extension)) {
    const result = await mammoth.extractRawText({ buffer });
    return trimExtractedText(result.value);
  }

  if (TEXT_FILE_EXTENSIONS.has(extension)) {
    return trimExtractedText(buffer.toString("utf8"));
  }

  throw new Error(
    `Unsupported document type for text extraction: ${extension || "unknown"}.`,
  );
}

async function saveAndProcessResources(files: File[], userId: string) {
  const batchId = crypto.randomUUID();
  const directory = path.join(
    process.cwd(),
    "storage",
    "quiz-resources",
    userId,
    batchId,
  );

  await mkdir(directory, { recursive: true });

  const resources: QuizStoredResource[] = [];

  for (const [index, file] of files.entries()) {
    const { absolutePath, buffer, fileName } = await saveUploadedFile(
      file,
      directory,
      index,
    );
    const mimeType = file.type || "application/octet-stream";
    const kind = isImageMimeType(mimeType) ? "image" : "document";

    const resource: QuizStoredResource = {
      name: file.name,
      path: absolutePath,
      mimeType,
      kind,
    };

    if (kind === "document") {
      resource.extractedText = await extractDocumentText(
        absolutePath,
        buffer,
        fileName,
      );
    }

    resources.push(resource);
  }

  return resources;
}

function getQuestionSchemaForRequest(questionRequest: QuizRequestQuestion) {
  const difficultySchema = z.literal(questionRequest.difficulty);

  switch (questionRequest.type) {
    case "single-choice":
      return singleChoiceQuestionSchema.extend({
        difficulty: difficultySchema,
      });
    case "multiple-choice":
      return multipleChoiceQuestionSchema.safeExtend({
        difficulty: difficultySchema,
      });
    case "true-false":
      return trueFalseQuestionSchema.extend({
        difficulty: difficultySchema,
      });
    case "short-text":
      return shortTextQuestionSchema.extend({
        difficulty: difficultySchema,
      });
    case "long-text":
      return longTextQuestionSchema.extend({
        difficulty: difficultySchema,
      });
  }
}

function buildQuestionGroupSchema(questionRequest: QuizRequestQuestion) {
  return z.object({
    questions: z
      .array(getQuestionSchemaForRequest(questionRequest))
      .length(questionRequest.count),
  });
}

function assertQuestionShape(question: GeneratedQuestion) {
  if (
    question.type === "true-false" &&
    looksLikeTrueFalseQuestionPrompt(question.prompt)
  ) {
    throw new Error(
      "True/false items must be declarative statements without a question mark.",
    );
  }
}

function assertNoDuplicatePrompts(
  questions: GeneratedQuestion[],
  generatedSections: QuizSection[],
) {
  const seen = new Map<string, string>();

  for (const section of generatedSections) {
    for (const question of section.questions) {
      seen.set(normalizePrompt(question.prompt), section.name);
    }
  }

  for (const question of questions) {
    const normalizedPrompt = normalizePrompt(question.prompt);
    const existingSectionName = seen.get(normalizedPrompt);

    if (existingSectionName) {
      throw new Error(
        `Duplicate question prompt detected. "${question.prompt}" already exists in section "${existingSectionName}".`,
      );
    }

    seen.set(normalizedPrompt, "current batch");
  }
}

function buildGeneratedContext(generatedSections: QuizSection[]) {
  if (generatedSections.every((section) => section.questions.length === 0)) {
    return "No prior generated sections or questions yet.";
  }

  return generatedSections
    .map((section, sectionIndex) => {
      const prompts =
        section.questions.length > 0
          ? section.questions
              .map(
                (question, questionIndex) =>
                  `${questionIndex + 1}. [${question.type} / ${question.difficulty}] ${question.prompt}`,
              )
              .join("\n")
          : "No questions generated yet in this section.";

      return `Section ${sectionIndex + 1}: ${section.name}\n${prompts}`;
    })
    .join("\n\n");
}

function buildQuestionTypeExamples() {
  return [
    "Output examples by question type:",
    `Single choice example:
{
  "type": "single-choice",
  "prompt": "Which layer of the Earth is liquid and lies beneath the mantle?",
  "difficulty": "easy",
  "answers": ["Inner core", "Outer core", "Crust", "Lithosphere"],
  "correctAnswerIndex": 1,
  "explanation": "The outer core is a liquid metal layer beneath the mantle, while the inner core is solid."
}`,
    `Multiple choice example:
{
  "type": "multiple-choice",
  "prompt": "Which of the following are prime numbers?",
  "difficulty": "easy",
  "answers": ["2", "3", "4", "5"],
  "correctAnswerIndices": [0, 1, 3],
  "explanation": "2, 3, and 5 are prime because each has exactly two positive divisors. 4 is composite."
}`,
    `True/false example:
{
  "type": "true-false",
  "prompt": "Sound travels faster in water than in air.",
  "difficulty": "easy",
  "correctAnswer": true,
  "explanation": "Sound waves move faster in water because particles are closer together than in air."
}`,
    `Short text example:
{
  "type": "short-text",
  "prompt": "What is the process by which plants make glucose using sunlight called?",
  "difficulty": "easy",
  "acceptableAnswers": ["Photosynthesis"],
  "explanation": "Photosynthesis is the process plants use to convert light energy into chemical energy in the form of glucose."
}`,
    `Long text example:
{
  "type": "long-text",
  "prompt": "Explain two causes of the French Revolution and how they contributed to public unrest.",
  "difficulty": "medium",
  "sampleAnswer": "Two major causes were severe economic inequality and the financial crisis of the monarchy. The Third Estate carried most of the tax burden while the clergy and nobility enjoyed privileges, which created resentment. At the same time, state debt, poor harvests, and rising bread prices intensified hardship, making people more likely to challenge the existing political order.",
  "rubricPoints": [
    "Identifies at least two valid causes",
    "Explains how each cause increased unrest",
    "Connects social or economic conditions to revolutionary pressure"
  ],
  "explanation": "A strong answer should connect structural inequality and economic crisis to growing dissatisfaction with the monarchy."
}`,
  ].join("\n\n");
}

function buildQuizTitlePrompt(args: {
  request: QuizRequest;
  resources: QuizStoredResource[];
}) {
  const { request, resources } = args;
  const imageResources = resources.filter(
    (resource) => resource.kind === "image",
  );
  const documentResources = resources.filter(
    (resource) => resource.kind === "document",
  );

  const documentContext = documentResources.length
    ? documentResources
        .map(
          (resource, index) =>
            `Document ${index + 1}: ${resource.name}\n${trimExtractedText(resource.extractedText ?? "", 2500)}`,
        )
        .join("\n\n")
    : "No document text provided.";
  const imageContext = imageResources.length
    ? imageResources
        .map((resource, index) => `Image ${index + 1}: ${resource.name}`)
        .join("\n")
    : "No images provided.";

  return [
    "Generate a concise, classroom-ready title for this quiz.",
    "The title must reflect both the user's prompt and the provided materials.",
    "Keep it short, specific, and readable in a sidebar.",
    "Use title case.",
    "Write the title in the same primary language as the prompt and materials.",
    "Do not translate into English unless the source content is primarily in English.",
    "If the prompt and materials are primarily in Romanian, answer in Romanian. Apply the same rule for any other language.",
    'Do not include generic prefixes or suffixes like "Quiz", "Test", "Worksheet", or "Assessment".',
    "Do not use quotation marks.",
    "Aim for roughly 3 to 8 words.",
    "Good example titles:",
    "- Romanian Constitutional Law Foundations",
    "- Human Cell Structure and Function",
    "- French Revolution Causes and Unrest",
    "- Photosynthesis and Plant Energy",
    "- World War II Strategy and Turning Points",
    "",
    "User prompt:",
    request.prompt,
    "",
    "Requested sections:",
    request.sections.map((section) => section.name).join("\n"),
    "",
    "Attached images:",
    imageContext,
    "",
    "Extracted document text:",
    documentContext,
  ].join("\n");
}

function buildQuestionGroupPrompt(args: {
  request: QuizRequest;
  resources: QuizStoredResource[];
  sectionName: string;
  questionRequest: QuizRequestQuestion;
  generatedSections: QuizSection[];
  schema: unknown;
}) {
  const {
    request,
    resources,
    sectionName,
    questionRequest,
    generatedSections,
    schema,
  } = args;
  const imageResources = resources.filter(
    (resource) => resource.kind === "image",
  );
  const documentResources = resources.filter(
    (resource) => resource.kind === "document",
  );

  const sectionsText = request.sections
    .map(
      (section, index) =>
        `Section ${index + 1}: ${section.name}\n${getSectionRequirementsText(section)}`,
    )
    .join("\n\n");

  const documentsText = documentResources.length
    ? documentResources
        .map(
          (resource, index) =>
            `Document ${index + 1}: ${resource.name}\n${resource.extractedText ?? ""}`,
        )
        .join("\n\n")
    : "No document text provided.";

  const imageText = imageResources.length
    ? imageResources
        .map((resource, index) => `Image ${index + 1}: ${resource.name}`)
        .join("\n")
    : "No images provided.";

  const currentGroupContract = [
    "Current generation task:",
    `- You are generating questions only for section "${sectionName}".`,
    `- Generate exactly ${questionRequest.count} question object(s).`,
    `- Every generated question in this batch must have type="${questionRequest.type}".`,
    `- Every generated question in this batch must have difficulty="${questionRequest.difficulty}".`,
    "- Do not generate any questions for other types or difficulties in this batch.",
    "- Do not generate more or fewer question objects than requested.",
    "- The output must be an object with a single questions array.",
  ].join("\n");

  return [
    "Generate quiz questions that strictly follow the requested structure.",
    "Return only valid JSON that matches the provided schema.",
    "Use the provided section order exactly.",
    "Write all generated content in the same primary language as the prompt and the provided materials.",
    "Do not default to English unless the source content is primarily in English.",
    "If the prompt and materials are primarily in Romanian, write the questions, answers, explanations, acceptable answers, sample answers, and rubric points in Romanian. Apply the same rule for any other language.",
    "Treat the requested counts as a strict output inventory, not as loose guidance.",
    "You are not deciding how many questions to generate. The requested count is fixed and mandatory.",
    "Before producing the final JSON, internally verify that this batch contains the exact requested number of question objects.",
    "Each question must include a clear explanation.",
    "Write questions in a classroom-ready style: precise, unambiguous, and grounded in the provided materials.",
    "Do not include any extra keys, prose outside JSON, markdown, or commentary.",
    "Do not echo request-side fields like count in the generated output.",
    "For single-choice questions:",
    "- Return exactly 4 answer strings in answers.",
    "- Return one correctAnswerIndex between 0 and 3.",
    "- Make exactly one answer clearly correct.",
    "- Make the other three answers plausible distractors.",
    "For multiple-choice questions:",
    "- Return exactly 4 answer strings in answers.",
    "- Return correctAnswerIndices with at least 2 distinct indices.",
    "- The question itself must be written so multiple answers are genuinely correct.",
    "- Do not create a disguised single-choice question with only one real answer.",
    "For true/false questions:",
    "- Do not return answer options.",
    "- Return only correctAnswer as a boolean.",
    "- The prompt must be a declarative statement, not an open question.",
    "- Do not use a question mark.",
    '- Good format: "The mitochondrion is the main site of ATP production in eukaryotic cells."',
    '- Bad format: "What is the main site of ATP production in eukaryotic cells?"',
    "- The reader should be able to decide whether the statement is true or false from the provided materials.",
    "- Set correctAnswer to true only if the statement itself is correct. Set it to false only if the statement itself is incorrect.",
    "- When correctAnswer is false, the statement must still be plausible, but clearly false based on the source material.",
    "For short-text questions:",
    "- Return acceptableAnswers as concise valid strings.",
    "- The question should have a short factual answer, not an essay.",
    "For long-text questions:",
    "- Return sampleAnswer and rubricPoints.",
    "- The question should require explanation, reasoning, or synthesis.",
    "",
    buildQuestionTypeExamples(),
    "",
    "Prompt:",
    request.prompt,
    "",
    "Requested sections:",
    sectionsText,
    "",
    currentGroupContract,
    "",
    "Previously generated sections and questions. Do not repeat or closely restate them:",
    buildGeneratedContext(generatedSections),
    "",
    "Attached images:",
    imageText,
    "",
    "Extracted document text:",
    documentsText,
    "",
    "JSON schema:",
    JSON.stringify(schema),
  ].join("\n");
}

function buildRepairPrompt(args: {
  sectionName: string;
  questionRequest: QuizRequestQuestion;
  validationError: string;
}) {
  const { sectionName, questionRequest, validationError } = args;

  return [
    "Your previous JSON was invalid. Regenerate this batch from scratch.",
    `Validation error: ${validationError}`,
    `Section: "${sectionName}"`,
    `Required batch: exactly ${questionRequest.count} question object(s) with type="${questionRequest.type}" and difficulty="${questionRequest.difficulty}".`,
    "Keep the output in the same primary language as the prompt and materials.",
    "Return only valid JSON matching the schema.",
    "Do not repeat previously generated questions.",
    "Do not generate any extra questions.",
    "Do not generate questions of other types or difficulties.",
  ].join("\n");
}

async function generateQuestionGroup(args: {
  ollama: Ollama;
  model: string;
  request: QuizRequest;
  resources: QuizStoredResource[];
  sectionName: string;
  questionRequest: QuizRequestQuestion;
  generatedSections: QuizSection[];
  imagePaths: string[];
}) {
  const {
    ollama,
    model,
    request,
    resources,
    sectionName,
    questionRequest,
    generatedSections,
    imagePaths,
  } = args;
  const questionGroupSchema = buildQuestionGroupSchema(questionRequest);
  const schema = questionGroupSchema.toJSONSchema();
  const messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
    images?: string[];
  }> = [
    {
      role: "system",
      content:
        "You are generating one quiz question group at a time. You must return exact structured JSON, obey the requested count, type, and difficulty with no extras, and write in the same primary language as the source content.",
    },
    {
      role: "user",
      content: buildQuestionGroupPrompt({
        request,
        resources,
        sectionName,
        questionRequest,
        generatedSections,
        schema,
      }),
      images: imagePaths.length > 0 ? imagePaths : undefined,
    },
  ];

  for (
    let attempt = 1;
    attempt <= MAX_GROUP_GENERATION_ATTEMPTS;
    attempt += 1
  ) {
    const response = await ollama.chat({
      model,
      stream: false,
      format: schema,
      options: {
        temperature: 0,
      },
      messages,
    });

    const rawContent = response.message.content;

    try {
      const parsed = questionGroupSchema.parse(JSON.parse(rawContent));

      for (const question of parsed.questions) {
        assertQuestionShape(question);
      }

      assertNoDuplicatePrompts(parsed.questions, generatedSections);

      return parsed.questions as QuizQuestion[];
    } catch (error) {
      const validationError = formatGenerationError(error);

      if (attempt === MAX_GROUP_GENERATION_ATTEMPTS) {
        throw new Error(validationError);
      }

      messages.push({
        role: "assistant",
        content: rawContent,
      });
      messages.push({
        role: "user",
        content: buildRepairPrompt({
          sectionName,
          questionRequest,
          validationError,
        }),
      });
    }
  }

  throw new Error("Question group generation failed unexpectedly.");
}

async function generateQuizTitle(args: {
  ollama: Ollama;
  model: string;
  request: QuizRequest;
  resources: QuizStoredResource[];
  imagePaths: string[];
}) {
  const { ollama, model, request, resources, imagePaths } = args;
  const schema = quizTitleSchema.toJSONSchema();
  const response = await ollama.chat({
    model,
    stream: false,
    format: schema,
    options: {
      temperature: 0,
    },
    messages: [
      {
        role: "system",
        content:
          "You generate short, structured quiz titles that are specific, classroom-ready, and written in the same primary language as the source content.",
      },
      {
        role: "user",
        content: buildQuizTitlePrompt({
          request,
          resources,
        }),
        images: imagePaths.length > 0 ? imagePaths : undefined,
      },
    ],
  });
  const parsed = quizTitleSchema.parse(JSON.parse(response.message.content));
  const normalizedTitle = normalizeQuizTitle(parsed.title);

  if (normalizedTitle.length < 6) {
    throw new Error("Generated title was too short.");
  }

  return normalizedTitle;
}

function applyGeneratedQuestionsToSections(args: {
  sections: QuizSection[];
  sectionId: string;
  questions: QuizQuestion[];
}) {
  const { sections, sectionId, questions } = args;
  const persistedQuestions = questions.map((question) => ({
    ...question,
    id: crypto.randomUUID(),
  }));

  return sections.map((section) =>
    section.id === sectionId
      ? {
          ...section,
          questions: [...section.questions, ...persistedQuestions],
        }
      : section,
  );
}

function getUploadedFiles(formData: FormData) {
  return formData
    .getAll("resources")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

function parseQuizRequest(formData: FormData): QuizRequest {
  const prompt = formData.get("prompt");
  const rawSections = formData.get("sections");

  if (typeof prompt !== "string") {
    throw new Error("Prompt is missing.");
  }

  if (typeof rawSections !== "string") {
    throw new Error("Sections payload is missing.");
  }

  const parsedSections = JSON.parse(rawSections) as unknown;
  return quizRequestSchema.parse({
    prompt,
    sections: parsedSections,
  });
}

function toQuizRecord(record: typeof quizzes.$inferSelect): QuizRecord {
  return {
    id: record.id,
    isPublic: record.isPublic,
    title: record.title,
    prompt: record.prompt,
    status: record.status,
    completedChunks: record.completedChunks,
    totalChunks: record.totalChunks,
    activeChunkId: record.activeChunkId,
    errorMessage: record.errorMessage,
    draftSnapshot: record.draftSnapshot,
    resources: record.resources,
    generatedSections: record.generatedSections,
  };
}

function createDraftSnapshotFromEditedQuiz(
  snapshot: QuizDraftSnapshot,
  sections: QuizSection[],
): QuizDraftSnapshot {
  return {
    ...snapshot,
    sections: sections.map((section) => ({
      id: section.id,
      name: section.name,
      groups: getEditedQuestionGroups(section.questions),
    })),
  };
}

function getEditedQuestionGroups(questions: QuizQuestion[]) {
  return questions.reduce<QuizDraftSnapshot["sections"][number]["groups"]>(
    (groups, question) => {
      const previousGroup = groups.at(-1);

      if (
        previousGroup &&
        previousGroup.type === question.type &&
        previousGroup.difficulty === question.difficulty
      ) {
        previousGroup.count += 1;
        return groups;
      }

      groups.push({
        id: question.id,
        type: question.type,
        difficulty: question.difficulty,
        count: 1,
      });

      return groups;
    },
    [],
  );
}

function createQuizRequestFromStoredQuiz(quiz: typeof quizzes.$inferSelect) {
  return quizRequestSchema.parse({
    prompt: quiz.prompt,
    sections: quiz.draftSnapshot.sections.map((section) => ({
      id: section.id,
      name: section.name,
      questions: section.groups,
    })),
  });
}

function shouldGenerateAiQuizTitle(quiz: typeof quizzes.$inferSelect) {
  return !quiz.titleGenerated;
}

async function getQuizById(quizId: string) {
  return db.query.quizzes.findFirst({
    where: eq(quizzes.id, quizId),
  });
}

async function markQuizAsReady(quizId: string) {
  const [updatedQuiz] = await db
    .update(quizzes)
    .set({
      status: "ready",
      activeChunkId: null,
      errorMessage: null,
      updatedAt: new Date(),
    })
    .where(eq(quizzes.id, quizId))
    .returning();

  return updatedQuiz ?? null;
}

async function markQuizAsFailed(quizId: string, message: string) {
  const [updatedQuiz] = await db
    .update(quizzes)
    .set({
      status: "failed",
      activeChunkId: null,
      errorMessage: message,
      updatedAt: new Date(),
    })
    .where(eq(quizzes.id, quizId))
    .returning();

  return updatedQuiz ?? null;
}

async function notifyQuizGenerationJob(quizId: string) {
  await sql.notify(QUIZ_GENERATION_CHANNEL, quizId);
}

async function claimNextQuizGenerationJob(workerId: string) {
  const staleAfterSeconds = Math.floor(QUIZ_JOB_STALE_AFTER_MS / 1000);
  const [job] = await sql<ClaimedQuizGenerationJob[]>`
    with candidate as (
      select "id"
      from "quiz_generation_jobs"
      where
        "status" = 'queued'
        or (
          "status" = 'running'
          and coalesce("last_heartbeat_at", "claimed_at", "updated_at")
            < now() - (${staleAfterSeconds} * interval '1 second')
        )
      order by "created_at" asc
      limit 1
      for update skip locked
    )
    update "quiz_generation_jobs" as "jobs"
    set
      "status" = 'running',
      "attempts" = "jobs"."attempts" + 1,
      "claimed_at" = now(),
      "claimed_by" = ${workerId},
      "last_heartbeat_at" = now(),
      "error_message" = null,
      "updated_at" = now()
    from candidate
    where "jobs"."id" = candidate."id"
    returning
      "jobs"."id",
      "jobs"."quiz_id" as "quizId",
      "jobs"."status",
      "jobs"."attempts",
      "jobs"."claimed_at" as "claimedAt",
      "jobs"."claimed_by" as "claimedBy",
      "jobs"."last_heartbeat_at" as "lastHeartbeatAt",
      "jobs"."error_message" as "errorMessage",
      "jobs"."created_at" as "createdAt",
      "jobs"."updated_at" as "updatedAt"
  `;

  return job ?? null;
}

async function updateQuizGenerationJobHeartbeat(
  jobId: string,
  workerId: string,
) {
  await db
    .update(quizGenerationJobs)
    .set({
      lastHeartbeatAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(quizGenerationJobs.id, jobId),
        eq(quizGenerationJobs.status, "running"),
        eq(quizGenerationJobs.claimedBy, workerId),
      ),
    );
}

async function completeQuizGenerationJob(jobId: string, workerId: string) {
  await db
    .update(quizGenerationJobs)
    .set({
      status: "completed",
      errorMessage: null,
      lastHeartbeatAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(quizGenerationJobs.id, jobId),
        eq(quizGenerationJobs.status, "running"),
        eq(quizGenerationJobs.claimedBy, workerId),
      ),
    );
}

async function failQuizGenerationJob(
  jobId: string,
  workerId: string,
  message: string,
) {
  await db
    .update(quizGenerationJobs)
    .set({
      status: "failed",
      errorMessage: message,
      lastHeartbeatAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(quizGenerationJobs.id, jobId),
        eq(quizGenerationJobs.status, "running"),
        eq(quizGenerationJobs.claimedBy, workerId),
      ),
    );
}

async function runClaimedQuizGenerationJob(
  job: ClaimedQuizGenerationJob,
  workerId: string,
): Promise<QuizGenerationRunResult> {
  const heartbeat = setInterval(() => {
    void updateQuizGenerationJobHeartbeat(job.id, workerId);
  }, QUIZ_JOB_HEARTBEAT_INTERVAL_MS);

  try {
    const ollama = createQuizOllamaClient();

    while (true) {
      let currentQuiz = await getQuizById(job.quizId);

      if (!currentQuiz) {
        await failQuizGenerationJob(job.id, workerId, "Quiz not found.");
        return {
          outcome: "failed",
          quizId: job.quizId,
          jobId: job.id,
          errorMessage: "Quiz not found.",
        };
      }

      const request = createQuizRequestFromStoredQuiz(currentQuiz);
      const imagePaths = currentQuiz.resources
        .filter((resource) => resource.kind === "image")
        .map((resource) => resource.path);

      if (shouldGenerateAiQuizTitle(currentQuiz)) {
        try {
          const nextTitle = await generateQuizTitle({
            ollama,
            model: QUIZ_GENERATION_MODEL,
            request,
            resources: currentQuiz.resources,
            imagePaths,
          });

          if (nextTitle !== currentQuiz.title) {
            const [retitledQuiz] = await db
              .update(quizzes)
              .set({
                title: nextTitle,
                titleGenerated: true,
                updatedAt: new Date(),
              })
              .where(eq(quizzes.id, currentQuiz.id))
              .returning();

            currentQuiz = retitledQuiz ?? {
              ...currentQuiz,
              title: nextTitle,
              titleGenerated: true,
            };
          } else {
            const [retitledQuiz] = await db
              .update(quizzes)
              .set({
                titleGenerated: true,
                updatedAt: new Date(),
              })
              .where(eq(quizzes.id, currentQuiz.id))
              .returning();

            currentQuiz = retitledQuiz ?? {
              ...currentQuiz,
              titleGenerated: true,
            };
          }
        } catch {
          // Title generation should not block quiz generation.
        }
      }

      const nextStep = getStoredChunk(
        currentQuiz.draftSnapshot,
        currentQuiz.completedChunks,
      );

      if (!nextStep) {
        await markQuizAsReady(currentQuiz.id);
        await completeQuizGenerationJob(job.id, workerId);
        return {
          outcome: "completed",
          quizId: currentQuiz.id,
          jobId: job.id,
        };
      }

      await db
        .update(quizzes)
        .set({
          status: "generating" satisfies QuizStatus,
          activeChunkId: nextStep.chunk.id,
          errorMessage: null,
          updatedAt: new Date(),
        })
        .where(eq(quizzes.id, currentQuiz.id));

      const questions = await generateQuestionGroup({
        ollama,
        model: QUIZ_GENERATION_MODEL,
        request,
        resources: currentQuiz.resources,
        sectionName: nextStep.section.name,
        questionRequest: nextStep.group,
        generatedSections: currentQuiz.generatedSections,
        imagePaths,
      });
      const nextGeneratedSections = applyGeneratedQuestionsToSections({
        sections: currentQuiz.generatedSections,
        sectionId: nextStep.section.id,
        questions,
      });
      const nextCompletedChunks = currentQuiz.completedChunks + 1;
      const nextStatus: QuizStatus =
        nextCompletedChunks >= currentQuiz.totalChunks ? "ready" : "generating";

      await db
        .update(quizzes)
        .set({
          generatedSections: nextGeneratedSections,
          completedChunks: nextCompletedChunks,
          status: nextStatus,
          activeChunkId: null,
          errorMessage: null,
          updatedAt: new Date(),
        })
        .where(eq(quizzes.id, currentQuiz.id));

      await updateQuizGenerationJobHeartbeat(job.id, workerId);

      if (nextStatus === "ready") {
        await completeQuizGenerationJob(job.id, workerId);
        return {
          outcome: "completed",
          quizId: currentQuiz.id,
          jobId: job.id,
        };
      }
    }
  } catch (error) {
    const message = formatGenerationError(error);
    await markQuizAsFailed(job.quizId, message);
    await failQuizGenerationJob(job.id, workerId, message);
    return {
      outcome: "failed",
      quizId: job.quizId,
      jobId: job.id,
      errorMessage: message,
    };
  } finally {
    clearInterval(heartbeat);
  }
}

export async function getQuizRecordForUser(quizId: string, userId: string) {
  const quiz = await db.query.quizzes.findFirst({
    where: and(eq(quizzes.id, quizId), eq(quizzes.userId, userId)),
  });

  return quiz ? toQuizRecord(quiz) : null;
}

export async function getPublicQuizRecord(quizId: string) {
  const quiz = await db.query.quizzes.findFirst({
    where: and(eq(quizzes.id, quizId), eq(quizzes.isPublic, true)),
  });

  if (!quiz || quiz.status !== "ready") {
    return null;
  }

  return toQuizRecord(quiz);
}

export async function updateQuizPublicForUser(
  quizId: string,
  userId: string,
  isPublic: boolean,
): Promise<UpdateQuizPublicResult> {
  const [updatedQuiz] = await db
    .update(quizzes)
    .set({
      isPublic,
      updatedAt: new Date(),
    })
    .where(and(eq(quizzes.id, quizId), eq(quizzes.userId, userId)))
    .returning();

  if (!updatedQuiz) {
    return {
      success: false,
      message: "Quiz not found.",
    };
  }

  return {
    success: true,
    quiz: toQuizRecord(updatedQuiz),
  };
}

export async function copyPublicQuizForUser(
  quizId: string,
  userId: string,
): Promise<CopyPublicQuizResult> {
  const sourceQuiz = await db.query.quizzes.findFirst({
    where: and(eq(quizzes.id, quizId), eq(quizzes.isPublic, true)),
  });

  if (!sourceQuiz || sourceQuiz.status !== "ready") {
    return {
      success: false,
      message: "Quiz not found.",
    };
  }

  const [copiedQuiz] = await db
    .insert(quizzes)
    .values({
      userId,
      title: sourceQuiz.title,
      titleGenerated: sourceQuiz.titleGenerated,
      prompt: sourceQuiz.prompt,
      status: sourceQuiz.status,
      draftSnapshot: sourceQuiz.draftSnapshot,
      resources: sourceQuiz.resources,
      generatedSections: sourceQuiz.generatedSections,
      isPublic: false,
      completedChunks: sourceQuiz.completedChunks,
      totalChunks: sourceQuiz.totalChunks,
      activeChunkId: null,
      errorMessage: null,
    })
    .returning({
      id: quizzes.id,
    });

  if (!copiedQuiz) {
    return {
      success: false,
      message: "Failed to save quiz.",
    };
  }

  return {
    success: true,
    quizId: copiedQuiz.id,
  };
}

export async function deleteQuizForUser(
  quizId: string,
  userId: string,
): Promise<DeleteQuizResult> {
  const [deletedQuiz] = await db
    .delete(quizzes)
    .where(and(eq(quizzes.id, quizId), eq(quizzes.userId, userId)))
    .returning({
      id: quizzes.id,
    });

  if (!deletedQuiz) {
    return {
      success: false,
      message: "Quiz not found.",
    };
  }

  return {
    success: true,
  };
}

export async function updateQuizContentForUser(
  quizId: string,
  userId: string,
  input: unknown,
): Promise<UpdateQuizContentResult> {
  const parsed = editableQuizContentSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      message: "Quiz validation failed.",
      issues: [...new Set(parsed.error.issues.map(formatQuizEditIssue))],
    };
  }

  const existingQuiz = await db.query.quizzes.findFirst({
    where: and(eq(quizzes.id, quizId), eq(quizzes.userId, userId)),
  });

  if (!existingQuiz) {
    return {
      success: false,
      message: "Quiz not found.",
    };
  }

  if (existingQuiz.status !== "ready") {
    return {
      success: false,
      message: "Only ready quizzes can be edited.",
    };
  }

  const nextDraftSnapshot = createDraftSnapshotFromEditedQuiz(
    existingQuiz.draftSnapshot,
    parsed.data.sections,
  );

  const [updatedQuiz] = await db
    .update(quizzes)
    .set({
      title: parsed.data.title,
      draftSnapshot: nextDraftSnapshot,
      generatedSections: parsed.data.sections,
      updatedAt: new Date(),
    })
    .where(and(eq(quizzes.id, quizId), eq(quizzes.userId, userId)))
    .returning();

  if (!updatedQuiz) {
    return {
      success: false,
      message: "Quiz not found.",
    };
  }

  return {
    success: true,
    quiz: toQuizRecord(updatedQuiz),
  };
}

export async function createQuizDraftForUser(
  userId: string,
  formData: FormData,
): Promise<CreateQuizDraftResult> {
  try {
    const request = parseQuizRequest(formData);
    const uploadedFiles = getUploadedFiles(formData);
    const resources = await saveAndProcessResources(uploadedFiles, userId);
    const draftSnapshot = createQuizDraftSnapshot({
      prompt: request.prompt,
      resourceNames: resources.map((resource) => resource.name),
      sections: request.sections,
    });
    const totalChunks = getQuizGenerationChunks(draftSnapshot).length;
    const generatedSections = createEmptyGeneratedSections(draftSnapshot);

    const createdQuiz = await db.transaction(async (tx) => {
      const [insertedQuiz] = await tx
        .insert(quizzes)
        .values({
          userId,
          title: createFallbackQuizTitle(request),
          titleGenerated: false,
          prompt: request.prompt,
          status: "queued",
          draftSnapshot,
          resources,
          generatedSections,
          completedChunks: 0,
          totalChunks,
          activeChunkId: null,
          errorMessage: null,
        })
        .returning({
          id: quizzes.id,
        });

      if (!insertedQuiz) {
        throw new Error("Failed to create quiz draft.");
      }

      await tx.insert(quizGenerationJobs).values({
        quizId: insertedQuiz.id,
        status: "queued",
        attempts: 0,
        claimedAt: null,
        claimedBy: null,
        lastHeartbeatAt: null,
        errorMessage: null,
      });

      return insertedQuiz;
    });

    await notifyQuizGenerationJob(createdQuiz.id);

    return {
      success: true,
      quizId: createdQuiz.id,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        message: "Quiz request validation failed.",
        issues: error.issues.map((issue) => issue.message),
      };
    }

    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to create quiz draft.",
    };
  }
}

export async function retryQuizGenerationForUser(
  quizId: string,
  userId: string,
) {
  const existingQuiz = await db.query.quizzes.findFirst({
    where: and(eq(quizzes.id, quizId), eq(quizzes.userId, userId)),
    orderBy: [desc(quizzes.updatedAt)],
  });

  if (!existingQuiz) {
    return null;
  }

  if (existingQuiz.status === "ready") {
    return toQuizRecord(existingQuiz);
  }

  if (existingQuiz.status === "generating") {
    return toQuizRecord(existingQuiz);
  }

  await db.transaction(async (tx) => {
    await tx
      .update(quizzes)
      .set({
        status: "queued",
        activeChunkId: null,
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(and(eq(quizzes.id, quizId), eq(quizzes.userId, userId)));

    const [existingJob] = await tx
      .select({
        id: quizGenerationJobs.id,
      })
      .from(quizGenerationJobs)
      .where(eq(quizGenerationJobs.quizId, quizId))
      .limit(1);

    if (existingJob) {
      await tx
        .update(quizGenerationJobs)
        .set({
          status: "queued",
          claimedAt: null,
          claimedBy: null,
          lastHeartbeatAt: null,
          errorMessage: null,
          updatedAt: new Date(),
        })
        .where(eq(quizGenerationJobs.id, existingJob.id));
    } else {
      await tx.insert(quizGenerationJobs).values({
        quizId,
        status: "queued",
        attempts: 0,
        claimedAt: null,
        claimedBy: null,
        lastHeartbeatAt: null,
        errorMessage: null,
      });
    }
  });

  await notifyQuizGenerationJob(quizId);

  return getQuizRecordForUser(quizId, userId);
}

export type ProcessNextQuizGenerationJobResult =
  | {
      processed: false;
    }
  | ({
      processed: true;
    } & QuizGenerationRunResult);

export async function processNextQuizGenerationJob(
  workerId: string,
  hooks?: {
    onClaimed?: (job: QuizGenerationClaimedJob) => void;
  },
): Promise<ProcessNextQuizGenerationJobResult> {
  const job = await claimNextQuizGenerationJob(workerId);

  if (!job) {
    return {
      processed: false,
    };
  }

  hooks?.onClaimed?.({
    attempts: job.attempts,
    jobId: job.id,
    quizId: job.quizId,
  });

  return {
    processed: true,
    ...(await runClaimedQuizGenerationJob(job, workerId)),
  };
}
