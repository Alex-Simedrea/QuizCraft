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
  const titleAlign = config.titleAlign ?? "center";
  const backButton =
    typeof config.backButton === "object"
      ? config.backButton
      : config.backButton
        ? {}
        : null;

  return (
    <header className="bg-background/95 supports-backdrop-filter:bg-background/70 pointer-events-none absolute inset-x-0 top-0 z-40 flex items-center justify-between gap-3 px-4 py-3 backdrop-blur md:px-6">
      <div className="relative z-10 flex min-w-0 items-center gap-2">
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
        {titleAlign === "left" && (copy || config.titlePrefix) ? (
          <div className="pointer-events-none flex min-w-0 items-center gap-2">
            {config.titlePrefix ? (
              <div className="pointer-events-auto">{config.titlePrefix}</div>
            ) : null}
            {copy ? (
              <h1 className="truncate text-sm font-medium md:text-base">
                {copy}
              </h1>
            ) : null}
          </div>
        ) : null}
      </div>
      {titleAlign === "center" && (copy || config.titlePrefix) ? (
        <div className="pointer-events-none absolute inset-x-20 flex min-w-0 items-center justify-center gap-2">
          {config.titlePrefix ? (
            <div className="pointer-events-auto">{config.titlePrefix}</div>
          ) : null}
          {copy ? (
            <h1 className="truncate text-center text-sm font-medium md:text-base">
              {copy}
            </h1>
          ) : null}
        </div>
      ) : null}
      {config.actions ? (
        <div className="pointer-events-auto relative z-10 flex flex-wrap items-center justify-end gap-2">
          {config.actions}
        </div>
      ) : (
        <div className="relative z-10" />
      )}
    </header>
  );
}
