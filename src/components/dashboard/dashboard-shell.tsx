import type { ReactNode } from "react";

import {
  AppSidebar,
  type SidebarQuizItem,
} from "@/components/dashboard/app-sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardHeaderProvider } from "@/components/dashboard/dashboard-header-context";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

type DashboardShellProps = {
  children: ReactNode;
  quizzes: SidebarQuizItem[];
  user: {
    firstName: string;
    lastName: string;
    name: string;
    email: string;
  };
};

export function DashboardShell({
  children,
  quizzes,
  user,
}: DashboardShellProps) {
  return (
    <SidebarProvider>
      <AppSidebar quizzes={quizzes} user={user} />
      <SidebarInset className="h-[calc(100dvh-16px)] overflow-hidden">
        <DashboardHeaderProvider>
          <DashboardHeader />
          <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto">
            {children}
          </div>
        </DashboardHeaderProvider>
      </SidebarInset>
    </SidebarProvider>
  );
}
