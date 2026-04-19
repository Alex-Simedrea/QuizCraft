import type { ReactNode } from "react";

import { AppSidebar, type SidebarQuizItem } from "@/components/dashboard/app-sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
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
      <SidebarInset>
        <DashboardHeader />
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
