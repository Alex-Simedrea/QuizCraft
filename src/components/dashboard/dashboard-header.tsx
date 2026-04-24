"use client";

import { ChevronLeft } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { useDashboardHeaderConfig } from "@/components/dashboard/dashboard-header-context";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";

const titles: Record<string, string> = {
  "/dashboard": "",
  "/dashboard/profile": "Profile",
  "/dashboard/settings": "Settings",
};

export function DashboardHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const config = useDashboardHeaderConfig();
  const copy = config.title ?? titles[pathname] ?? titles["/dashboard"];
  const backButton =
    typeof config.backButton === "object"
      ? config.backButton
      : config.backButton
        ? {}
        : null;

  return (
    <header className="bg-background/95 supports-backdrop-filter:bg-background/70 pointer-events-none absolute inset-x-0 top-0 z-40 flex items-center justify-between gap-3 px-4 py-3 backdrop-blur md:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <SidebarTrigger className="pointer-events-auto" />
        {backButton ? (
          <Button
            aria-label={backButton.label ?? "Go back"}
            className="pointer-events-auto bg-background"
            disabled={backButton.disabled}
            onClick={() => router.back()}
            size="icon"
            type="button"
            variant="secondary"
          >
            <ChevronLeft className="size-6" />
          </Button>
        ) : null}
        {config.titlePrefix ? (
          <div className="pointer-events-auto">{config.titlePrefix}</div>
        ) : null}
        {copy ? (
          <div className="flex min-w-0 flex-col gap-0.5">
            <h1 className="truncate text-sm font-medium md:text-base">
              {copy}
            </h1>
          </div>
        ) : null}
      </div>
      {config.actions ? (
        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
          {config.actions}
        </div>
      ) : null}
    </header>
  );
}
