import * as React from "react";

import { cn } from "@/lib/utils/cn";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-[38px] w-full min-w-0 rounded-sm border border-input bg-surface px-3.5 text-[13.5px] text-ink",
        "placeholder:text-ink-subtle",
        "transition-[border-color,box-shadow] duration-100 ease-out outline-none",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/40 aria-invalid:ring-2 aria-invalid:ring-offset-2 aria-invalid:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-ink",
        "selection:bg-secondary selection:text-secondary-foreground",
        className
      )}
      {...props}
    />
  );
}

export { Input };
