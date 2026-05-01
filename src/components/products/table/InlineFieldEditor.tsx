import { useState, useRef, useEffect, ReactNode } from "react";
import { Input } from "@/components/ui/input";

export type InlineFieldType = "currency" | "number" | "integer" | "percent" | "text";

interface InlineFieldEditorProps {
  value: string | number | null | undefined;
  type: InlineFieldType;
  onSave: (newValue: string | number | null) => void;
  display?: ReactNode;
  /** Placeholder when value is empty/null and not editing */
  emptyPlaceholder?: string;
  /** For currency formatting */
  currency?: string;
  formatCurrency?: (value: number, currency?: string) => string;
  /** Tailwind width class for the input */
  inputWidthClass?: string;
  /** Max length for text */
  maxLength?: number;
  /** Min/max for numbers */
  min?: number;
  max?: number;
}

function defaultDisplay(
  value: string | number | null | undefined,
  type: InlineFieldType,
  currency?: string,
  formatCurrency?: (v: number, c?: string) => string,
): string {
  if (value == null || value === "") return "-";
  switch (type) {
    case "currency":
      return formatCurrency ? formatCurrency(Number(value), currency) : String(value);
    case "percent":
      return `${value}%`;
    case "number":
    case "integer":
      return String(value);
    case "text":
    default:
      return String(value);
  }
}

export function InlineFieldEditor({
  value,
  type,
  onSave,
  display,
  emptyPlaceholder = "-",
  currency = "EUR",
  formatCurrency,
  inputWidthClass,
  maxLength,
  min,
  max,
}: InlineFieldEditorProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value == null ? "" : String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const isNumeric = type === "currency" || type === "number" || type === "integer" || type === "percent";

  const handleSave = () => {
    const raw = inputValue.trim();

    if (isNumeric) {
      if (raw === "") {
        // Allow clearing optional numeric fields
        if ((value ?? null) !== null) onSave(null);
        setEditing(false);
        return;
      }
      const num = type === "integer"
        ? parseInt(raw.replace(",", "."), 10)
        : parseFloat(raw.replace(",", "."));
      if (isNaN(num)) {
        setEditing(false);
        return;
      }
      if (min != null && num < min) { setEditing(false); return; }
      if (max != null && num > max) { setEditing(false); return; }
      if (num !== Number(value)) onSave(num);
    } else {
      const next = raw === "" ? null : raw;
      if (next !== (value ?? null)) onSave(next);
    }
    setEditing(false);
  };

  if (!editing) {
    const isEmpty = value == null || value === "";
    const startEdit = () => {
      setInputValue(value == null ? "" : String(value));
      setEditing(true);
    };
    return (
      <button
        type="button"
        onClick={startEdit}
        onFocus={startEdit}
        className="cursor-text hover:bg-muted hover:ring-1 hover:ring-border px-1 -mx-1 rounded transition-all text-left max-w-full truncate w-full"
        title="Clique para editar"
      >
        {isEmpty ? (
          <span className="text-muted-foreground">{emptyPlaceholder}</span>
        ) : (
          display ?? defaultDisplay(value, type, currency, formatCurrency)
        )}
      </button>
    );
  }

  const widthClass = inputWidthClass ?? (type === "text" ? "w-32" : "w-20");

  return (
    <Input
      ref={inputRef}
      type="text"
      inputMode={isNumeric ? "decimal" : "text"}
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      onBlur={handleSave}
      maxLength={maxLength}
      onKeyDown={(e) => {
        if (e.key === "Enter") handleSave();
        if (e.key === "Escape") setEditing(false);
      }}
      className={`h-7 text-sm px-1 ${widthClass}`}
    />
  );
}
