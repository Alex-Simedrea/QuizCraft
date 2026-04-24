"use client";

import { GripVertical } from "lucide-react";

import { Button } from "@/components/ui/button";

type SortableHandleProps = {
  handleRef?: (element: Element | null) => void;
  label: string;
};

export function SortableHandle({ handleRef, label }: SortableHandleProps) {
  return (
    <Button
      aria-label={label}
      ref={handleRef}
      size="icon-sm"
      type="button"
      variant="ghost"
    >
      <GripVertical data-icon="inline-start" />
    </Button>
  );
}
