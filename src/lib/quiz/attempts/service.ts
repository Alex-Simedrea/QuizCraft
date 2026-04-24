import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db, sql } from "@/db";
import { quizAttemptJobs, quizAttempts, quizzes } from "@/db/schema";
import { getQuizEnv } from "@/lib/env";
import { createQuizOllamaClient } from "@/lib/ollama-client";
import {
  QUIZ_ATTEMPT_GRADING_CHANNEL,
  QUIZ_ATTEMPT_JOB_HEARTBEAT_INTERVAL_MS,
  QUIZ_ATTEMPT_JOB_STALE_AFTER_MS,
} from "@/lib/quiz/attempts/constants";
import type {
  QuizAttemptAnswerValue,
  QuizAttemptQuestionResult,
  QuizAttemptRecord,
  QuizQuestion,
  QuizRecord,
  QuizSection,
} from "@/lib/quiz/preview";

const answerValueSchema = z.union([z.string(), z.array(z.string())]);
const submitAttemptInputSchema = z.object({
  answers: z.record(z.string(), answerValueSchema),
});

const modelTextResultSchema = z.object({
  questionId: z.string().min(1),
  correct: z.boolean(),
  rubricMatches: z.array(z.boolean()),
  feedback: z.string().trim().min(1).max(500),
});

const modelAttemptFeedbackSchema = z.object({
  textResults: z.array(modelTextResultSchema),
  tips: z.array(z.string().trim().min(1).max(220)).optional(),
  overallFeedback: z.string().trim().min(1).max(1000).optional(),
});
const MAX_ATTEMPT_GRADING_ATTEMPTS = 2;

export type QuizAttemptSubmitResult =
  | {
      success: true;
      attemptId: string;
    }
  | {
      success: false;
      message: string;
    };

function toQuizRecord(record: typeof quizzes.$inferSelect): QuizRecord {
  return {
    activeChunkId: record.activeChunkId,
    completedChunks: record.completedChunks,
    draftSnapshot: record.draftSnapshot,
    errorMessage: record.errorMessage,
    generatedSections: record.generatedSections,
    id: record.id,
    prompt: record.prompt,
    resources: record.resources,
    status: record.status,
    title: record.title,
    totalChunks: record.totalChunks,
  };
}

function toAttemptRecord(
  attempt: typeof quizAttempts.$inferSelect,
): QuizAttemptRecord {
  return {
    answers: attempt.answers,
    createdAt: attempt.createdAt.toISOString(),
    earnedPoints: attempt.earnedPoints,
    errorMessage: attempt.errorMessage,
    id: attempt.id,
    maxPoints: attempt.maxPoints,
    quizId: attempt.quizId,
    quizSections: attempt.quizSections,
    quizTitle: attempt.quizTitle,
    results: attempt.results,
    tips: attempt.tips,
    status: attempt.status,
  };
}

function removeChoiceFeedback(results: QuizAttemptQuestionResult[]) {
  return results.map((result) =>
    result.type === "single-choice" ||
    result.type === "multiple-choice" ||
    result.type === "true-false"
      ? {
          ...result,
          feedback: "",
        }
      : result,
  );
}

function getQuestions(sections: QuizSection[]) {
  return sections.flatMap((section) => section.questions);
}

function getAnswer(
  answers: Record<string, QuizAttemptAnswerValue>,
  id: string,
) {
  return answers[id] ?? null;
}

function formatAnswerValue(value: QuizAttemptAnswerValue | null) {
  if (Array.isArray(value)) return value.join(", ");
  if (value === null || value.trim().length === 0) return "No answer";
  return value;
}

function getCorrectAnswerLabel(question: QuizQuestion) {
  switch (question.type) {
    case "single-choice":
      return question.answers[question.correctAnswerIndex] ?? "Missing answer";
    case "multiple-choice":
      return question.correctAnswerIndices
        .map((index) => question.answers[index] ?? "Missing answer")
        .join(", ");
    case "true-false":
      return question.correctAnswer ? "True" : "False";
    case "short-text":
      return question.acceptableAnswers.join(", ");
    case "long-text":
      return question.sampleAnswer;
  }
}

function getQuestionMaxPoints(question: QuizQuestion) {
  if (question.type === "long-text") {
    return Math.max(1, question.rubricPoints.length);
  }
  return 1;
}

function normalizeIndexList(value: QuizAttemptAnswerValue | null) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value)].sort(
    (left, right) => Number(left) - Number(right),
  );
}

function gradeChoiceQuestion(
  question: Extract<
    QuizQuestion,
    { type: "single-choice" | "multiple-choice" | "true-false" }
  >,
  answer: QuizAttemptAnswerValue | null,
): QuizAttemptQuestionResult {
  let correct = false;

  if (question.type === "single-choice") {
    correct =
      typeof answer === "string" &&
      Number(answer) === question.correctAnswerIndex;
  } else if (question.type === "multiple-choice") {
    const expected = [...question.correctAnswerIndices]
      .sort((left, right) => left - right)
      .map(String);
    correct =
      JSON.stringify(normalizeIndexList(answer)) === JSON.stringify(expected);
  } else {
    correct =
      typeof answer === "string" &&
      (answer === "true") === question.correctAnswer;
  }

  return {
    correct,
    correctAnswer: getCorrectAnswerLabel(question),
    earnedPoints: correct ? 1 : 0,
    feedback: "",
    maxPoints: 1,
    questionId: question.id,
    type: question.type,
    userAnswer: answer,
  };
}

function createPendingTextResult(
  question: Extract<QuizQuestion, { type: "short-text" | "long-text" }>,
  answer: QuizAttemptAnswerValue | null,
): QuizAttemptQuestionResult {
  const maxPoints = getQuestionMaxPoints(question);
  return {
    correct: false,
    correctAnswer: getCorrectAnswerLabel(question),
    earnedPoints: 0,
    feedback: "This answer still needs model review.",
    maxPoints,
    questionId: question.id,
    type: question.type,
    userAnswer: answer,
  };
}

function buildModelPrompt(args: {
  answers: Record<string, QuizAttemptAnswerValue>;
  choiceResults: QuizAttemptQuestionResult[];
  quiz: QuizRecord;
  textQuestions: Extract<QuizQuestion, { type: "short-text" | "long-text" }>[];
}) {
  const { answers, choiceResults, quiz, textQuestions } = args;
  const choiceSummary = choiceResults.map((result) => ({
    correct: result.correct,
    questionId: result.questionId,
    type: result.type,
  }));
  const textQuestionPayload = textQuestions.map((question) => ({
    acceptableAnswers:
      question.type === "short-text" ? question.acceptableAnswers : undefined,
    explanation: question.explanation,
    maxPoints: getQuestionMaxPoints(question),
    prompt: question.prompt,
    questionId: question.id,
    rubricPoints:
      question.type === "long-text" ? question.rubricPoints : undefined,
    sampleAnswer:
      question.type === "long-text" ? question.sampleAnswer : undefined,
    type: question.type,
    userAnswer: formatAnswerValue(getAnswer(answers, question.id)),
  }));

  return [
    `Quiz title: ${quiz.title}`,
    `Quiz source prompt: ${quiz.prompt}`,
    "",
    "Grade the text-answer questions and provide study tips for the whole attempt.",
    "Use the same primary language as the quiz.",
    "For every short-text question, return correct=true when the user's answer is semantically equivalent to any acceptable answer or the explanation.",
    "For every short-text question, return rubricMatches as an empty array.",
    "For every long-text question, evaluate each rubric point separately and return rubricMatches with exactly one boolean per rubric point, in the same order.",
    "For every long-text question, set correct=true only when every rubricMatches item is true.",
    "Return top-level JSON with exactly these keys: textResults and tips.",
    "tips must be an array of 2 to 6 short improvement tips.",
    "Do not include choiceResults or overallFeedback in the response.",
    "Do not mention implementation details or JSON in user-facing feedback.",
    "",
    "Choice question score summary for overall tips only. Do not grade these and do not return choiceResults:",
    JSON.stringify(choiceSummary, null, 2),
    "",
    "Text questions to grade:",
    JSON.stringify(textQuestionPayload, null, 2),
  ].join("\n");
}

function normalizeModelFeedback(
  feedback: z.infer<typeof modelAttemptFeedbackSchema>,
) {
  const tips =
    feedback.tips && feedback.tips.length > 0
      ? feedback.tips
      : feedback.overallFeedback
        ? [feedback.overallFeedback]
        : [
            "Review the explanations for the questions you missed.",
            "Retake the quiz after revisiting the weakest topics.",
          ];

  return {
    textResults: feedback.textResults,
    tips: tips.slice(0, 6),
  };
}

async function gradeTextQuestions(args: {
  answers: Record<string, QuizAttemptAnswerValue>;
  choiceResults: QuizAttemptQuestionResult[];
  quiz: QuizRecord;
  textQuestions: Extract<QuizQuestion, { type: "short-text" | "long-text" }>[];
}) {
  const { answers, choiceResults, quiz, textQuestions } = args;
  const schema = modelAttemptFeedbackSchema.toJSONSchema();
  const quizEnv = getQuizEnv();
  const ollama = createQuizOllamaClient();
  const messages: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [
    {
      role: "system",
      content:
        "You are a fair quiz grader. Return only valid structured JSON. Use booleans for correctness. Do not award numeric points.",
    },
    {
      role: "user",
      content: buildModelPrompt({
        answers,
        choiceResults,
        quiz,
        textQuestions,
      }),
    },
  ];

  for (let attempt = 1; attempt <= MAX_ATTEMPT_GRADING_ATTEMPTS; attempt += 1) {
    const response = await ollama.chat({
      format: schema,
      messages,
      model: quizEnv.OLLAMA_MODEL,
      options: {
        temperature: 0,
      },
      stream: false,
    });

    const rawContent = response.message.content;

    try {
      return normalizeModelFeedback(
        modelAttemptFeedbackSchema.parse(JSON.parse(rawContent)),
      );
    } catch (error) {
      if (attempt === MAX_ATTEMPT_GRADING_ATTEMPTS) {
        console.warn("Quiz attempt grading parse failed", error, rawContent);
        throw error;
      }

      messages.push({
        role: "assistant",
        content: rawContent,
      });
      messages.push({
        role: "user",
        content:
          "Repair the previous response. Return only JSON matching the schema. The top-level object must have textResults and tips. Each textResults item needs questionId, correct boolean, rubricMatches boolean array, and feedback. Long-text rubricMatches must have exactly one boolean per rubric point. tips must be an array of 2 to 6 strings.",
      });
    }
  }

  throw new Error("Attempt grading failed unexpectedly.");
}

async function getReadyQuizForUser(quizId: string, userId: string) {
  const [quiz] = await db
    .select()
    .from(quizzes)
    .where(and(eq(quizzes.id, quizId), eq(quizzes.userId, userId)))
    .limit(1);

  if (!quiz || quiz.status !== "ready") return null;
  return toQuizRecord(quiz);
}

async function notifyQuizAttemptJob(attemptId: string) {
  await sql.notify(QUIZ_ATTEMPT_GRADING_CHANNEL, attemptId);
}

export async function getLatestQuizAttemptForUser(
  quizId: string,
  userId: string,
) {
  const [attempt] = await db
    .select()
    .from(quizAttempts)
    .where(
      and(eq(quizAttempts.quizId, quizId), eq(quizAttempts.userId, userId)),
    )
    .orderBy(desc(quizAttempts.createdAt))
    .limit(1);

  if (!attempt) return null;

  const normalizedResults = removeChoiceFeedback(attempt.results);
  if (JSON.stringify(normalizedResults) !== JSON.stringify(attempt.results)) {
    const [updatedAttempt] = await db
      .update(quizAttempts)
      .set({
        results: normalizedResults,
        updatedAt: new Date(),
      })
      .where(eq(quizAttempts.id, attempt.id))
      .returning();

    return toAttemptRecord(updatedAttempt);
  }

  return toAttemptRecord(attempt);
}

export async function getQuizAttemptsForUser(quizId: string, userId: string) {
  const attempts = await db
    .select()
    .from(quizAttempts)
    .where(
      and(eq(quizAttempts.quizId, quizId), eq(quizAttempts.userId, userId)),
    )
    .orderBy(desc(quizAttempts.createdAt));

  return attempts.map(toAttemptRecord);
}

export async function getQuizAttemptForUser(
  quizId: string,
  attemptId: string,
  userId: string,
) {
  const [attempt] = await db
    .select()
    .from(quizAttempts)
    .where(
      and(
        eq(quizAttempts.id, attemptId),
        eq(quizAttempts.quizId, quizId),
        eq(quizAttempts.userId, userId),
      ),
    )
    .limit(1);

  return attempt ? toAttemptRecord(attempt) : null;
}

export async function submitQuizAttemptForUser(
  quizId: string,
  input: unknown,
  userId: string,
): Promise<QuizAttemptSubmitResult> {
  const parsedInput = submitAttemptInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return {
      message: "The submitted answers were invalid.",
      success: false,
    };
  }

  const quiz = await getReadyQuizForUser(quizId, userId);
  if (!quiz) {
    return {
      message: "Quiz not found.",
      success: false,
    };
  }

  const answers = parsedInput.data.answers;
  const questions = getQuestions(quiz.generatedSections);
  const choiceResults: QuizAttemptQuestionResult[] = [];
  const textQuestions: Extract<
    QuizQuestion,
    { type: "short-text" | "long-text" }
  >[] = [];

  for (const question of questions) {
    const answer = getAnswer(answers, question.id);
    if (
      question.type === "single-choice" ||
      question.type === "multiple-choice" ||
      question.type === "true-false"
    ) {
      choiceResults.push(gradeChoiceQuestion(question, answer));
    } else {
      textQuestions.push(question);
    }
  }

  const results = removeChoiceFeedback(
    questions.map((question) => {
      return (
        choiceResults.find((result) => result.questionId === question.id) ??
        createPendingTextResult(
          question as Extract<
            QuizQuestion,
            { type: "short-text" | "long-text" }
          >,
          null,
        )
      );
    }),
  );
  const earnedPoints = results.reduce(
    (total, result) => total + result.earnedPoints,
    0,
  );
  const maxPoints = results.reduce(
    (total, result) => total + result.maxPoints,
    0,
  );

  const attempt = await db.transaction(async (tx) => {
    const [createdAttempt] = await tx
      .insert(quizAttempts)
      .values({
        answers,
        earnedPoints,
        maxPoints,
        quizId: quiz.id,
        quizSections: quiz.generatedSections,
        quizTitle: quiz.title,
        results,
        status: "grading",
        tips: [],
        userId,
      })
      .returning();

    if (!createdAttempt) {
      throw new Error("Failed to create quiz attempt.");
    }

    await tx.insert(quizAttemptJobs).values({
      attemptId: createdAttempt.id,
      quizId: quiz.id,
      userId,
      status: "queued",
      attempts: 0,
      claimedAt: null,
      claimedBy: null,
      lastHeartbeatAt: null,
      errorMessage: null,
    });

    return createdAttempt;
  });
  await notifyQuizAttemptJob(attempt.id);

  return {
    attemptId: attempt.id,
    success: true,
  };
}

async function claimNextQuizAttemptJob(workerId: string) {
  const staleAfterSeconds = Math.floor(QUIZ_ATTEMPT_JOB_STALE_AFTER_MS / 1000);
  const [job] = await sql<ClaimedQuizAttemptJob[]>`
    with candidate as (
      select "id"
      from "quiz_attempt_jobs"
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
    update "quiz_attempt_jobs" as "jobs"
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
      "jobs"."attempt_id" as "attemptId",
      "jobs"."quiz_id" as "quizId",
      "jobs"."user_id" as "userId",
      "jobs"."attempts"
  `;

  return job ?? null;
}

async function reconcileQueuedQuizAttemptJobs() {
  await sql`
    update "quiz_attempt_jobs" as "jobs"
    set
      "status" = 'queued',
      "claimed_at" = null,
      "claimed_by" = null,
      "last_heartbeat_at" = null,
      "error_message" = null,
      "updated_at" = now()
    from "quiz_attempts" as "attempts"
    where
      "jobs"."attempt_id" = "attempts"."id"
      and "attempts"."status" = 'grading'
      and "jobs"."status" not in ('queued', 'running')
  `;

  await sql`
    insert into "quiz_attempt_jobs" (
      "attempt_id",
      "quiz_id",
      "user_id",
      "status",
      "attempts",
      "claimed_at",
      "claimed_by",
      "last_heartbeat_at",
      "error_message"
    )
    select
      "attempts"."id",
      "attempts"."quiz_id",
      "attempts"."user_id",
      'queued',
      0,
      null,
      null,
      null,
      null
    from "quiz_attempts" as "attempts"
    left join "quiz_attempt_jobs" as "jobs"
      on "jobs"."attempt_id" = "attempts"."id"
    where
      "attempts"."status" = 'grading'
      and "jobs"."id" is null
  `;
}

async function updateQuizAttemptJobHeartbeat(jobId: string, workerId: string) {
  await db
    .update(quizAttemptJobs)
    .set({ lastHeartbeatAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(quizAttemptJobs.id, jobId),
        eq(quizAttemptJobs.status, "running"),
        eq(quizAttemptJobs.claimedBy, workerId),
      ),
    );
}

async function completeQuizAttemptJob(jobId: string, workerId: string) {
  await db
    .update(quizAttemptJobs)
    .set({
      status: "completed",
      errorMessage: null,
      lastHeartbeatAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(quizAttemptJobs.id, jobId),
        eq(quizAttemptJobs.status, "running"),
        eq(quizAttemptJobs.claimedBy, workerId),
      ),
    );
}

async function failQuizAttemptJob(
  jobId: string,
  workerId: string,
  message: string,
) {
  await db
    .update(quizAttemptJobs)
    .set({
      status: "failed",
      errorMessage: message,
      lastHeartbeatAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(quizAttemptJobs.id, jobId),
        eq(quizAttemptJobs.status, "running"),
        eq(quizAttemptJobs.claimedBy, workerId),
      ),
    );
}

async function runClaimedQuizAttemptJob(
  job: ClaimedQuizAttemptJob,
  workerId: string,
): Promise<Exclude<ProcessNextQuizAttemptJobResult, { processed: false }>> {
  const heartbeat = setInterval(() => {
    void updateQuizAttemptJobHeartbeat(job.id, workerId);
  }, QUIZ_ATTEMPT_JOB_HEARTBEAT_INTERVAL_MS);

  try {
    const [attempt] = await db
      .select()
      .from(quizAttempts)
      .where(
        and(
          eq(quizAttempts.id, job.attemptId),
          eq(quizAttempts.quizId, job.quizId),
          eq(quizAttempts.userId, job.userId),
        ),
      )
      .limit(1);

    if (!attempt) {
      await failQuizAttemptJob(job.id, workerId, "Attempt not found.");
      return {
        processed: true,
        outcome: "failed",
        jobId: job.id,
        attemptId: job.attemptId,
        quizId: job.quizId,
        errorMessage: "Attempt not found.",
      };
    }

    const quiz: QuizRecord = {
      id: attempt.quizId,
      title: attempt.quizTitle,
      prompt: "",
      status: "ready",
      completedChunks: 0,
      totalChunks: 0,
      activeChunkId: null,
      errorMessage: null,
      draftSnapshot: {
        createdAt: "",
        prompt: "",
        resourceNames: [],
        sections: [],
      },
      resources: [],
      generatedSections: attempt.quizSections,
    };
    const questions = getQuestions(attempt.quizSections);
    const choiceResults = attempt.results.filter(
      (result) =>
        result.type === "single-choice" ||
        result.type === "multiple-choice" ||
        result.type === "true-false",
    );
    const textQuestions = questions.filter(
      (
        question,
      ): question is Extract<
        QuizQuestion,
        { type: "short-text" | "long-text" }
      > => question.type === "short-text" || question.type === "long-text",
    );
    const modelFeedback = await gradeTextQuestions({
      answers: attempt.answers,
      choiceResults,
      quiz,
      textQuestions,
    });
    const modelResultsByQuestionId = new Map(
      modelFeedback.textResults.map((result) => [result.questionId, result]),
    );
    const textResults = textQuestions.map((question) => {
      const answer = getAnswer(attempt.answers, question.id);
      const modelResult = modelResultsByQuestionId.get(question.id);
      const maxPoints = getQuestionMaxPoints(question);
      const rubricMatches =
        question.type === "long-text"
          ? question.rubricPoints.map(
              (_, index) => modelResult?.rubricMatches[index] === true,
            )
          : [];
      const earnedPoints =
        question.type === "long-text"
          ? rubricMatches.filter(Boolean).length
          : modelResult?.correct
            ? 1
            : 0;

      return {
        correct:
          question.type === "long-text"
            ? earnedPoints === maxPoints
            : modelResult?.correct === true,
        correctAnswer: getCorrectAnswerLabel(question),
        earnedPoints,
        feedback: modelResult?.feedback ?? "The model did not return feedback.",
        maxPoints,
        questionId: question.id,
        type: question.type,
        userAnswer: answer,
      } satisfies QuizAttemptQuestionResult;
    });
    const results = removeChoiceFeedback(
      questions.map(
        (question) =>
          choiceResults.find((result) => result.questionId === question.id) ??
          textResults.find((result) => result.questionId === question.id) ??
          createPendingTextResult(
            question as Extract<
              QuizQuestion,
              { type: "short-text" | "long-text" }
            >,
            null,
          ),
      ),
    );
    const earnedPoints = results.reduce(
      (total, result) => total + result.earnedPoints,
      0,
    );
    const maxPoints = results.reduce(
      (total, result) => total + result.maxPoints,
      0,
    );

    await db
      .update(quizAttempts)
      .set({
        earnedPoints,
        errorMessage: null,
        maxPoints,
        results,
        status: "completed",
        tips: modelFeedback.tips,
        updatedAt: new Date(),
      })
      .where(eq(quizAttempts.id, attempt.id));
    await completeQuizAttemptJob(job.id, workerId);

    return {
      processed: true,
      outcome: "completed",
      jobId: job.id,
      attemptId: attempt.id,
      quizId: attempt.quizId,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Attempt grading failed.";
    await db
      .update(quizAttempts)
      .set({
        errorMessage: message,
        status: "failed",
        updatedAt: new Date(),
      })
      .where(eq(quizAttempts.id, job.attemptId));
    await failQuizAttemptJob(job.id, workerId, message);
    return {
      processed: true,
      outcome: "failed",
      jobId: job.id,
      attemptId: job.attemptId,
      quizId: job.quizId,
      errorMessage: message,
    };
  } finally {
    clearInterval(heartbeat);
  }
}

export async function processNextQuizAttemptJob(
  workerId: string,
  hooks: { onClaimed?: (job: ClaimedQuizAttemptJob) => void } = {},
): Promise<ProcessNextQuizAttemptJobResult> {
  await reconcileQueuedQuizAttemptJobs();

  const job = await claimNextQuizAttemptJob(workerId);
  if (!job) return { processed: false };
  hooks.onClaimed?.(job);
  return runClaimedQuizAttemptJob(job, workerId);
}
type ClaimedQuizAttemptJob = {
  id: string;
  attemptId: string;
  quizId: string;
  userId: string;
  attempts: number;
};

export type ProcessNextQuizAttemptJobResult =
  | { processed: false }
  | {
      processed: true;
      outcome: "completed" | "failed";
      jobId: string;
      attemptId: string;
      quizId: string;
      errorMessage?: string;
    };
