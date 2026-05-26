import * as React from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Compose an input with leading/trailing addons or icons.
 *
 * ```tsx
 * // Price input with $ + CAD chips
 * <InputGroup>
 *   <InputAddon>$</InputAddon>
 *   <Input className="font-mono" placeholder="0.00" />
 *   <InputAddon>CAD</InputAddon>
 * </InputGroup>
 *
 * // Search with leading icon
 * <InputGroup>
 *   <InputIcon><Search /></InputIcon>
 *   <Input placeholder="Search subs…" />
 * </InputGroup>
 * ```
 *
 * Border radii on adjacent addons + input are squared off automatically
 * via the `.input-group` selectors in globals.css.
 */
function InputGroup({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-group"
      className={cn("input-group flex w-full items-stretch", className)}
      {...props}
    />
  );
}

function InputAddon({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="input-addon"
      className={cn(
        "inline-flex h-[38px] shrink-0 items-center border border-input bg-canvas-2 px-2.5 text-[13px] text-ink-muted",
        "first:rounded-l-sm last:rounded-r-sm",
        className
      )}
      {...props}
    />
  );
}

function InputIcon({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="input-icon"
      aria-hidden
      className={cn(
        "pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 inline-flex items-center text-ink-subtle [&_svg]:size-3.5",
        className
      )}
      {...props}
    />
  );
}

/**
 * Wrap an Input + InputIcon together so the icon overlays the input.
 * Use when the icon is decorative (search glass, lock, etc.) — not a click target.
 */
function InputWithIcon({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="input-with-icon"
      className={cn(
        "relative w-full [&_[data-slot=input]]:pl-8",
        className
      )}
      {...props}
    />
  );
}

export { InputGroup, InputAddon, InputIcon, InputWithIcon };
