import type { AnswerKind } from "@/components/quiz/edit/types";
import type { QuizQuestion, QuizRecord } from "@/lib/quiz/preview";

export type QuizEditAgentReference =
  | {
      type: "section";
      sectionId: string;
    }
  | {
      type: "question";
      questionId: string;
    }
  | {
      answerIndex: number;
      kind: AnswerKind;
      questionId: string;
      type: "answer";
    };

export type QuizEditAgentMessageRole = "user" | "assistant";

export type QuizEditAgentSectionSnapshot = {
  id: string;
  name: string;
  questionCount: number;
};

export type QuizEditAgentQuestionOperation =
  | "answer_created"
  | "answer_deleted"
  | "answer_updated"
  | "correct_answers_updated"
  | "question_created"
  | "question_deleted"
  | "question_updated";

export type QuizEditAgentOperation =
  | {
      kind: "quiz_title_updated";
      afterTitle: string;
      beforeTitle: string;
    }
  | {
      kind: "section_created";
      section: QuizEditAgentSectionSnapshot;
    }
  | {
      kind: "section_deleted";
      section: QuizEditAgentSectionSnapshot;
    }
  | {
      kind: "section_updated";
      after: QuizEditAgentSectionSnapshot;
      before: QuizEditAgentSectionSnapshot;
    }
  | {
      kind: "question_created";
      after: QuizQuestion;
      section: QuizEditAgentSectionSnapshot;
    }
  | {
      kind: "question_deleted";
      before: QuizQuestion;
      section: QuizEditAgentSectionSnapshot;
    }
  | {
      kind: Exclude<
        QuizEditAgentQuestionOperation,
        "question_created" | "question_deleted"
      >;
      after: QuizQuestion;
      before: QuizQuestion;
      section: QuizEditAgentSectionSnapshot;
    };

export type QuizEditAgentChat = {
  createdAt: string;
  id: string;
  title: string;
  updatedAt: string;
};

export type QuizEditAgentMessage = {
  content: string;
  createdAt: string;
  id: string;
  operationDetails: QuizEditAgentOperation[];
  operationSummary: string[];
  references: QuizEditAgentReference[];
  role: QuizEditAgentMessageRole;
  undoId: string | null;
  undoUsedAt: string | null;
};

export type QuizEditAgentState = {
  activeChatId: string | null;
  chats: QuizEditAgentChat[];
  messages: QuizEditAgentMessage[];
};

export type QuizEditAgentSendResult =
  | {
      assistantMessage: QuizEditAgentMessage;
      activeChatId: string | null;
      chats: QuizEditAgentChat[];
      messages: QuizEditAgentMessage[];
      quiz: QuizRecord;
      success: true;
    }
  | {
      message: string;
      success: false;
    };

export type QuizEditAgentUndoResult =
  | {
      activeChatId: string | null;
      chats: QuizEditAgentChat[];
      messages: QuizEditAgentMessage[];
      quiz: QuizRecord;
      success: true;
    }
  | {
      message: string;
      success: false;
    };
