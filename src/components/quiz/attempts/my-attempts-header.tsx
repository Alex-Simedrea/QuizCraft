"use client";

import { useMemo } from "react";

import { useDashboardHeader } from "@/components/dashboard/dashboard-header-context";

export function MyAttemptsHeader() {
  const headerConfig = useMemo(
    () => ({
      title: "Attempts",
    }),
    [],
  );

  useDashboardHeader(headerConfig);

  return null;
}
