"use client";

import { usePathname } from "next/navigation";

import { SidebarTrigger } from "@/components/ui/sidebar";

const titles: Record<string, string> = {
  "/dashboard": "",
  "/dashboard/profile": "Profile",
  "/dashboard/settings": "Settings",
};

export function DashboardHeader() {
  const pathname = usePathname();
  const copy = titles[pathname] ?? titles["/dashboard"];

  return (
    <header className="flex items-center gap-3 px-4 py-3 md:px-6">
      <SidebarTrigger />
      {copy ? (
        <div className="flex min-w-0 flex-col gap-0.5">
          <h1 className="truncate text-sm font-medium md:text-base">{copy}</h1>
        </div>
      ) : null}
    </header>
  );
}
