import * as React from "react";

import { cn } from "@/lib/utils/cn";
import { Input } from "@/components/ui/input";
import { InputAddon, InputGroup } from "@/components/ui/input-group";

type CurrencyInputProps = Omit<
  React.ComponentProps<typeof Input>,
  "type" | "inputMode"
> & {
  /** Currency symbol shown as leading addon. Defaults to "$". */
  symbol?: string;
  /** Currency code shown as trailing addon. Defaults to "CAD" (per PRD §11.7). */
  currency?: string;
};

/**
 * Price input — `$ 0.00 CAD` shape used on the supplier reply page and the
 * job creation flow. All prices in the app are CAD (PRD §11.7).
 */
function CurrencyInput({
  symbol = "$",
  currency = "CAD",
  className,
  ...props
}: CurrencyInputProps) {
  return (
    <InputGroup>
      <InputAddon>{symbol}</InputAddon>
      <Input
        type="text"
        inputMode="decimal"
        placeholder="0.00"
        className={cn("text-right font-mono", className)}
        {...props}
      />
      <InputAddon>{currency}</InputAddon>
    </InputGroup>
  );
}

export { CurrencyInput };
export type { CurrencyInputProps };
