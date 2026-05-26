import * as React from "react";

import { cn } from "@/lib/utils/cn";

function Textarea({
  className,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-[80px] w-full rounded-sm border border-input bg-surface px-3.5 py-2.5 text-[13.5px] text-ink",
        "placeholder:text-ink-subtle",
        "transition-[border-color,box-shadow] duration-100 ease-out outline-none",
        "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/40 aria-invalid:ring-2 aria-invalid:ring-offset-2 aria-invalid:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "resize-y",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
