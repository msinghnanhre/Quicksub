"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap",
    "font-medium leading-none tracking-[-0.01em]",
    "transition-[background-color,box-shadow,color] duration-100 ease-out",
    "outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-45",
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-3.5 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-brand-hover",
        default:
          "bg-surface text-ink-2 ring-1 ring-border shadow-[0_1px_2px_rgb(10_18_40_/_0.05)] ring-inset hover:bg-canvas-2",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--brand)_26%,var(--canvas))]",
        outline:
          "bg-transparent text-ink-2 ring-1 ring-border ring-inset hover:bg-canvas-2",
        ghost: "bg-transparent text-ink-2 hover:bg-canvas-2",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-[color-mix(in_oklch,var(--destructive)_86%,black)]",
        link: "bg-transparent text-primary underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-[30px] px-2.5 text-xs rounded-xs",
        default: "h-[38px] px-3.5 text-[13.5px] rounded-sm",
        lg: "h-11 px-5 text-[15px] rounded-md",
        icon: "h-[38px] w-[38px] rounded-sm",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
export type { ButtonProps };
