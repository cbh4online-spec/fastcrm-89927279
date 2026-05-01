import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { PartnerCatalogVariant } from "@/hooks/partner/usePartnerCatalog";

interface VariantPickerProps {
  variants: PartnerCatalogVariant[];
  selectedId: string | null;
  onChange: (id: string) => void;
  allowBackorder?: boolean;
  /** Se true, força o select dropdown mesmo com poucas variantes. */
  forceSelect?: boolean;
}

/**
 * Picker de variantes:
 * - Pills quando ≤4 variantes (1 clique, mais rápido).
 * - Select dropdown quando >4 ou forçado.
 * - Variantes sem stock ficam desabilitadas, salvo allow_backorder.
 */
export function VariantPicker({
  variants,
  selectedId,
  onChange,
  allowBackorder = false,
  forceSelect = false,
}: VariantPickerProps) {
  if (variants.length === 0) return null;

  const isOutOfStock = (v: PartnerCatalogVariant) =>
    !allowBackorder && v.stock_status === "out_of_stock";

  // Modo dropdown
  if (forceSelect || variants.length > 4) {
    return (
      <Select value={selectedId ?? undefined} onValueChange={onChange}>
        <SelectTrigger className="h-9">
          <SelectValue placeholder="Escolher variante" />
        </SelectTrigger>
        <SelectContent>
          {variants.map((v) => (
            <SelectItem key={v.id} value={v.id} disabled={isOutOfStock(v)}>
              <div className="flex items-center justify-between gap-2 w-full">
                <span>{v.variant_label || v.sku || "Variante"}</span>
                {isOutOfStock(v) && (
                  <span className="text-xs text-muted-foreground">esgotado</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Modo pills
  return (
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Variantes">
      {variants.map((v) => {
        const isSelected = v.id === selectedId;
        const disabled = isOutOfStock(v);
        return (
          <Button
            key={v.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            variant={isSelected ? "default" : "outline"}
            size="sm"
            disabled={disabled}
            onClick={() => onChange(v.id)}
            className={cn(
              "h-8 px-3 text-xs font-medium",
              disabled && "line-through opacity-50",
            )}
            title={disabled ? "Sem stock" : v.sku ?? undefined}
          >
            {v.variant_label || v.sku || "—"}
          </Button>
        );
      })}
    </div>
  );
}
