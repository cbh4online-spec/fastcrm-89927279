import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Lock, Loader2, Info } from "lucide-react";
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
  acceptTerms = false,
  onAcceptTermsChange,
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

      {/* Legal consent (DL 24/2014) */}
      <div className="space-y-3">
        <div className="flex items-start gap-2 rounded-lg border p-3 bg-muted/20">
          <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            Tem o direito de desistir da compra no prazo de <strong>14 dias</strong> sem necessidade de indicar motivo,
            nos termos do Decreto-Lei n.º 24/2014. O prazo começa a contar a partir da receção do bem.
          </p>
        </div>

        <label htmlFor="accept-terms" className="flex items-start gap-2 cursor-pointer">
          <input
            id="accept-terms"
            name="acceptTerms"
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => onAcceptTermsChange?.(e.target.checked)}
            aria-invalid={!!fieldErrors.acceptTerms}
            aria-describedby={fieldErrors.acceptTerms ? "accept-terms-error" : undefined}
            className="accent-primary mt-1 flex-shrink-0 h-4 w-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
          <span className="text-xs text-muted-foreground leading-relaxed">
            Li e aceito os{" "}
            <Link to="/terms" target="_blank" className="underline text-primary hover:text-primary/80">
              Termos e Condições
            </Link>{" "}
            e a{" "}
            <Link to="/privacy" target="_blank" className="underline text-primary hover:text-primary/80">
              Política de Privacidade
            </Link>
            . Confirmo que fui informado(a) do direito de livre resolução (14 dias).
          </span>
        </label>
        {fieldErrors.acceptTerms && (
          <p id="accept-terms-error" className="text-xs text-destructive">{fieldErrors.acceptTerms}</p>
        )}
      </div>

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
