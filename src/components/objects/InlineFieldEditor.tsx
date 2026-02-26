import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Check, X, Pencil, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  value: unknown;
  fieldType: string;
  options?: string[];
  onSave: (value: unknown) => void;
  placeholder?: string;
  className?: string;
  isAIGenerated?: boolean;
}

export function InlineFieldEditor({ value, fieldType, options, onSave, placeholder = "—", className, isAIGenerated = false }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<unknown>(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  const commit = () => {
    setEditing(false);
    if (draft !== value) {
      onSave(draft);
    }
  };

  const cancel = () => {
    setEditing(false);
    setDraft(value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); commit(); }
    if (e.key === "Escape") { e.preventDefault(); cancel(); }
  };

  // Boolean — always inline
  if (fieldType === "boolean") {
    return (
      <Switch
        checked={!!value}
        onCheckedChange={(v) => onSave(v)}
        className={className}
      />
    );
  }

  // Select — always inline
  if (fieldType === "select" && options) {
    return (
      <Select value={(value as string) || ""} onValueChange={(v) => onSave(v)}>
        <SelectTrigger className={cn("h-8 border-transparent hover:border-border bg-transparent", className)}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  }

  // Multi-select — checkbox list
  if (fieldType === "multi_select" && options) {
    const selected = Array.isArray(value) ? (value as string[]) : [];
    return (
      <div className={cn("space-y-1", className)}>
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 rounded px-1.5 py-0.5">
            <Checkbox
              checked={selected.includes(opt)}
              onCheckedChange={(checked) => {
                const next = checked ? [...selected, opt] : selected.filter((s) => s !== opt);
                onSave(next);
              }}
            />
            {opt}
          </label>
        ))}
      </div>
    );
  }

  // Currency — same as number but formatted
  if (fieldType === "currency") {
    if (!editing) {
      const isEmpty = value === null || value === undefined || value === "";
      return (
        <button
          onClick={() => setEditing(true)}
          className={cn(
            "group inline-flex items-center gap-1.5 text-left w-full rounded-md px-2 py-1 -mx-2 hover:bg-muted/50 transition-colors min-h-[32px]",
            className
          )}
        >
          <span className={cn("text-sm truncate", isEmpty && "text-muted-foreground/50")}>
            {isEmpty ? placeholder : `€ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`}
          </span>
          <Pencil className="h-3 w-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </button>
      );
    }
    return (
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          type="number"
          value={String(draft ?? "")}
          onChange={(e) => setDraft(e.target.value ? Number(e.target.value) : null)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className="h-8 text-sm"
          placeholder="0.00"
        />
      </div>
    );
  }

  // Display mode
  if (!editing) {
    const isEmpty = value === null || value === undefined || value === "";
    return (
      <button
        onClick={() => setEditing(true)}
        className={cn(
          "group inline-flex items-center gap-1.5 text-left w-full rounded-md px-2 py-1 -mx-2 hover:bg-muted/50 transition-colors min-h-[32px]",
          className
        )}
      >
        <span className={cn("text-sm truncate", isEmpty && "text-muted-foreground/50")}>
          {isEmpty ? placeholder : formatDisplay(value, fieldType)}
        </span>
        {isAIGenerated && !isEmpty && (
          <Badge variant="secondary" className="text-[10px] h-5 gap-1 px-1.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800 shrink-0">
            <Sparkles className="w-3 h-3" />
            IA
          </Badge>
        )}
        <Pencil className="h-3 w-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </button>
    );
  }

  // Edit mode
  const inputType = fieldType === "number" ? "number" : fieldType === "email" ? "email" : fieldType === "url" ? "url" : fieldType === "date" ? "date" : "text";

  return (
    <div className="flex items-center gap-1">
      <Input
        ref={inputRef}
        type={inputType}
        value={String(draft ?? "")}
        onChange={(e) => setDraft(inputType === "number" ? (e.target.value ? Number(e.target.value) : null) : e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className="h-8 text-sm"
      />
    </div>
  );
}

function formatDisplay(value: unknown, fieldType: string): string {
  if (fieldType === "number" && typeof value === "number") return value.toLocaleString("pt-BR");
  if (fieldType === "currency" && typeof value === "number") return `€ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
  if (fieldType === "multi_select" && Array.isArray(value)) return (value as string[]).join(", ");
  if (fieldType === "date" && typeof value === "string") {
    try { return new Date(value).toLocaleDateString("pt-BR"); } catch { return String(value); }
  }
  return String(value);
}
