import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Mail, Lock, Loader2 } from "lucide-react";
import { CheckoutShippingSection } from "./CheckoutShippingSection";
import type { CTTShippingOption } from "./useCheckoutPricing";

interface CheckoutPaymentStepProps {
  formData: { name: string; phone: string; email: string };
  fieldErrors: Record<string, string>;
  isProcessing: boolean;
  onFieldChange: (field: string, value: string) => void;
  onEmailBlur: () => void;
  onStepBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
  // Shipping
  totalWeight: number;
  shippingLoading: boolean;
  overWeight: boolean;
  cttOptions: CTTShippingOption[];
  selectedShippingId: string;
  onSelectShipping: (id: string) => void;
}

export function CheckoutPaymentStep({
  formData,
  fieldErrors,
  isProcessing,
  onFieldChange,
  onEmailBlur,
  onStepBack,
  onSubmit,
  totalWeight,
  shippingLoading,
  overWeight,
  cttOptions,
  selectedShippingId,
  onSelectShipping,
}: CheckoutPaymentStepProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Summary of step 1 data */}
      <div className="border rounded-lg p-4 bg-muted/30 space-y-1">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Os seus dados</h3>
          <button type="button" onClick={onStepBack} className="text-xs text-primary hover:underline">
            Editar
          </button>
        </div>
        <p className="text-sm">{formData.name}</p>
        <p className="text-sm text-muted-foreground">{formData.phone}</p>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Email para recibo</h2>
        <div className="space-y-2">
          <Label htmlFor="email" className="flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            Email *
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="o-seu@email.com"
            value={formData.email}
            onChange={(e) => onFieldChange("email", e.target.value)}
            onBlur={onEmailBlur}
            required
            autoFocus
            className={fieldErrors.email ? "border-destructive" : ""}
          />
          {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
        </div>
      </div>

      <CheckoutShippingSection
        totalWeight={totalWeight}
        shippingLoading={shippingLoading}
        overWeight={overWeight}
        cttOptions={cttOptions}
        selectedShippingId={selectedShippingId}
        onSelectShipping={onSelectShipping}
      />

      <Button
        type="submit"
        size="lg"
        className="w-full gap-2"
        disabled={isProcessing || !formData.email.trim()}
      >
        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
        {isProcessing ? "A redirecionar para o Stripe..." : "Pagar com Stripe"}
      </Button>

      <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
        <Lock className="h-3 w-3" />
        Pagamento seguro processado pelo Stripe
      </p>
    </form>
  );
}
