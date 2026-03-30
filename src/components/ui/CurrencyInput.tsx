import { forwardRef, useCallback } from "react";
import { NumericFormat, type NumberFormatValues } from "react-number-format";
import { cn } from "@/lib/utils";

interface Props {
  value?: number | string;
  onValueChange?: (value: number | undefined) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * EUR currency input using react-number-format.
 * Returns the float value via onValueChange.
 */
export const CurrencyInput = forwardRef<HTMLInputElement, Props>(
  ({ value, onValueChange, className, placeholder = "0,00 €", disabled }, ref) => {
    const handleChange = useCallback(
      (vals: NumberFormatValues) => {
        onValueChange?.(vals.floatValue);
      },
      [onValueChange],
    );

    return (
      <NumericFormat
        getInputRef={ref}
        value={value}
        onValueChange={handleChange}
        thousandSeparator="."
        decimalSeparator=","
        decimalScale={2}
        fixedDecimalScale
        suffix=" €"
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
      />
    );
  },
);
CurrencyInput.displayName = "CurrencyInput";
