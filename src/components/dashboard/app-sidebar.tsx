"use client";

import {
  ChevronsUpDown,
  CircleAlert,
  ClipboardList,
  ListEnd,
  Plus,
  Settings,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { LogoutMenuItem } from "@/components/dashboard/logout-menu-item";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import type { QuizStatus } from "@/lib/quiz/preview";

export type SidebarQuizItem = {
  id: string;
  href: string;
  status: QuizStatus;
  title: string;
};

type AppSidebarProps = {
  quizzes: SidebarQuizItem[];
  user: {
    firstName: string;
    lastName: string;
    name: string;
    email: string;
  };
};

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function AppSidebar({ quizzes, user }: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader className="gap-1">
        <SidebarMenuButton asChild className="w-full justify-start">
          <Link href="/dashboard">
            <Plus data-icon="inline-start" />
            New quiz
          </Link>
        </SidebarMenuButton>
        <SidebarMenuButton asChild data-active={pathname === "/attempts"}>
          <Link href="/attempts">
            <ClipboardList data-icon="inline-start" />
            My attempts
          </Link>
        </SidebarMenuButton>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Quizzes</SidebarGroupLabel>
          <SidebarGroupContent>
            {quizzes.length > 0 ? (
              <SidebarMenu>
                {quizzes.map((quiz) => (
                  <SidebarMenuItem key={quiz.id}>
                    <SidebarMenuButton
                      asChild
                      data-active={pathname === quiz.href}
                    >
                      <Link href={quiz.href}>
                        <span className="flex min-w-0 gap-0.5 text-left justify-between w-full items-center">
                          <span className="truncate">{quiz.title}</span>
                          {quiz.status === "generating" && <Spinner />}
                          {quiz.status === "failed" && (
                            <CircleAlert className="text-red-400" />
                          )}
                          {quiz.status === "queued" && <ListEnd />}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            ) : (
              <div className="rounded-2xl border border-dashed px-3 py-4 text-sm text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
                No quizzes yet
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  className="h-auto min-h-12"
                  size="lg"
                  tooltip="Account"
                >
                  <Avatar size="lg">
                    <AvatarFallback>
                      {getInitials(user.firstName, user.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
                    <span className="truncate">{user.name}</span>
                    <span className="truncate text-xs text-sidebar-foreground/70">
                      {user.email}
                    </span>
                  </span>
                  <ChevronsUpDown className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top">
                <DropdownMenuLabel className="flex flex-col gap-1">
                  <span className="truncate text-sm text-foreground">
                    {user.name}
                  </span>
                  <span className="truncate text-muted-foreground">
                    {user.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/profile">
                      <UserRound />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings">
                      <Settings />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <LogoutMenuItem />
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
