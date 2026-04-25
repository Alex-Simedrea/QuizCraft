"use client";

import { CircleAlertIcon } from "lucide-react";
import Link from "next/link";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { SurfaceInset } from "@/components/ui/surface";

export function MetricCard({
  description,
  href,
  icon: Icon,
  title,
  value,
}: {
  description: string;
  href?: string;
  icon: React.ComponentType;
  title: string;
  value: string;
}) {
  const content = (
    <SurfaceInset className="flex min-h-36 flex-col justify-between gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <div className="font-heading text-base font-semibold">{title}</div>
          <div className="truncate text-sm text-muted-foreground font-medium">
            {description}
          </div>
        </div>
        <span className="flex size-6 shrink-0 items-center justify-center [&>svg]:size-5">
          <Icon />
        </span>
      </div>
      <div className="text-3xl font-medium tabular-nums">{value}</div>
    </SurfaceInset>
  );

  if (href) {
    return (
      <Link className="block rounded-2xl" href={href}>
        {content}
      </Link>
    );
  }

  return content;
}

export function ChartEmpty({ message }: { message: string }) {
  return (
    <Empty className="min-h-72">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CircleAlertIcon />
        </EmptyMedia>
        <EmptyTitle>Not enough data</EmptyTitle>
        <EmptyDescription>{message}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
