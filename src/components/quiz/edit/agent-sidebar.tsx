"use client";

import { MessageSquarePlus } from "lucide-react";

import { AgentPanel } from "@/components/quiz/edit/agent-sidebar/agent-panel";
import type { QuizEditAgentSidebarProps } from "@/components/quiz/edit/agent-sidebar/types";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function QuizEditAgentSidebar(props: QuizEditAgentSidebarProps) {
  return (
    <>
      <aside className="fixed top-20 right-6 z-20 hidden h-[calc(100dvh-6.5rem)] w-88 overflow-hidden rounded-3xl border lg:block">
        <AgentPanel {...props} />
      </aside>
      <div className="fixed right-4 bottom-4 z-40 lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button size="lg" type="button">
              <MessageSquarePlus data-icon="inline-start" />
              Agent
            </Button>
          </SheetTrigger>
          <SheetContent
            className="flex h-full w-full flex-col overflow-hidden sm:max-w-md"
            side="right"
          >
            <SheetHeader>
              <SheetTitle>Edit agent</SheetTitle>
            </SheetHeader>
            <div className="flex min-h-0 flex-1 overflow-hidden">
              <AgentPanel {...props} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
