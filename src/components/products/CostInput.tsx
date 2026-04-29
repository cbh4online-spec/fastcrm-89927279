import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type CostMode = "value" | "percent";
export type CostBase = "price" | "direct_cost";

export interface CostInputProps {
  id?: string;
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  mode: CostMode;
  onModeChange: (m: CostMode) => void;
  /** Base only relevant when mode === 'percent' AND showBase is true */
  base?: CostBase;
  onBaseChange?: (b: CostBase) => void;
  showBase?: boolean;
  /** When true, only allow percent (no toggle) — useful for tax rate */
  percentOnly?: boolean;
  /** Hint text under field */
  hint?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CostInput({
  id,
  label,
  value,
  onValueChange,
  mode,
  onModeChange,
  base = "price",
  onBaseChange,
  showBase = false,
  percentOnly = false,
  hint,
  placeholder,
  disabled,
  className,
}: CostInputProps) {
  const effectiveMode = percentOnly ? "percent" : mode;
  const symbol = effectiveMode === "percent" ? "%" : "€";

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="text-sm">{label}</Label>
      <div className="flex items-stretch gap-1">
        <div className="relative flex-1">
          <Input
            id={id}
            type="number"
            min="0"
            step="0.01"
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            placeholder={placeholder ?? "0.00"}
            disabled={disabled}
            className="pr-8"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {symbol}
          </span>
        </div>

        {!percentOnly && (
          <div className="inline-flex rounded-md border bg-muted/40 p-0.5">
            <Button
              type="button"
              size="sm"
              variant={effectiveMode === "value" ? "default" : "ghost"}
              className="h-8 px-2 text-xs"
              onClick={() => onModeChange("value")}
              disabled={disabled}
              aria-pressed={effectiveMode === "value"}
              title="Valor em euros"
            >
              €
            </Button>
            <Button
              type="button"
              size="sm"
              variant={effectiveMode === "percent" ? "default" : "ghost"}
              className="h-8 px-2 text-xs"
              onClick={() => onModeChange("percent")}
              disabled={disabled}
              aria-pressed={effectiveMode === "percent"}
              title="Percentagem"
            >
              %
            </Button>
          </div>
        )}
      </div>

      {/* Base picker (only when % and applicable) */}
      {showBase && effectiveMode === "percent" && onBaseChange && (
        <div className="flex items-center gap-2 pt-0.5">
          <span className="text-[11px] text-muted-foreground">sobre</span>
          <Select value={base} onValueChange={(v) => onBaseChange(v as CostBase)} disabled={disabled}>
            <SelectTrigger className="h-7 w-[170px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="price">Preço de Venda</SelectItem>
              <SelectItem value="direct_cost">Custo Direto</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {hint && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-[11px] text-muted-foreground truncate cursor-help">{hint}</p>
            </TooltipTrigger>
            <TooltipContent>{hint}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}

/**
 * Resolve a cost field to an absolute € amount, given mode/base and reference values.
 */
export function resolveCostAmount(
  value: number,
  mode: CostMode,
  base: CostBase | undefined,
  refs: { price: number; directCost: number }
): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  if (mode === "value") return value;
  const ref = base === "direct_cost" ? refs.directCost : refs.price;
  return (value / 100) * (ref || 0);
}
