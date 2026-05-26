"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@/lib/utils/cn";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full",
        "bg-border-strong transition-colors duration-200 ease-out",
        "data-[state=checked]:bg-primary",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block size-4 translate-x-0.5 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0_/_0.2)] ring-0",
          "transition-transform duration-200 ease-out",
          "data-[state=checked]:translate-x-[18px]"
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
