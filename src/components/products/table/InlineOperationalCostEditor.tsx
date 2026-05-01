import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";

type CostMode = "value" | "percent";

interface Props {
  value: number | null | undefined;
  mode: CostMode;
  currency?: string;
  formatCurrency: (v: number, c?: string) => string;
  onSave: (value: number | null, mode: CostMode) => void;
}

/**
 * Editor inline para Custo Operacional com toggle €/%.
 * - Clica no valor para editar.
 * - Botões €/% alternam o modo (sem fechar a edição).
 * - Enter ou blur grava; Escape cancela.
 */
export function InlineOperationalCostEditor({
  value,
  mode,
  currency = "EUR",
  formatCurrency,
  onSave,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value == null ? "" : String(value));
  const [localMode, setLocalMode] = useState<CostMode>(mode);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalMode(mode);
  }, [mode]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const formatDisplay = (v: number) =>
    mode === "percent"
      ? `${Number(v).toLocaleString("pt-PT", { maximumFractionDigits: 2 })}%`
      : formatCurrency(v, currency);

  const commit = (nextMode: CostMode) => {
    const raw = inputValue.trim();
    if (raw === "") {
      if ((value ?? null) !== null || nextMode !== mode) onSave(null, nextMode);
    } else {
      const num = parseFloat(raw.replace(",", "."));
      if (!isNaN(num)) {
        if (num !== Number(value) || nextMode !== mode) onSave(num, nextMode);
      }
    }
    setEditing(false);
  };

  // Detectar blur que sai mesmo do container (não cliques internos)
  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    if (containerRef.current && containerRef.current.contains(e.relatedTarget as Node)) return;
    commit(localMode);
  };

  if (!editing) {
    const isEmpty = value == null;
    return (
      <button
        type="button"
        onClick={() => {
          setInputValue(value == null ? "" : String(value));
          setLocalMode(mode);
          setEditing(true);
        }}
        className="cursor-text hover:bg-muted hover:ring-1 hover:ring-border px-1 -mx-1 rounded transition-all text-left max-w-full truncate w-full"
        title="Clique para editar"
      >
        {isEmpty ? <span className="text-muted-foreground">-</span> : formatDisplay(value!)}
      </button>
    );
  }

  return (
    <div ref={containerRef} onBlur={handleBlur} className="flex items-center gap-1">
      <Input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(localMode);
          if (e.key === "Escape") setEditing(false);
        }}
        className="h-7 text-sm px-1 w-16"
      />
      <div className="inline-flex rounded-md border border-input overflow-hidden">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setLocalMode("value")}
          className={`px-1.5 h-7 text-xs ${localMode === "value" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
        >
          €
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setLocalMode("percent")}
          className={`px-1.5 h-7 text-xs border-l border-input ${localMode === "percent" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
        >
          %
        </button>
      </div>
    </div>
  );
}
