import type {
  QuizEditAgentOperation,
  QuizEditAgentReference,
} from "@/lib/quiz/edit-agent/types";
import type {
  QuizAttemptAnswerValue,
  QuizAttemptJobStatus,
  QuizAttemptQuestionResult,
  QuizAttemptStatus,
  QuizDraftSnapshot,
  QuizGenerationJobStatus,
  QuizSection,
  QuizStatus,
  QuizStoredResource,
} from "@/lib/quiz/preview";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    firstName: varchar("first_name", { length: 80 }).notNull(),
    lastName: varchar("last_name", { length: 80 }).notNull(),
    name: varchar("name", { length: 80 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    usersEmailUniqueIndex: uniqueIndex("users_email_unique_idx").on(
      table.email,
    ),
  }),
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    sessionsUserIdIndex: index("sessions_user_id_idx").on(table.userId),
    sessionsExpiresAtIndex: index("sessions_expires_at_idx").on(
      table.expiresAt,
    ),
  }),
);

export const quizzes = pgTable(
  "quizzes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 160 }).notNull(),
    titleGenerated: boolean("title_generated").notNull().default(false),
    prompt: text("prompt").notNull(),
    status: varchar("status", { length: 24 }).$type<QuizStatus>().notNull(),
    draftSnapshot: jsonb("draft_snapshot").$type<QuizDraftSnapshot>().notNull(),
    resources: jsonb("resources").$type<QuizStoredResource[]>().notNull(),
    generatedSections: jsonb("generated_sections")
      .$type<QuizSection[]>()
      .notNull(),
    completedChunks: integer("completed_chunks").notNull().default(0),
    totalChunks: integer("total_chunks").notNull(),
    activeChunkId: varchar("active_chunk_id", { length: 120 }),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    quizzesUserIdIndex: index("quizzes_user_id_idx").on(table.userId),
    quizzesStatusIndex: index("quizzes_status_idx").on(table.status),
  }),
);

export const quizGenerationJobs = pgTable(
  "quiz_generation_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 24 })
      .$type<QuizGenerationJobStatus>()
      .notNull(),
    attempts: integer("attempts").notNull().default(0),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    claimedBy: varchar("claimed_by", { length: 160 }),
    lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    quizGenerationJobsQuizIdUniqueIndex: uniqueIndex(
      "quiz_generation_jobs_quiz_id_unique_idx",
    ).on(table.quizId),
    quizGenerationJobsStatusIndex: index("quiz_generation_jobs_status_idx").on(
      table.status,
    ),
  }),
);

export const quizAttempts = pgTable(
  "quiz_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 24 })
      .$type<QuizAttemptStatus>()
      .notNull()
      .default("grading"),
    errorMessage: text("error_message"),
    quizTitle: varchar("quiz_title", { length: 160 }).notNull(),
    quizSections: jsonb("quiz_sections").$type<QuizSection[]>().notNull(),
    answers: jsonb("answers")
      .$type<Record<string, QuizAttemptAnswerValue>>()
      .notNull(),
    results: jsonb("results").$type<QuizAttemptQuestionResult[]>().notNull(),
    tips: jsonb("tips").$type<string[]>().notNull(),
    earnedPoints: integer("earned_points").notNull(),
    maxPoints: integer("max_points").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    quizAttemptsQuizIdIndex: index("quiz_attempts_quiz_id_idx").on(
      table.quizId,
    ),
    quizAttemptsUserQuizCreatedAtIndex: index(
      "quiz_attempts_user_quiz_created_at_idx",
    ).on(table.userId, table.quizId, table.createdAt),
  }),
);

export const quizAttemptJobs = pgTable(
  "quiz_attempt_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => quizAttempts.id, { onDelete: "cascade" }),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 24 })
      .$type<QuizAttemptJobStatus>()
      .notNull()
      .default("queued"),
    attempts: integer("attempts").notNull().default(0),
    claimedAt: timestamp("claimed_at", { withTimezone: true }),
    claimedBy: varchar("claimed_by", { length: 160 }),
    lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    quizAttemptJobsAttemptIdUniqueIndex: uniqueIndex(
      "quiz_attempt_jobs_attempt_id_unique_idx",
    ).on(table.attemptId),
    quizAttemptJobsStatusIndex: index("quiz_attempt_jobs_status_idx").on(
      table.status,
    ),
  }),
);

export const quizEditAgentChats = pgTable(
  "quiz_edit_agent_chats",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 120 }).notNull(),
    lastSelectedAt: timestamp("last_selected_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    quizEditAgentChatsQuizIdIndex: index(
      "quiz_edit_agent_chats_quiz_id_idx",
    ).on(table.quizId),
    quizEditAgentChatsUserQuizUpdatedAtIndex: index(
      "quiz_edit_agent_chats_user_quiz_updated_at_idx",
    ).on(table.userId, table.quizId, table.updatedAt),
    quizEditAgentChatsUserQuizLastSelectedAtIndex: index(
      "quiz_edit_agent_chats_user_quiz_last_selected_at_idx",
    ).on(table.userId, table.quizId, table.lastSelectedAt),
  }),
);

export const quizEditAgentMessages = pgTable(
  "quiz_edit_agent_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    chatId: uuid("chat_id")
      .notNull()
      .references(() => quizEditAgentChats.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 24 })
      .$type<"user" | "assistant">()
      .notNull(),
    content: text("content").notNull(),
    references: jsonb("references")
      .$type<QuizEditAgentReference[]>()
      .notNull()
      .default([]),
    operationSummary: jsonb("operation_summary")
      .$type<string[]>()
      .notNull()
      .default([]),
    operationDetails: jsonb("operation_details")
      .$type<QuizEditAgentOperation[]>()
      .notNull()
      .default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    quizEditAgentMessagesQuizIdIndex: index(
      "quiz_edit_agent_messages_quiz_id_idx",
    ).on(table.quizId),
    quizEditAgentMessagesUserQuizCreatedAtIndex: index(
      "quiz_edit_agent_messages_user_quiz_created_at_idx",
    ).on(table.userId, table.quizId, table.createdAt),
    quizEditAgentMessagesChatCreatedAtIndex: index(
      "quiz_edit_agent_messages_chat_created_at_idx",
    ).on(table.chatId, table.createdAt),
  }),
);

export const quizEditAgentUndos = pgTable(
  "quiz_edit_agent_undos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    chatId: uuid("chat_id")
      .notNull()
      .references(() => quizEditAgentChats.id, { onDelete: "cascade" }),
    messageId: uuid("message_id").references(() => quizEditAgentMessages.id, {
      onDelete: "set null",
    }),
    beforeTitle: varchar("before_title", { length: 160 }).notNull(),
    beforeDraftSnapshot: jsonb("before_draft_snapshot")
      .$type<QuizDraftSnapshot>()
      .notNull(),
    beforeGeneratedSections: jsonb("before_generated_sections")
      .$type<QuizSection[]>()
      .notNull(),
    resultContentHash: varchar("result_content_hash", { length: 64 }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    quizEditAgentUndosQuizIdIndex: index(
      "quiz_edit_agent_undos_quiz_id_idx",
    ).on(table.quizId),
    quizEditAgentUndosUserQuizUsedCreatedIndex: index(
      "quiz_edit_agent_undos_user_quiz_used_created_idx",
    ).on(table.userId, table.quizId, table.usedAt, table.createdAt),
    quizEditAgentUndosChatMessageIndex: index(
      "quiz_edit_agent_undos_chat_message_idx",
    ).on(table.chatId, table.messageId),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Quiz = typeof quizzes.$inferSelect;
export type NewQuiz = typeof quizzes.$inferInsert;
export type QuizGenerationJob = typeof quizGenerationJobs.$inferSelect;
export type NewQuizGenerationJob = typeof quizGenerationJobs.$inferInsert;
export type QuizEditAgentChat = typeof quizEditAgentChats.$inferSelect;
export type NewQuizEditAgentChat = typeof quizEditAgentChats.$inferInsert;
export type QuizEditAgentMessage = typeof quizEditAgentMessages.$inferSelect;
export type NewQuizEditAgentMessage = typeof quizEditAgentMessages.$inferInsert;
export type QuizEditAgentUndo = typeof quizEditAgentUndos.$inferSelect;
export type NewQuizEditAgentUndo = typeof quizEditAgentUndos.$inferInsert;
