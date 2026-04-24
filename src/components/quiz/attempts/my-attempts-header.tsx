"use client";

import { useMemo } from "react";

import { useDashboardHeader } from "@/components/dashboard/dashboard-header-context";

export function MyAttemptsHeader() {
  const headerConfig = useMemo(
    () => ({
      title: "My attempts",
    }),
    [],
  );

  useDashboardHeader(headerConfig);

  return null;
}
