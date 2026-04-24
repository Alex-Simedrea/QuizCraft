import { Ollama } from "ollama";

import { getQuizEnv } from "@/lib/env";

export function createQuizOllamaClient() {
  const quizEnv = getQuizEnv();
  return new Ollama({
    host: quizEnv.OLLAMA_HOST,
    headers: quizEnv.OLLAMA_API_KEY
      ? {
          Authorization: `Bearer ${quizEnv.OLLAMA_API_KEY}`,
        }
      : undefined,
  });
}
