import { forwardRef, useCallback } from "react";
import { PatternFormat, type NumberFormatValues } from "react-number-format";
import { isValidPhone, formatPhone } from "@/utils/phone";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface Props {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * International phone input with PT default.
 * Validates with libphonenumber-js and shows a red border on invalid numbers.
 */
export const PhoneInput = forwardRef<HTMLInputElement, Props>(
  ({ value = "", onChange, className, placeholder = "+351 9XX XXX XXX", disabled }, ref) => {
    const valid = !value || isValidPhone(value);

    const handleChange = useCallback(
      (vals: NumberFormatValues) => {
        onChange?.(vals.value);
      },
      [onChange],
    );

    return (
      <Input
        ref={ref}
        type="tel"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(!valid && "border-destructive focus-visible:ring-destructive", className)}
      />
    );
  },
);
PhoneInput.displayName = "PhoneInput";
