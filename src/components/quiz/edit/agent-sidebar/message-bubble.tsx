"use client";

import { Loader2, RotateCcw } from "lucide-react";

import { OperationPreviewList } from "@/components/quiz/edit/agent-sidebar/operation-preview";
import { Button } from "@/components/ui/button";
import type { QuizEditAgentMessage } from "@/lib/quiz/edit-agent/types";
import { cn } from "@/lib/utils";

export function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function sortMessages(messages: QuizEditAgentMessage[]) {
  return [...messages].sort((left, right) => {
    const timeDifference =
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    if (timeDifference !== 0) return timeDifference;
    if (left.role !== right.role) return left.role === "user" ? -1 : 1;
    return left.id.localeCompare(right.id);
  });
}

export function MessageBubble({
  disabled,
  message,
  onUndo,
}: {
  disabled: boolean;
  message: QuizEditAgentMessage;
  onUndo: (undoId: string) => void;
}) {
  const isUser = message.role === "user";
  const canUndo = !isUser && message.undoId && !message.undoUsedAt;
  const hasOperationDetails = message.operationDetails.length > 0;

  return (
    <article className="flex flex-col gap-1">
      <div
        className={cn(
          "shrink-0 flex min-w-0 max-w-[92%] flex-col gap-1 overflow-hidden rounded-2xl px-3 py-2 text-sm",
          isUser
            ? "ml-auto bg-primary text-primary-foreground"
            : "mr-auto bg-secondary",
        )}
      >
        <p className="whitespace-pre-wrap wrap-break-word">{message.content}</p>
        {hasOperationDetails ? (
          <OperationPreviewList operations={message.operationDetails} />
        ) : message.operationSummary.length > 0 ? (
          <ul className="text-muted-foreground flex flex-col gap-1 text-xs">
            {message.operationSummary.map((item, index) => (
              <li key={`${message.id}-${index}`}>{item}</li>
            ))}
          </ul>
        ) : null}
      </div>
      <div
        className={cn(
          "flex items-center gap-1",
          isUser ? "ml-auto pr-2" : "mr-auto pl-2",
        )}
      >
        <time
          className={cn(
            "pt-0.5 text-[0.7rem] leading-none text-muted-foreground",
          )}
          dateTime={message.createdAt}
          title={new Date(message.createdAt).toLocaleString()}
        >
          {formatMessageTime(message.createdAt)}
        </time>
        {canUndo && (
          <Button
            disabled={disabled}
            onClick={() => onUndo(message.undoId as string)}
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            <RotateCcw data-icon="inline-start" />
          </Button>
        )}
      </div>
    </article>
  );
}

export function LoadingBubble() {
  return (
    <article className="bg-secondary mr-auto shrink-0 flex max-w-[92%] items-center gap-2 rounded-2xl px-3 py-2 text-sm">
      <Loader2 className="size-4 animate-spin" />
      <span className="text-muted-foreground">Working on it</span>
    </article>
  );
}
