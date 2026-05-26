import * as React from "react";

import { cn } from "@/lib/utils/cn";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-pulse rounded-sm bg-canvas-2 dark:bg-surface-sunk",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
