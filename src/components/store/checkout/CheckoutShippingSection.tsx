import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CTTShippingOption } from "./useCheckoutPricing";

interface CheckoutShippingSectionProps {
  totalWeight: number;
  shippingLoading: boolean;
  overWeight: boolean;
  cttOptions: CTTShippingOption[];
  selectedShippingId: string;
  onSelectShipping: (id: string) => void;
}

export function CheckoutShippingSection({
  totalWeight,
  shippingLoading,
  overWeight,
  cttOptions,
  selectedShippingId,
  onSelectShipping,
}: CheckoutShippingSectionProps) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <span>🚛</span> Método de Envio
      </h2>
      {totalWeight > 0 && (
        <p className="text-xs text-muted-foreground">
          Peso total: {totalWeight >= 1 ? `${totalWeight.toFixed(2)} kg` : `${Math.round(totalWeight * 1000)} g`}
        </p>
      )}
      {shippingLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
          <Loader2 className="h-4 w-4 animate-spin" />
          A calcular portes...
        </div>
      ) : overWeight ? (
        <div className="flex items-center gap-2 text-sm text-amber-600 border border-amber-200 rounded-lg p-3 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>Peso excede 10kg. Contacte-nos para orçamento de envio personalizado.</span>
        </div>
      ) : cttOptions.length > 0 ? (
        <RadioGroup value={selectedShippingId} onValueChange={onSelectShipping}>
          {cttOptions.map((option) => (
            <div
              key={option.id}
              className={cn(
                "flex items-center justify-between border rounded-lg p-3 cursor-pointer transition-colors",
                selectedShippingId === option.id ? "border-primary bg-primary/5" : "hover:border-muted-foreground/30"
              )}
              onClick={() => onSelectShipping(option.id)}
            >
              <div className="flex items-center gap-3">
                <RadioGroupItem value={option.id} />
                <div>
                  <p className="text-sm font-medium">{option.name}</p>
                  <p className="text-xs text-muted-foreground">{option.estimate}</p>
                </div>
              </div>
              <span className="text-sm font-medium">€{option.price.toFixed(2)}</span>
            </div>
          ))}
        </RadioGroup>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhuma opção de envio disponível.</p>
      )}
    </div>
  );
}
