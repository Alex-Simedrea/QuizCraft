"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { startTransition, useState } from "react";

import { logoutAction } from "@/lib/auth/actions";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";

export function LogoutMenuItem() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  async function handleLogout() {
    if (isPending) {
      return;
    }

    setIsPending(true);

    try {
      await logoutAction();
      startTransition(() => {
        router.replace("/login");
        router.refresh();
      });
    } catch (error) {
      console.error("Failed to sign out.", error);
      setIsPending(false);
    }
  }

  return (
    <DropdownMenuItem disabled={isPending} onSelect={handleLogout}>
      {isPending ? <Spinner /> : <LogOut />}
      Sign out
    </DropdownMenuItem>
  );
}
