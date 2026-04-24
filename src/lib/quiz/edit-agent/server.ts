import "server-only";

import { createHash } from "node:crypto";

import { and, asc, desc, eq } from "drizzle-orm";
import { type Message } from "ollama";

import { db } from "@/db";
import {
  quizEditAgentChats,
  quizEditAgentMessages,
  quizEditAgentUndos,
  quizzes,
} from "@/db/schema";
import { getQuizEnv } from "@/lib/env";
import { createQuizOllamaClient } from "@/lib/ollama-client";
import {
  buildSystemPrompt,
  buildUserPrompt,
} from "@/lib/quiz/edit-agent/prompts";
import {
  chatInputSchema,
  executeToolCall,
  getToolName,
  sectionsSchema,
  sendInputSchema,
  tools,
  undoInputSchema,
  type MutableQuiz,
} from "@/lib/quiz/edit-agent/tools";
import type {
  QuizEditAgentChat,
  QuizEditAgentMessage,
  QuizEditAgentOperation,
  QuizEditAgentReference,
  QuizEditAgentSendResult,
  QuizEditAgentState,
  QuizEditAgentUndoResult,
} from "@/lib/quiz/edit-agent/types";
import type {
  QuizDraftSnapshot,
  QuizQuestion,
  QuizRecord,
  QuizSection,
} from "@/lib/quiz/preview";

const MAX_AGENT_TOOL_ITERATIONS = 8;

function cloneSections(sections: QuizSection[]) {
  return structuredClone(sections);
}

function looksLikeEditRequest(value: string) {
  return /\b(add|change|convert|create|delete|edit|fix|make|move|rename|replace|retitle|remove|set|simplify|update|write)\b/i.test(
    value,
  );
}

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

function toAgentChat(
  chat: typeof quizEditAgentChats.$inferSelect,
): QuizEditAgentChat {
  return {
    createdAt: chat.createdAt.toISOString(),
    id: chat.id,
    title: chat.title,
    updatedAt: chat.updatedAt.toISOString(),
  };
}

function toAgentMessage(
  message: typeof quizEditAgentMessages.$inferSelect,
  undo?: typeof quizEditAgentUndos.$inferSelect | null,
): QuizEditAgentMessage {
  return {
    content: message.content,
    createdAt: message.createdAt.toISOString(),
    id: message.id,
    operationDetails: message.operationDetails,
    operationSummary: message.operationSummary,
    references: message.references,
    role: message.role,
    undoId: undo?.id ?? null,
    undoUsedAt: undo?.usedAt?.toISOString() ?? null,
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
        count: 1,
        difficulty: question.difficulty,
        id: question.id,
        type: question.type,
      });

      return groups;
    },
    [],
  );
}

function createDraftSnapshotFromEditedQuiz(
  snapshot: QuizDraftSnapshot,
  sections: QuizSection[],
): QuizDraftSnapshot {
  return {
    ...snapshot,
    sections: sections.map((section) => ({
      groups: getEditedQuestionGroups(section.questions),
      id: section.id,
      name: section.name,
    })),
  };
}

function createContentHash(input: {
  draftSnapshot: QuizDraftSnapshot;
  generatedSections: QuizSection[];
  title: string;
}) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function createVisibleContentHash(input: {
  generatedSections: QuizSection[];
  title: string;
}) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

async function runAgentLoop(args: {
  history: QuizEditAgentMessage[];
  message: string;
  quiz: QuizRecord;
  references: QuizEditAgentReference[];
}) {
  const { history, message, quiz, references } = args;
  const quizEnv = getQuizEnv();
  const ollama = createQuizOllamaClient();
  const mutableQuiz: MutableQuiz = {
    sections: cloneSections(quiz.generatedSections),
    title: quiz.title,
  };
  const operationSummary: string[] = [];
  const operationDetails: QuizEditAgentOperation[] = [];
  const runDiagnostics: string[] = [];
  const messages: Message[] = [
    {
      content: buildSystemPrompt(),
      role: "system",
    },
    {
      content: buildUserPrompt({ history, message, quiz, references }),
      role: "user",
    },
  ];

  let assistantContent = "";
  const requestLooksLikeEdit = looksLikeEditRequest(message);

  for (
    let iteration = 0;
    iteration < MAX_AGENT_TOOL_ITERATIONS;
    iteration += 1
  ) {
    const response = await ollama.chat({
      messages,
      model: quizEnv.OLLAMA_MODEL,
      options: {
        temperature: 0,
      },
      stream: false,
      think: true,
      tools,
    });

    const toolCalls = response.message.tool_calls ?? [];
    assistantContent = response.message.content.trim();
    runDiagnostics.push(
      `Iteration ${iteration + 1}: Ollama returned ${toolCalls.length} tool call${toolCalls.length === 1 ? "" : "s"}.`,
    );

    if (toolCalls.length === 0) {
      if (
        requestLooksLikeEdit &&
        operationSummary.length === 0 &&
        iteration < MAX_AGENT_TOOL_ITERATIONS - 1
      ) {
        messages.push(response.message);
        messages.push({
          content:
            "The latest user request is an edit request. Do not answer in prose. Call exactly the smallest applicable quiz-editing tool now, using IDs and indices from <inline_references> or <current_quiz>.",
          role: "user",
        });
        continue;
      }
      break;
    }

    messages.push(response.message);

    for (const toolCall of toolCalls) {
      try {
        const toolName = getToolName(toolCall.function.name);
        const result = executeToolCall(
          mutableQuiz,
          toolName,
          toolCall.function.arguments,
        );
        operationSummary.push(result.summary);
        operationDetails.push(result.operation);
        sectionsSchema.parse(mutableQuiz.sections);
        messages.push({
          content: JSON.stringify({
            result,
            success: true,
          }),
          role: "tool",
          tool_name: toolName,
        });
      } catch (error) {
        runDiagnostics.push(
          error instanceof Error ? error.message : "Tool call failed.",
        );
        messages.push({
          content: JSON.stringify({
            error: error instanceof Error ? error.message : "Tool failed.",
            success: false,
          }),
          role: "tool",
          tool_name: toolCall.function.name,
        });
      }
    }
  }

  sectionsSchema.parse(mutableQuiz.sections);

  if (!assistantContent) {
    assistantContent =
      operationSummary.length > 0
        ? `Applied ${operationSummary.length} quiz edit${operationSummary.length === 1 ? "" : "s"}.`
        : "I did not make any changes.";
  }

  if (requestLooksLikeEdit && operationSummary.length === 0) {
    assistantContent =
      "I could not apply that edit because no quiz-editing tool was called.";
  }

  return {
    assistantContent,
    operationSummary:
      operationSummary.length > 0 ? operationSummary : runDiagnostics,
    operationDetails,
    sections: mutableQuiz.sections,
    title: mutableQuiz.title,
  };
}

export async function getQuizEditAgentMessagesForUser(
  quizId: string,
  userId: string,
  chatId?: string,
) {
  const existingQuiz = await getQuizForUser(quizId, userId);
  if (!existingQuiz) {
    throw new Error("Quiz not found.");
  }

  const chats = await getQuizEditAgentChatsForUser(quizId, userId);
  const activeChat = chatId
    ? chats.find((chat) => chat.id === chatId)
    : getDefaultQuizEditAgentChat(chats);

  if (chatId && !activeChat) {
    throw new Error("Agent chat not found.");
  }

  return activeChat
    ? getQuizEditAgentMessagesForChat(quizId, userId, activeChat.id)
    : [];
}

async function getQuizForUser(quizId: string, userId: string) {
  return db.query.quizzes.findFirst({
    where: and(eq(quizzes.id, quizId), eq(quizzes.userId, userId)),
  });
}

async function getQuizEditAgentChatsForUser(quizId: string, userId: string) {
  const records = await db
    .select()
    .from(quizEditAgentChats)
    .where(
      and(
        eq(quizEditAgentChats.quizId, quizId),
        eq(quizEditAgentChats.userId, userId),
      ),
    )
    .orderBy(asc(quizEditAgentChats.createdAt), asc(quizEditAgentChats.id));

  return records;
}

function getDefaultQuizEditAgentChat(
  chats: (typeof quizEditAgentChats.$inferSelect)[],
) {
  return (
    [...chats].sort((left, right) => {
      const leftTime = left.lastSelectedAt?.getTime() ?? 0;
      const rightTime = right.lastSelectedAt?.getTime() ?? 0;
      if (leftTime !== rightTime) return rightTime - leftTime;
      return left.createdAt.getTime() - right.createdAt.getTime();
    })[0] ?? null
  );
}

async function markQuizEditAgentChatSelectedForUser(
  quizId: string,
  userId: string,
  chatId: string,
) {
  await db
    .update(quizEditAgentChats)
    .set({
      lastSelectedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(quizEditAgentChats.id, chatId),
        eq(quizEditAgentChats.quizId, quizId),
        eq(quizEditAgentChats.userId, userId),
      ),
    );
}

async function ensureQuizEditAgentChatForUser(
  quizId: string,
  userId: string,
  chatId?: string,
) {
  if (chatId) {
    const existingChat = await db.query.quizEditAgentChats.findFirst({
      where: and(
        eq(quizEditAgentChats.id, chatId),
        eq(quizEditAgentChats.quizId, quizId),
        eq(quizEditAgentChats.userId, userId),
      ),
    });

    if (!existingChat) {
      throw new Error("Agent chat not found.");
    }

    return existingChat;
  }

  const existingChat = getDefaultQuizEditAgentChat(
    await getQuizEditAgentChatsForUser(quizId, userId),
  );
  if (existingChat) {
    return existingChat;
  }

  return createQuizEditAgentChatRecordForUser(quizId, userId);
}

async function createQuizEditAgentChatRecordForUser(
  quizId: string,
  userId: string,
) {
  const chats = await getQuizEditAgentChatsForUser(quizId, userId);
  const [createdChat] = await db
    .insert(quizEditAgentChats)
    .values({
      lastSelectedAt: new Date(),
      quizId,
      title: `Chat ${chats.length + 1}`,
      userId,
    })
    .returning();

  if (!createdChat) {
    throw new Error("Failed to create agent chat.");
  }

  return createdChat;
}

async function deleteQuizEditAgentChatIfEmptyForUser(
  quizId: string,
  userId: string,
  chatId: string,
) {
  const [message] = await db
    .select({ id: quizEditAgentMessages.id })
    .from(quizEditAgentMessages)
    .where(
      and(
        eq(quizEditAgentMessages.quizId, quizId),
        eq(quizEditAgentMessages.userId, userId),
        eq(quizEditAgentMessages.chatId, chatId),
      ),
    )
    .limit(1);

  if (message) return;

  await db
    .delete(quizEditAgentChats)
    .where(
      and(
        eq(quizEditAgentChats.id, chatId),
        eq(quizEditAgentChats.quizId, quizId),
        eq(quizEditAgentChats.userId, userId),
      ),
    );
}

async function getQuizEditAgentMessagesForChat(
  quizId: string,
  userId: string,
  chatId: string,
) {
  const records = await db
    .select()
    .from(quizEditAgentMessages)
    .where(
      and(
        eq(quizEditAgentMessages.quizId, quizId),
        eq(quizEditAgentMessages.userId, userId),
        eq(quizEditAgentMessages.chatId, chatId),
      ),
    )
    .orderBy(
      asc(quizEditAgentMessages.createdAt),
      desc(quizEditAgentMessages.role),
      asc(quizEditAgentMessages.id),
    );

  if (records.length === 0) {
    return [];
  }

  const undoRecords = await db
    .select()
    .from(quizEditAgentUndos)
    .where(
      and(
        eq(quizEditAgentUndos.quizId, quizId),
        eq(quizEditAgentUndos.userId, userId),
        eq(quizEditAgentUndos.chatId, chatId),
      ),
    );
  const undoByMessageId = new Map(
    undoRecords
      .filter((undo) => undo.messageId)
      .map((undo) => [undo.messageId as string, undo]),
  );

  return records.map((record) =>
    toAgentMessage(record, undoByMessageId.get(record.id)),
  );
}

export async function getQuizEditAgentStateForUser(
  quizId: string,
  userId: string,
  input?: unknown,
): Promise<QuizEditAgentState> {
  const parsedInput = chatInputSchema.parse(input ?? {});
  const existingQuiz = await getQuizForUser(quizId, userId);
  if (!existingQuiz) {
    throw new Error("Quiz not found.");
  }

  if (
    parsedInput.discardEmptyChatId &&
    parsedInput.discardEmptyChatId !== parsedInput.chatId
  ) {
    await deleteQuizEditAgentChatIfEmptyForUser(
      quizId,
      userId,
      parsedInput.discardEmptyChatId,
    );
  }

  const chats = await getQuizEditAgentChatsForUser(quizId, userId);
  const activeChat = parsedInput.chatId
    ? chats.find((chat) => chat.id === parsedInput.chatId)
    : getDefaultQuizEditAgentChat(chats);

  if (parsedInput.chatId && !activeChat) {
    throw new Error("Agent chat not found.");
  }

  const messages = activeChat
    ? await getQuizEditAgentMessagesForChat(quizId, userId, activeChat.id)
    : [];

  if (parsedInput.chatId && activeChat) {
    await markQuizEditAgentChatSelectedForUser(quizId, userId, activeChat.id);
  }

  return {
    activeChatId: activeChat?.id ?? null,
    chats: chats.map(toAgentChat),
    messages,
  };
}

export async function clearQuizEditAgentHistoryForUser(
  quizId: string,
  userId: string,
  input?: unknown,
) {
  const parsedInput = chatInputSchema.safeParse(input ?? {});
  if (!parsedInput.success) {
    return {
      message: "Agent chat validation failed.",
      success: false as const,
    };
  }

  const existingQuiz = await getQuizForUser(quizId, userId);

  if (!existingQuiz) {
    return {
      message: "Quiz not found.",
      success: false as const,
    };
  }

  let activeChat: typeof quizEditAgentChats.$inferSelect;
  try {
    activeChat = await ensureQuizEditAgentChatForUser(
      quizId,
      userId,
      parsedInput.data.chatId,
    );
  } catch (error) {
    return {
      message:
        error instanceof Error ? error.message : "Agent chat could not load.",
      success: false as const,
    };
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(quizEditAgentUndos)
      .where(
        and(
          eq(quizEditAgentUndos.quizId, quizId),
          eq(quizEditAgentUndos.userId, userId),
          eq(quizEditAgentUndos.chatId, activeChat.id),
        ),
      );

    await tx
      .delete(quizEditAgentMessages)
      .where(
        and(
          eq(quizEditAgentMessages.quizId, quizId),
          eq(quizEditAgentMessages.userId, userId),
          eq(quizEditAgentMessages.chatId, activeChat.id),
        ),
      );
  });

  return {
    ...(await getQuizEditAgentStateForUser(quizId, userId, {
      chatId: activeChat.id,
    })),
    success: true as const,
  };
}

export async function createQuizEditAgentChatForUser(
  quizId: string,
  userId: string,
) {
  const existingQuiz = await getQuizForUser(quizId, userId);

  if (!existingQuiz) {
    return {
      message: "Quiz not found.",
      success: false as const,
    };
  }

  let createdChat: typeof quizEditAgentChats.$inferSelect;
  try {
    createdChat = await createQuizEditAgentChatRecordForUser(quizId, userId);
  } catch {
    return {
      message: "Failed to create agent chat.",
      success: false as const,
    };
  }

  return {
    ...(await getQuizEditAgentStateForUser(quizId, userId, {
      chatId: createdChat.id,
    })),
    success: true as const,
  };
}

export async function sendQuizEditAgentMessageForUser(
  quizId: string,
  userId: string,
  input: unknown,
): Promise<QuizEditAgentSendResult> {
  const parsedInput = sendInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return {
      message: "Agent message validation failed.",
      success: false,
    };
  }

  const existingQuiz = await db.query.quizzes.findFirst({
    where: and(eq(quizzes.id, quizId), eq(quizzes.userId, userId)),
  });

  if (!existingQuiz) {
    return {
      message: "Quiz not found.",
      success: false,
    };
  }

  if (existingQuiz.status !== "ready") {
    return {
      message: "Only ready quizzes can be edited.",
      success: false,
    };
  }

  const quiz = toQuizRecord(existingQuiz);
  let activeChat: typeof quizEditAgentChats.$inferSelect;
  try {
    activeChat = parsedInput.data.createChat
      ? await createQuizEditAgentChatRecordForUser(quizId, userId)
      : await ensureQuizEditAgentChatForUser(
          quizId,
          userId,
          parsedInput.data.chatId,
        );
  } catch (error) {
    return {
      message:
        error instanceof Error ? error.message : "Agent chat could not load.",
      success: false,
    };
  }
  const beforeHash = createVisibleContentHash({
    generatedSections: quiz.generatedSections,
    title: quiz.title,
  });
  const history = await getQuizEditAgentMessagesForChat(
    quizId,
    userId,
    activeChat.id,
  );

  let agentResult: Awaited<ReturnType<typeof runAgentLoop>>;
  try {
    agentResult = await runAgentLoop({
      history,
      message: parsedInput.data.message,
      quiz,
      references: parsedInput.data.references,
    });
  } catch (error) {
    return {
      message:
        error instanceof Error
          ? error.message
          : "The quiz editing agent failed.",
      success: false,
    };
  }

  const nextDraftSnapshot = createDraftSnapshotFromEditedQuiz(
    quiz.draftSnapshot,
    agentResult.sections,
  );
  const afterHash = createVisibleContentHash({
    generatedSections: agentResult.sections,
    title: agentResult.title,
  });
  const changed = beforeHash !== afterHash;

  const transactionResult = await db.transaction(async (tx) => {
    const now = Date.now();
    const currentQuiz = await tx.query.quizzes.findFirst({
      where: and(eq(quizzes.id, quizId), eq(quizzes.userId, userId)),
    });

    if (!currentQuiz) {
      return {
        message: "Quiz not found.",
        success: false as const,
      };
    }

    const currentHash = createVisibleContentHash({
      generatedSections: currentQuiz.generatedSections,
      title: currentQuiz.title,
    });

    if (currentHash !== beforeHash) {
      return {
        message:
          "The quiz changed while the agent was working. Refresh and try again.",
        success: false as const,
      };
    }

    const [userMessage] = await tx
      .insert(quizEditAgentMessages)
      .values({
        chatId: activeChat.id,
        content: parsedInput.data.message,
        createdAt: new Date(now),
        quizId,
        references: parsedInput.data.references,
        role: "user",
        updatedAt: new Date(now),
        userId,
      })
      .returning();

    const [assistantMessage] = await tx
      .insert(quizEditAgentMessages)
      .values({
        chatId: activeChat.id,
        content: agentResult.assistantContent,
        createdAt: new Date(now + 1),
        operationDetails: agentResult.operationDetails,
        operationSummary: agentResult.operationSummary,
        quizId,
        references: [],
        role: "assistant",
        updatedAt: new Date(now + 1),
        userId,
      })
      .returning();

    if (!userMessage || !assistantMessage) {
      return {
        message: "Failed to persist agent messages.",
        success: false as const,
      };
    }

    let updatedQuiz = currentQuiz;
    let assistantUndo: typeof quizEditAgentUndos.$inferSelect | null = null;
    if (changed) {
      const [nextQuiz] = await tx
        .update(quizzes)
        .set({
          draftSnapshot: nextDraftSnapshot,
          generatedSections: agentResult.sections,
          title: agentResult.title,
          updatedAt: new Date(),
        })
        .where(and(eq(quizzes.id, quizId), eq(quizzes.userId, userId)))
        .returning();

      if (!nextQuiz) {
        return {
          message: "Failed to update quiz.",
          success: false as const,
        };
      }

      updatedQuiz = nextQuiz;

      const [undo] = await tx
        .insert(quizEditAgentUndos)
        .values({
          beforeDraftSnapshot: quiz.draftSnapshot,
          beforeGeneratedSections: quiz.generatedSections,
          beforeTitle: quiz.title,
          chatId: activeChat.id,
          messageId: assistantMessage.id,
          quizId,
          resultContentHash: createContentHash({
            draftSnapshot: nextDraftSnapshot,
            generatedSections: agentResult.sections,
            title: agentResult.title,
          }),
          userId,
        })
        .returning();
      assistantUndo = undo ?? null;
    }

    await tx
      .update(quizEditAgentChats)
      .set({ lastSelectedAt: new Date(), updatedAt: new Date() })
      .where(eq(quizEditAgentChats.id, activeChat.id));

    return {
      assistantMessage: toAgentMessage(assistantMessage, assistantUndo),
      quiz: toQuizRecord(updatedQuiz),
      success: true as const,
    };
  });

  if (!transactionResult.success) {
    return transactionResult;
  }

  const state = await getQuizEditAgentStateForUser(quizId, userId, {
    chatId: activeChat.id,
  });

  return {
    assistantMessage: transactionResult.assistantMessage,
    activeChatId: state.activeChatId,
    chats: state.chats,
    messages: state.messages,
    quiz: transactionResult.quiz,
    success: true,
  };
}

export async function undoQuizEditAgentTurnForUser(
  quizId: string,
  userId: string,
  input: unknown,
): Promise<QuizEditAgentUndoResult> {
  const parsedInput = undoInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return {
      message: "Undo validation failed.",
      success: false,
    };
  }

  const result = await db.transaction(async (tx) => {
    const now = Date.now();
    const undo = await tx.query.quizEditAgentUndos.findFirst({
      where: and(
        eq(quizEditAgentUndos.id, parsedInput.data.undoId),
        eq(quizEditAgentUndos.quizId, quizId),
        eq(quizEditAgentUndos.userId, userId),
        eq(quizEditAgentUndos.chatId, parsedInput.data.chatId),
      ),
    });

    if (!undo) {
      return {
        message: "That agent edit could not be found.",
        success: false as const,
      };
    }

    if (undo.usedAt) {
      return {
        message: "That agent edit was already undone.",
        success: false as const,
      };
    }

    const currentQuiz = await tx.query.quizzes.findFirst({
      where: and(eq(quizzes.id, quizId), eq(quizzes.userId, userId)),
    });

    if (!currentQuiz) {
      return {
        message: "Quiz not found.",
        success: false as const,
      };
    }

    const [updatedQuiz] = await tx
      .update(quizzes)
      .set({
        draftSnapshot: undo.beforeDraftSnapshot,
        generatedSections: undo.beforeGeneratedSections,
        title: undo.beforeTitle,
        updatedAt: new Date(),
      })
      .where(and(eq(quizzes.id, quizId), eq(quizzes.userId, userId)))
      .returning();

    await tx
      .update(quizEditAgentUndos)
      .set({
        updatedAt: new Date(),
        usedAt: new Date(),
      })
      .where(eq(quizEditAgentUndos.id, undo.id));

    if (!updatedQuiz) {
      return {
        message: "Failed to restore the quiz.",
        success: false as const,
      };
    }

    const [assistantMessage] = await tx
      .insert(quizEditAgentMessages)
      .values({
        chatId: parsedInput.data.chatId,
        content: "Restored the quiz to the state before that agent edit.",
        createdAt: new Date(now),
        operationSummary: ["Restored the quiz to its previous saved state."],
        quizId,
        references: [],
        role: "assistant",
        updatedAt: new Date(now),
        userId,
      })
      .returning();

    await tx
      .update(quizEditAgentChats)
      .set({ lastSelectedAt: new Date(), updatedAt: new Date() })
      .where(eq(quizEditAgentChats.id, parsedInput.data.chatId));

    return {
      message: assistantMessage ? toAgentMessage(assistantMessage) : null,
      quiz: toQuizRecord(updatedQuiz),
      success: true as const,
    };
  });

  if (!result.success) {
    return result;
  }

  const state = await getQuizEditAgentStateForUser(quizId, userId, {
    chatId: parsedInput.data.chatId,
  });

  return {
    activeChatId: state.activeChatId,
    chats: state.chats,
    messages: state.messages,
    quiz: result.quiz,
    success: true,
  };
}
