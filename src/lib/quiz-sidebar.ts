import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { quizzes } from "@/db/schema";
import type { SidebarQuizItem } from "@/components/dashboard/app-sidebar";

export async function getSidebarQuizzesForUser(
  userId: string,
): Promise<SidebarQuizItem[]> {
  const rows = await db.query.quizzes.findMany({
    columns: {
      id: true,
      title: true,
      status: true,
    },
    where: eq(quizzes.userId, userId),
    orderBy: [desc(quizzes.updatedAt), desc(quizzes.createdAt)],
  });

  return rows.map((quiz) => ({
    id: quiz.id,
    href: `/quiz/${quiz.id}`,
    status: quiz.status,
    title: quiz.title,
  }));
}
