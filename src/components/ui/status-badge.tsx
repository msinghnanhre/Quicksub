import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils/cn";

/**
 * Status pill with leading dot. Matches the 6 RFQ/quote/job statuses
 * defined in the data model (PRD §3.1).
 *
 * Use `<StatusBadge status="replied" />` — the variant maps 1:1 to
 * the database enum values for jobs.status and quotes.status.
 */
const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 h-[22px] text-[11.5px] font-semibold",
  {
    variants: {
      status: {
        draft:    "bg-status-draft-bg text-status-draft",
        pending:  "bg-status-pending-bg text-status-pending",
        replied:  "bg-status-replied-bg text-status-replied",
        awarded:  "bg-status-awarded-bg text-status-awarded",
        overdue:  "bg-status-overdue-bg text-status-overdue",
        declined: "bg-status-declined-bg text-status-declined",
      },
    },
    defaultVariants: {
      status: "draft",
    },
  }
);

const STATUS_LABELS = {
  draft: "Draft",
  pending: "Pending",
  replied: "Replied",
  awarded: "Awarded",
  overdue: "Overdue",
  declined: "Declined",
} as const;

type StatusBadgeStatus = keyof typeof STATUS_LABELS;

type StatusBadgeProps = Omit<React.ComponentProps<"span">, "children"> &
  VariantProps<typeof statusBadgeVariants> & {
    status: StatusBadgeStatus;
    /** Override the default label (e.g. "Replied · 2h ago"). */
    label?: React.ReactNode;
    /** Hide the leading dot. */
    hideDot?: boolean;
  };

function StatusBadge({
  className,
  status,
  label,
  hideDot = false,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      data-slot="status-badge"
      data-status={status}
      className={cn(statusBadgeVariants({ status }), className)}
      {...props}
    >
      {!hideDot && (
        <span
          aria-hidden
          className="size-1.5 shrink-0 rounded-full bg-current"
        />
      )}
      {label ?? STATUS_LABELS[status]}
    </span>
  );
}

export { StatusBadge, STATUS_LABELS, statusBadgeVariants };
export type { StatusBadgeProps, StatusBadgeStatus };
