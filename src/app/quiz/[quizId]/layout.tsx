import type { ReactNode } from "react";

import { requireCurrentSession } from "@/lib/auth/session";
import { getSidebarQuizzesForUser } from "@/lib/quiz/sidebar";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function QuizLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireCurrentSession();
  const quizzes = await getSidebarQuizzesForUser(session.user.id);

  return (
    <DashboardShell quizzes={quizzes} user={session.user}>
      {children}
    </DashboardShell>
  );
}
