import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { getQuizRecordForUser } from "@/lib/quiz-generation-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ quizId: string }> },
) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json(
      {
        message: "Unauthorized.",
      },
      {
        status: 401,
      },
    );
  }

  const { quizId } = await params;
  const quiz = await getQuizRecordForUser(quizId, session.user.id);

  if (!quiz) {
    return NextResponse.json(
      {
        message: "Quiz not found.",
      },
      {
        status: 404,
      },
    );
  }

  return NextResponse.json(quiz, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
