import { readFile } from "node:fs/promises";

import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/auth/session";
import { getQuizRecordForUser } from "@/lib/quiz/generation/service";

function createInlineDisposition(fileName: string) {
  const fallbackName = fileName
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]+/g, "_")
    .replace(/["\\\r\n]+/g, "_");
  const encodedName = encodeURIComponent(fileName).replace(
    /['()*]/g,
    (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );

  return `inline; filename="${fallbackName}"; filename*=UTF-8''${encodedName}`;
}

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ quizId: string; resourceIndex: string }>;
  },
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

  const { quizId, resourceIndex } = await params;
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

  const index = Number.parseInt(resourceIndex, 10);

  if (!Number.isInteger(index) || index < 0 || index >= quiz.resources.length) {
    return NextResponse.json(
      {
        message: "Resource not found.",
      },
      {
        status: 404,
      },
    );
  }

  const resource = quiz.resources[index];

  try {
    const file = await readFile(resource.path);

    return new NextResponse(file, {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Disposition": createInlineDisposition(resource.name),
        "Content-Type": resource.mimeType || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      {
        message: "Resource file is unavailable.",
      },
      {
        status: 404,
      },
    );
  }
}
