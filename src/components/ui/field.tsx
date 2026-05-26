import * as React from "react";

import { cn } from "@/lib/utils/cn";
import { Label } from "@/components/ui/label";

function Field({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field"
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    />
  );
}

function FieldLabel({
  className,
  ...props
}: React.ComponentProps<typeof Label>) {
  return <Label className={cn(className)} {...props} />;
}

function FieldHint({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-hint"
      className={cn("text-xs text-ink-subtle", className)}
      {...props}
    />
  );
}

function FieldError({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-error"
      role="alert"
      className={cn("text-xs text-destructive", className)}
      {...props}
    />
  );
}

export { Field, FieldLabel, FieldHint, FieldError };
