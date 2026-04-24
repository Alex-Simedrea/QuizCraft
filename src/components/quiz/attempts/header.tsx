"use client";

import { useMemo } from "react";

import { useDashboardHeader } from "@/components/dashboard/dashboard-header-context";

export function QuizAttemptsHeader() {
  const headerConfig = useMemo(
    () => ({
      backButton: { label: "Back to quiz" },
      title: "Attempts",
    }),
    [],
  );

  useDashboardHeader(headerConfig);

  return null;
}
