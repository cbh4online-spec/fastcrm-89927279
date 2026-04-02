import { forwardRef, useState, useCallback, useEffect, useMemo } from "react";
import { AsYouType, parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js";
import { isValidPhone } from "@/utils/phone";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Check, AlertCircle } from "lucide-react";

interface Props {
  value?: string;
  onChange?: (value: string) => void;
  onValidChange?: (valid: boolean) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  defaultCountry?: CountryCode;
}

/**
 * International phone input with AsYouType formatting.
 * Stores the raw user input; parent receives formatted value.
 * Shows validation indicator and red border on invalid numbers.
 */
export const PhoneInput = forwardRef<HTMLInputElement, Props>(
  (
    {
      value = "",
      onChange,
      onValidChange,
      className,
      placeholder = "+351 912 345 678",
      disabled,
      defaultCountry = "PT",
    },
    ref,
  ) => {
    // Internal display value (formatted)
    const [displayValue, setDisplayValue] = useState(() => {
      if (!value) return "";
      const formatter = new AsYouType(defaultCountry);
      return formatter.input(value);
    });

    // Sync external value changes
    useEffect(() => {
      if (!value) {
        setDisplayValue("");
        return;
      }
      const formatter = new AsYouType(defaultCountry);
      const formatted = formatter.input(value);
      setDisplayValue(formatted);
    }, [value, defaultCountry]);

    const valid = useMemo(() => {
      if (!value) return null; // empty = neutral
      return isValidPhone(value, defaultCountry);
    }, [value, defaultCountry]);

    // Notify parent of validity
    useEffect(() => {
      if (valid !== null) {
        onValidChange?.(valid);
      }
    }, [valid, onValidChange]);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        let raw = e.target.value;

        // If user types digits without +, prepend country code
        if (raw && !raw.startsWith("+") && raw.length >= 1) {
          // Only auto-prepend if it looks like they're typing a local number
          const digitsOnly = raw.replace(/\D/g, "");
          if (digitsOnly.length > 0 && !raw.startsWith("0")) {
            raw = `+351${digitsOnly}`;
          }
        }

        const formatter = new AsYouType(defaultCountry);
        const formatted = formatter.input(raw);
        setDisplayValue(formatted);

        // Extract the raw number for storage (digits + leading +)
        const number = formatter.getNumber();
        const e164 = number?.format("E.164") ?? raw.replace(/[^\d+]/g, "");
        onChange?.(e164);
      },
      [onChange, defaultCountry],
    );

    const showIcon = value && value.length >= 4;

    return (
      <div className="relative">
        <Input
          ref={ref}
          type="tel"
          value={displayValue}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "pr-8",
            valid === false && "border-destructive focus-visible:ring-destructive",
            valid === true && "border-green-500 focus-visible:ring-green-500",
            className,
          )}
        />
        {showIcon && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
            {valid ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-destructive" />
            )}
          </div>
        )}
      </div>
    );
  },
);
PhoneInput.displayName = "PhoneInput";
