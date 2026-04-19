import { z } from "zod";

const databaseEnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .url("DATABASE_URL must be a valid Postgres connection string."),
});

const authEnvSchema = z.object({
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters long."),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

type DatabaseEnv = z.infer<typeof databaseEnvSchema>;
type AuthEnv = z.infer<typeof authEnvSchema>;
const quizEnvSchema = z.object({
  OLLAMA_HOST: z
    .string()
    .url("OLLAMA_HOST must be a valid URL.")
    .default("http://127.0.0.1:11434"),
  OLLAMA_MODEL: z.string().min(1).default("gemma4:latest"),
});
type QuizEnv = z.infer<typeof quizEnvSchema>;

let cachedDatabaseEnv: DatabaseEnv | null = null;
let cachedAuthEnv: AuthEnv | null = null;
let cachedQuizEnv: QuizEnv | null = null;

export function getDatabaseEnv() {
  if (cachedDatabaseEnv) {
    return cachedDatabaseEnv;
  }

  cachedDatabaseEnv = databaseEnvSchema.parse(process.env);
  return cachedDatabaseEnv;
}

export function getAuthEnv() {
  if (cachedAuthEnv) {
    return cachedAuthEnv;
  }

  cachedAuthEnv = authEnvSchema.parse(process.env);
  return cachedAuthEnv;
}

export function getQuizEnv() {
  if (cachedQuizEnv) {
    return cachedQuizEnv;
  }

  cachedQuizEnv = quizEnvSchema.parse({
    OLLAMA_HOST: process.env.OLLAMA_HOST ?? process.env.OLLAMA_BASE_URL,
    OLLAMA_MODEL:
      process.env.OLLAMA_MODEL ??
      process.env.OLLAMA_TEXT_MODEL ??
      process.env.OLLAMA_VISION_MODEL,
  });
  return cachedQuizEnv;
}
