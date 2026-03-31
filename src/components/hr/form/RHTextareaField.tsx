import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";

interface RHTextareaFieldProps {
  name: string;
  label: string;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function RHTextareaField({
  name,
  label,
  placeholder,
  rows = 3,
  required,
  disabled,
  className,
}: RHTextareaFieldProps) {
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
          <FormControl>
            <Textarea
              {...field}
              placeholder={placeholder}
              rows={rows}
              disabled={disabled}
              value={field.value ?? ""}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
