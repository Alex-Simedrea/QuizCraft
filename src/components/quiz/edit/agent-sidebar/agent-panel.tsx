"use client";

import { Loader2, Plus, Send, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";

import {
  LoadingBubble,
  MessageBubble,
  sortMessages,
} from "@/components/quiz/edit/agent-sidebar/message-bubble";
import { describeReference } from "@/components/quiz/edit/agent-sidebar/reference-utils";
import {
  DRAFT_CHAT_ID,
  type QuizEditAgentSidebarProps,
} from "@/components/quiz/edit/agent-sidebar/types";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  clearQuizEditAgentHistoryAction,
  getQuizEditAgentStateAction,
  sendQuizEditAgentMessageAction,
  undoQuizEditAgentTurnAction,
} from "@/lib/quiz/edit-agent/actions";
import type {
  QuizEditAgentChat,
  QuizEditAgentMessage,
} from "@/lib/quiz/edit-agent/types";

export function AgentPanel({
  hasUnsavedChanges,
  isSaving,
  onClearReferences,
  onQuizUpdated,
  onRemoveReference,
  onSaveChanges,
  quizId,
  references,
  sections,
}: QuizEditAgentSidebarProps) {
  const [messages, setMessages] = useState<QuizEditAgentMessage[]>([]);
  const [chats, setChats] = useState<QuizEditAgentChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isDraftChat, setIsDraftChat] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isAwaitingAgent, setIsAwaitingAgent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function applyAgentState(nextState: {
    activeChatId: string | null;
    chats: QuizEditAgentChat[];
    messages: QuizEditAgentMessage[];
  }) {
    setActiveChatId(nextState.activeChatId);
    setIsDraftChat(!nextState.activeChatId);
    setChats(nextState.chats);
    setMessages(sortMessages(nextState.messages));
  }

  useEffect(() => {
    let disposed = false;

    startTransition(() => {
      void getQuizEditAgentStateAction(quizId)
        .then((nextState) => {
          if (disposed) return;
          applyAgentState(nextState);
        })
        .catch(() => {
          if (disposed) return;
          setError("Failed to load agent history.");
        });
    });

    return () => {
      disposed = true;
    };
  }, [quizId]);

  const referenceLabels = useMemo(
    () => references.map((reference) => describeReference(sections, reference)),
    [references, sections],
  );

  function selectChat(chatId: string) {
    if (chatId === DRAFT_CHAT_ID) return;

    const discardEmptyChatId =
      !isDraftChat && activeChatId && messages.length === 0
        ? activeChatId
        : undefined;

    setError(null);
    setActiveChatId(chatId);
    setIsDraftChat(false);
    if (isDraftChat || messages.length === 0) {
      setMessage("");
      onClearReferences();
    }
    startTransition(() => {
      void getQuizEditAgentStateAction(quizId, {
        chatId,
        discardEmptyChatId,
      })
        .then((nextState) => {
          applyAgentState(nextState);
        })
        .catch(() => {
          setError("Failed to load agent history.");
        });
    });
  }

  function createChat() {
    setError(null);
    setActiveChatId(null);
    setIsDraftChat(true);
    setMessages([]);
    setIsAwaitingAgent(false);
    setMessage("");
    onClearReferences();
  }

  function sendMessage() {
    if (
      !message.trim() ||
      hasUnsavedChanges ||
      (!activeChatId && !isDraftChat)
    ) {
      return;
    }
    const sentContent = message.trim();
    const previousMessages = messages;
    const optimisticMessage: QuizEditAgentMessage = {
      content: sentContent,
      createdAt: new Date().toISOString(),
      id: `optimistic-${crypto.randomUUID()}`,
      operationDetails: [],
      operationSummary: [],
      references,
      role: "user",
      undoId: null,
      undoUsedAt: null,
    };
    setError(null);
    setMessage("");
    setMessages((current) => sortMessages([...current, optimisticMessage]));
    setIsAwaitingAgent(true);
    startTransition(() => {
      void sendQuizEditAgentMessageAction(quizId, {
        ...(isDraftChat ? { createChat: true } : { chatId: activeChatId }),
        message: sentContent,
        references,
      })
        .then((result) => {
          setIsAwaitingAgent(false);
          if (!result.success) {
            setError(result.message);
            setMessages(previousMessages);
            setMessage(sentContent);
            return;
          }

          applyAgentState(result);
          onClearReferences();
          onQuizUpdated(result.quiz);
        })
        .catch(() => {
          setIsAwaitingAgent(false);
          setError("The agent request failed.");
          setMessages(previousMessages);
          setMessage(sentContent);
        });
    });
  }

  function undoTurn(undoId: string) {
    if (!activeChatId || isDraftChat) return;
    setError(null);
    setIsAwaitingAgent(false);
    startTransition(() => {
      void undoQuizEditAgentTurnAction(quizId, {
        chatId: activeChatId,
        undoId,
      }).then((result) => {
        if (!result.success) {
          setError(result.message);
          return;
        }

        applyAgentState(result);
        onClearReferences();
        onQuizUpdated(result.quiz);
      });
    });
  }

  function clearHistory() {
    if (!activeChatId || isDraftChat) return;
    setError(null);
    setIsAwaitingAgent(false);
    startTransition(() => {
      void clearQuizEditAgentHistoryAction(quizId, {
        chatId: activeChatId,
      }).then((result) => {
        if (!result.success) {
          setError(result.message);
          return;
        }

        applyAgentState(result);
        setMessage("");
        onClearReferences();
      });
    });
  }

  const focusedChatIsEmpty = messages.length === 0;
  const activeSelectValue = isDraftChat
    ? DRAFT_CHAT_ID
    : (activeChatId ?? undefined);

  return (
    <div className="bg-background grid h-full min-h-0 w-full grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
      <div className="grid shrink-0 gap-0">
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Select
              disabled={(chats.length === 0 && !isDraftChat) || isPending}
              onValueChange={selectChat}
              value={activeSelectValue}
            >
              <SelectTrigger className="min-w-0 flex-1" size="sm">
                <SelectValue placeholder="Chat" />
              </SelectTrigger>
              <SelectContent>
                {isDraftChat ? (
                  <SelectItem value={DRAFT_CHAT_ID}>New chat</SelectItem>
                ) : null}
                {chats.map((chat) => (
                  <SelectItem key={chat.id} value={chat.id}>
                    {chat.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            disabled={isPending || focusedChatIsEmpty}
            onClick={createChat}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <Plus />
            <span className="sr-only">New agent chat</span>
          </Button>
          <Button
            disabled={messages.length === 0 || isPending || isDraftChat}
            onClick={clearHistory}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            <Trash2 />
            <span className="sr-only">Clear current agent chat</span>
          </Button>
        </div>
        <Separator />
      </div>

      <div
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-3"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {messages.length === 0 ? (
          <div className="text-muted-foreground shrink-0 rounded-2xl bg-secondary px-3 py-3 text-sm">
            Ask the agent to edit selected quiz content.
          </div>
        ) : (
          messages.map((item) => (
            <MessageBubble
              disabled={isPending || hasUnsavedChanges}
              key={item.id}
              message={item}
              onUndo={undoTurn}
            />
          ))
        )}
        {isAwaitingAgent ? <LoadingBubble /> : null}
      </div>

      <div className="shrink-0 flex flex-col gap-3 border-t p-3">
        {references.length > 0 ? (
          <div className="grid min-w-0 max-w-full gap-1.5 overflow-hidden">
            {referenceLabels.map((label, index) => (
              <span
                className="border-border text-foreground grid h-5 min-w-0 max-w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-1 overflow-hidden rounded-3xl border px-2 pr-1 text-xs font-medium"
                key={`${label}-${index}`}
              >
                <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                  {label}
                </span>
                <button
                  className="hover:bg-muted shrink-0 rounded-full p-0.5"
                  onClick={() => onRemoveReference(index)}
                  type="button"
                >
                  <X className="size-3" />
                  <span className="sr-only">Remove reference</span>
                </button>
              </span>
            ))}
          </div>
        ) : null}

        {hasUnsavedChanges ? (
          <div className="bg-secondary flex flex-col gap-2 rounded-2xl p-3 text-sm">
            <p className="text-muted-foreground">
              Save manual edits before using the agent.
            </p>
            <Button
              disabled={isSaving}
              onClick={onSaveChanges}
              size="sm"
              type="button"
              variant="secondary"
            >
              {isSaving ? "Saving" : "Save changes first"}
            </Button>
          </div>
        ) : null}

        {error ? <p className="text-destructive text-sm">{error}</p> : null}

        <Textarea
          disabled={
            isPending || hasUnsavedChanges || (!activeChatId && !isDraftChat)
          }
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Ask for an edit"
          rows={4}
          value={message}
          variant="outline"
        />
        <Button
          disabled={
            !message.trim() ||
            isPending ||
            hasUnsavedChanges ||
            (!activeChatId && !isDraftChat)
          }
          onClick={sendMessage}
          type="button"
        >
          {isPending ? (
            <Loader2 className="animate-spin" data-icon="inline-start" />
          ) : (
            <Send data-icon="inline-start" />
          )}
          Send
        </Button>
      </div>
    </div>
  );
}
