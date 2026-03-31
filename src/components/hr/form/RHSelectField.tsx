import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SelectOption {
  value: string;
  label: string;
}

interface RHSelectFieldProps {
  name: string;
  label: string;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  allowNone?: boolean;
  noneLabel?: string;
  className?: string;
}

export function RHSelectField({
  name,
  label,
  options,
  placeholder = "Selecionar",
  required,
  disabled,
  allowNone = false,
  noneLabel = "Nenhum",
  className,
}: RHSelectFieldProps) {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            {label}
            {required && <span className="text-destructive ml-0.5">*</span>}
          </FormLabel>
          <Select
            value={field.value || (allowNone ? "none" : "")}
            onValueChange={(v) => field.onChange(v === "none" ? null : v)}
            disabled={disabled}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {allowNone && <SelectItem value="none">{noneLabel}</SelectItem>}
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
