import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface InlinePriceEditorProps {
  value: number;
  currency?: string;
  onSave: (newValue: number) => void;
  formatCurrency: (value: number, currency?: string) => string;
}

export function InlinePriceEditor({ value, currency = "EUR", onSave, formatCurrency }: InlinePriceEditorProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const handleSave = () => {
    const num = parseFloat(inputValue.replace(",", "."));
    if (!isNaN(num) && num >= 0 && num !== value) {
      onSave(num);
    }
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        type="button"
        onDoubleClick={() => {
          setInputValue(value.toString());
          setEditing(true);
        }}
        className="cursor-text hover:bg-muted/50 px-1 -mx-1 rounded transition-colors"
        title="Duplo-clique para editar"
      >
        {formatCurrency(value, currency)}
      </button>
    );
  }

  return (
    <Input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      onBlur={handleSave}
      onKeyDown={(e) => {
        if (e.key === "Enter") handleSave();
        if (e.key === "Escape") setEditing(false);
      }}
      className="h-7 w-20 text-sm px-1"
    />
  );
}
