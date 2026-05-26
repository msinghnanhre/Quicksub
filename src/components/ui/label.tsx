"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";

import { cn } from "@/lib/utils/cn";

function Label({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "text-[13px] font-medium leading-none text-ink-2 select-none",
        "peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        "group-data-[disabled=true]:cursor-not-allowed group-data-[disabled=true]:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Label };
