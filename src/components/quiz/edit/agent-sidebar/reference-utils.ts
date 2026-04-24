"use client";

import type {
  EditorQuestion,
  EditorSection,
} from "@/components/quiz/edit/types";
import type { QuizEditAgentReference } from "@/lib/quiz/edit-agent/types";

function findQuestion(sections: EditorSection[], questionId: string) {
  for (const section of sections) {
    const questionIndex = section.questions.findIndex(
      (question) => question.id === questionId,
    );
    if (questionIndex >= 0) {
      return {
        question: section.questions[questionIndex] as EditorQuestion,
        questionIndex,
        section,
      };
    }
  }
  return null;
}

function getAnswerLabel(
  question: EditorQuestion,
  reference: QuizEditAgentReference,
) {
  if (reference.type !== "answer") return null;
  if (
    reference.kind === "choice" &&
    (question.type === "single-choice" || question.type === "multiple-choice")
  ) {
    return question.answers[reference.answerIndex]?.value ?? null;
  }
  if (
    reference.kind === "acceptable-answer" &&
    question.type === "short-text"
  ) {
    return question.acceptableAnswers[reference.answerIndex]?.value ?? null;
  }
  if (reference.kind === "rubric-point" && question.type === "long-text") {
    return question.rubricPoints[reference.answerIndex]?.value ?? null;
  }
  return null;
}

export function describeReference(
  sections: EditorSection[],
  reference: QuizEditAgentReference,
) {
  if (reference.type === "section") {
    const section = sections.find((item) => item.id === reference.sectionId);
    return section ? `Section: ${section.name}` : "Missing section";
  }

  const match = findQuestion(sections, reference.questionId);
  if (!match) return "Missing question";

  if (reference.type === "question") {
    return `Question ${match.questionIndex + 1}: ${match.question.prompt}`;
  }

  const answer = getAnswerLabel(match.question, reference);
  return `${reference.kind} ${reference.answerIndex + 1}: ${answer ?? "Missing answer"}`;
}
