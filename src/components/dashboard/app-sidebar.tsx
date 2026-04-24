"use client";

import {
  ChevronsUpDown,
  CircleAlert,
  ClipboardList,
  ListEnd,
  Plus,
  Settings,
  Trash2,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";

import { LogoutMenuItem } from "@/components/dashboard/logout-menu-item";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";
import { deleteQuizAction } from "@/lib/quiz/generation/actions";
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

function DeleteQuizSidebarAction({ quiz }: { quiz: SidebarQuizItem }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isDeleting, startDeleting] = useTransition();

  function deleteQuiz() {
    startDeleting(() => {
      void deleteQuizAction(quiz.id).then((result) => {
        if (!result.success) {
          window.alert(result.message);
          return;
        }

        if (pathname.startsWith(`/quiz/${quiz.id}`)) {
          router.push("/dashboard");
        }

        router.refresh();
      });
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <SidebarMenuAction
          aria-label={`Delete ${quiz.title}`}
          disabled={isDeleting}
          showOnHover
          type="button"
        >
          <Trash2 />
        </SidebarMenuAction>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete quiz?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete “{quiz.title}” and all of its quiz
            data, attempts, and edit-agent chats.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isDeleting}
            onClick={deleteQuiz}
            variant="destructive"
          >
            Delete quiz
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
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
                    <DeleteQuizSidebarAction quiz={quiz} />
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
