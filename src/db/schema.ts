import {
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
import type {
  QuizDraftSnapshot,
  QuizSection,
  QuizGenerationJobStatus,
  QuizStatus,
  QuizStoredResource,
} from "@/lib/quiz-preview";

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
    usersEmailUniqueIndex: uniqueIndex("users_email_unique_idx").on(table.email),
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
    sessionsExpiresAtIndex: index("sessions_expires_at_idx").on(table.expiresAt),
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
    prompt: text("prompt").notNull(),
    status: varchar("status", { length: 24 }).$type<QuizStatus>().notNull(),
    draftSnapshot: jsonb("draft_snapshot")
      .$type<QuizDraftSnapshot>()
      .notNull(),
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

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Quiz = typeof quizzes.$inferSelect;
export type NewQuiz = typeof quizzes.$inferInsert;
export type QuizGenerationJob = typeof quizGenerationJobs.$inferSelect;
export type NewQuizGenerationJob = typeof quizGenerationJobs.$inferInsert;
