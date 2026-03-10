import { InlineFieldEditor } from "@/components/objects/InlineFieldEditor";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: unknown;
  fieldType?: string;
  options?: string[];
  onSave: (value: unknown) => void;
  placeholder?: string;
  className?: string;
}

export function SecurityInlineField({ label, value, fieldType = "text", options, onSave, placeholder = "—", className }: Props) {
  return (
    <div className={cn("flex items-center justify-between gap-4 min-h-[36px]", className)}>
      <span className="text-muted-foreground text-sm shrink-0">{label}</span>
      <div className="flex-1 max-w-[60%] flex justify-end">
        <InlineFieldEditor
          value={value}
          fieldType={fieldType}
          options={options}
          onSave={onSave}
          placeholder={placeholder}
        />
      </div>
    </div>
  );
}
