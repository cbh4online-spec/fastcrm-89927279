import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export interface InlineSelectOption {
  value: string;
  label: string;
}

interface InlineSelectEditorProps {
  value: string;
  options: InlineSelectOption[];
  onSave: (newValue: string) => void;
  /** Render mode for the closed state. Defaults to "badge". */
  renderAs?: "badge" | "text";
  emptyPlaceholder?: string;
}

/**
 * Inline editor for enum-like fields. Uses a shadcn Select that doubles as
 * both the display chip and the dropdown trigger — single click opens it.
 */
export function InlineSelectEditor({
  value,
  options,
  onSave,
  renderAs = "badge",
  emptyPlaceholder = "-",
}: InlineSelectEditorProps) {
  const current = options.find((o) => o.value === value);
  const label = current?.label ?? value ?? emptyPlaceholder;

  return (
    <Select
      value={value || undefined}
      onValueChange={(next) => {
        if (next && next !== value) onSave(next);
      }}
    >
      <SelectTrigger
        className="h-7 w-auto min-w-0 gap-1 border-0 bg-transparent px-1 py-0 shadow-none hover:bg-muted hover:ring-1 hover:ring-border focus:ring-1 focus:ring-ring [&>svg]:h-3 [&>svg]:w-3 [&>svg]:opacity-50"
        title="Clique para alterar"
      >
        <SelectValue asChild>
          {renderAs === "badge" ? (
            <Badge variant="outline" className="font-normal">
              {label}
            </Badge>
          ) : (
            <span className="text-sm">{label}</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
