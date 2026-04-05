import { Button } from "@/components/ui/button";
import { Lock, Loader2 } from "lucide-react";
import { CheckoutShippingSection } from "./CheckoutShippingSection";
import { CheckoutPaymentMethodPicker, type PaymentMethodType } from "./CheckoutPaymentMethodPicker";
import type { CTTShippingOption } from "./useCheckoutPricing";

const BUTTON_LABELS: Record<PaymentMethodType, string> = {
  stripe_card: "Pagar com Cartão",
  mbway: "Pagar com MB Way",
  multibanco: "Pagar com Multibanco",
  bank_transfer: "Confirmar Encomenda",
};

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
  // Payment methods
  enabledPaymentMethods: Record<string, boolean>;
  selectedPaymentMethod: PaymentMethodType;
  onSelectPaymentMethod: (method: PaymentMethodType) => void;
  // Legal consent
  acceptTerms?: boolean;
  onAcceptTermsChange?: (v: boolean) => void;
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
  enabledPaymentMethods,
  selectedPaymentMethod,
  onSelectPaymentMethod,
}: CheckoutPaymentStepProps) {
  const buttonLabel = BUTTON_LABELS[selectedPaymentMethod] || "Pagar";

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
        <p className="text-sm text-muted-foreground">{formData.email}</p>
        <p className="text-sm text-muted-foreground">{formData.phone}</p>
      </div>

      <CheckoutShippingSection
        totalWeight={totalWeight}
        shippingLoading={shippingLoading}
        overWeight={overWeight}
        cttOptions={cttOptions}
        selectedShippingId={selectedShippingId}
        onSelectShipping={onSelectShipping}
      />

      <CheckoutPaymentMethodPicker
        enabledMethods={enabledPaymentMethods}
        selected={selectedPaymentMethod}
        onSelect={onSelectPaymentMethod}
      />

      <Button
        type="submit"
        size="lg"
        className="w-full gap-2"
        disabled={isProcessing || !formData.email.trim()}
      >
        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
        {isProcessing ? "A processar..." : buttonLabel}
      </Button>

      <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
        <Lock className="h-3 w-3" />
        Pagamento seguro
      </p>
    </form>
  );
}
