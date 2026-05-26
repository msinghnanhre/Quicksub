import * as React from "react";

import { cn } from "@/lib/utils/cn";

type LogoMarkProps = React.ComponentProps<"svg"> & {
  /** Square pixel size. Defaults to 28. */
  size?: number;
};

/**
 * Q Monogram — the QuickSub brand mark.
 * Ink-filled square with a cobalt "Q" + diagonal tail stroke.
 * Theme-aware: pulls colors from CSS vars so dark mode flips correctly.
 */
function LogoMark({ size = 28, className, ...props }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden
      className={cn("shrink-0", className)}
      {...props}
    >
      <rect width="40" height="40" rx="9" fill="var(--ink)" />
      <text
        x="6"
        y="30"
        fontFamily="var(--font-sans)"
        fontWeight="800"
        fontSize="26"
        fill="var(--brand)"
        letterSpacing="-1"
      >
        Q
      </text>
      <path
        d="M25 27 L33 35"
        stroke="var(--brand)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

type LogoWordmarkProps = React.ComponentProps<"span">;

function LogoWordmark({ className, ...props }: LogoWordmarkProps) {
  return (
    <span
      data-slot="logo-wordmark"
      className={cn(
        "font-sans font-bold tracking-[-0.025em] text-ink leading-none",
        className
      )}
      {...props}
    >
      Quick<span className="text-primary">Sub</span>
    </span>
  );
}

type LogoProps = React.ComponentProps<"div"> & {
  /** Mark size in px. Defaults to 28. */
  size?: number;
  /** Render the mark alone, without the wordmark. */
  hideWordmark?: boolean;
};

function Logo({
  size = 28,
  hideWordmark = false,
  className,
  ...props
}: LogoProps) {
  return (
    <div
      data-slot="logo"
      className={cn("inline-flex items-center gap-2.5", className)}
      {...props}
    >
      <LogoMark size={size} />
      {!hideWordmark && <LogoWordmark className="text-[15px]" />}
    </div>
  );
}

export { Logo, LogoMark, LogoWordmark };
export type { LogoMarkProps, LogoProps, LogoWordmarkProps };
