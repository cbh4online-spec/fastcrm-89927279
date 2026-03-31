import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface RHFormFieldProps {
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function RHFormField({
  name,
  label,
  placeholder,
  type = "text",
  required,
  disabled,
  className,
}: RHFormFieldProps) {
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
            <Input
              {...field}
              type={type}
              placeholder={placeholder}
              disabled={disabled}
              value={field.value ?? ""}
              onChange={(e) => {
                if (type === "number") {
                  const val = e.target.value;
                  field.onChange(val === "" ? "" : val);
                } else {
                  field.onChange(e.target.value);
                }
              }}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
