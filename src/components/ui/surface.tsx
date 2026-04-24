import * as React from "react";

import { cn } from "@/lib/utils";

function Surface({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="surface"
      className={cn("bg-secondary rounded-4xl p-3", className)}
      {...props}
    />
  );
}

function SurfaceInset({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="surface-inset"
      className={cn("bg-background rounded-2xl p-3", className)}
      {...props}
    />
  );
}

export { Surface, SurfaceInset };
