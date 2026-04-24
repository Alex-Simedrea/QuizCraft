import type { ReactNode } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireCurrentSession } from "@/lib/auth/session";
import { getSidebarQuizzesForUser } from "@/lib/quiz/sidebar";

export default async function AttemptsLayout({
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
