"use client";

import type { QuizQuestion } from "@/lib/quiz/preview";

export function formatQuestionType(type: QuizQuestion["type"]) {
  return type
    .split("-")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function getQuestionCorrectValue(question: QuizQuestion) {
  if (question.type === "single-choice") {
    return `${question.correctAnswerIndex + 1}. ${
      question.answers[question.correctAnswerIndex] ?? "Missing answer"
    }`;
  }
  if (question.type === "multiple-choice") {
    return question.correctAnswerIndices
      .map(
        (index) =>
          `${index + 1}. ${question.answers[index] ?? "Missing answer"}`,
      )
      .join(" · ");
  }
  if (question.type === "true-false") {
    return question.correctAnswer ? "True" : "False";
  }
  return null;
}

function getQuestionFieldRows(question: QuizQuestion) {
  const rows = [
    { label: "Type", value: formatQuestionType(question.type) },
    { label: "Difficulty", value: question.difficulty },
    { label: "Prompt", value: question.prompt },
    { label: "Explanation", value: question.explanation },
  ];

  if (
    question.type === "single-choice" ||
    question.type === "multiple-choice"
  ) {
    rows.push({
      label: "Answers",
      value: question.answers
        .map((answer, index) => `${index + 1}. ${answer}`)
        .join(" · "),
    });
    rows.push({
      label: "Correct",
      value: getQuestionCorrectValue(question) ?? "",
    });
  } else if (question.type === "true-false") {
    rows.push({
      label: "Correct",
      value: getQuestionCorrectValue(question) ?? "",
    });
  } else if (question.type === "short-text") {
    rows.push({
      label: "Accepted",
      value: question.acceptableAnswers.join(" · "),
    });
  } else {
    rows.push({ label: "Sample", value: question.sampleAnswer });
    rows.push({
      label: "Rubric",
      value: question.rubricPoints.join(" · "),
    });
  }

  return rows;
}

export function getQuestionDiffRows(before: QuizQuestion, after: QuizQuestion) {
  const beforeRows = new Map(
    getQuestionFieldRows(before).map((row) => [row.label, row.value]),
  );
  const afterRows = new Map(
    getQuestionFieldRows(after).map((row) => [row.label, row.value]),
  );
  const labels = Array.from(
    new Set([...beforeRows.keys(), ...afterRows.keys()]),
  );

  return labels
    .map((label) => ({
      after: afterRows.get(label) ?? "",
      before: beforeRows.get(label) ?? "",
      label,
    }))
    .filter((row) => row.before !== row.after);
}
