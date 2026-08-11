import { useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { getPublicBaseUrl } from "@/utils/getPublicDomain";
import { Helmet } from "react-helmet-async";
import { StoreHeader } from "@/components/store/StoreHeader";
import { useStoreCart } from "@/contexts/StoreCartContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingBag, CheckCircle2, ChevronRight, Lock } from "lucide-react";
import { TrustBadges } from "@/components/checkout/TrustBadges";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useResolveStoreWorkspace } from "@/hooks/useResolveStoreWorkspace";
import { usePublicStoreSettings } from "@/hooks/useStoreSettings";
import { Sentry } from "@/lib/sentry";
import { trackEvent } from "@/lib/analytics";
import { CheckoutLeadStep } from "@/components/store/checkout/CheckoutLeadStep";
import { CheckoutPaymentStep } from "@/components/store/checkout/CheckoutPaymentStep";
import { CheckoutSummaryCard } from "@/components/store/checkout/CheckoutSummaryCard";
import { useCheckoutForm } from "@/components/store/checkout/useCheckoutForm";
import { useCheckoutPricing } from "@/components/store/checkout/useCheckoutPricing";
import { CheckoutBankTransferInfo } from "@/components/store/checkout/CheckoutBankTransferInfo";
import { formatMoney } from "@/lib/money";
import type { PaymentMethodType } from "@/components/store/checkout/CheckoutPaymentMethodPicker";

export default function StoreCheckoutPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const [searchParams] = useSearchParams();
  const abandonedCartId = searchParams.get("abandoned_cart_id") || undefined;
  const { items, subtotal, clearCart } = useStoreCart();
  const { workspaceId: wsId, slug: wsSlug } = useResolveStoreWorkspace(workspaceSlug);
  const { data: storeSettings } = usePublicStoreSettings(wsId || "");
  const storeName = storeSettings?.store_name || "Loja";
  const logoUrl = (storeSettings as any)?.logo_url;

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethodType>("stripe_card");
  const [bankTransferOrder, setBankTransferOrder] = useState<{ orderNumber: string; bankDetails: any } | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);


  const form = useCheckoutForm({ wsId, wsSlug, items, subtotal });
  const pricing = useCheckoutPricing({ items, subtotal, wsId, wsSlug, customerEmail: form.formData.email });

  const paymentMethods = (storeSettings as any)?.payment_methods || { stripe_card: true };
  const bankTransferDetails = (storeSettings as any)?.bank_transfer_details || {};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptTerms) {
      setTermsError("Tem de aceitar os Termos e Condições para continuar");
      return;
    }
    setTermsError(null);
    if (!form.validateStep2()) return;


    trackEvent("checkout_submit", { workspaceSlug: wsSlug, subtotal, total: pricing.finalTotal, itemCount: items.length, currency: items[0]?.currency });
    form.setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-store-checkout", {
        body: {
          workspaceId: wsId,
          items: items.map((item) => ({ productId: item.productId, quantity: item.quantity, name: item.name, price: item.price })),
          customerName: form.formData.name,
          customerEmail: form.formData.email,
          customerPhone: form.formData.phone || undefined,
          contactId: form.contactId || undefined,
          couponCode: pricing.appliedCoupon?.code || undefined,
          giftCardCode: pricing.appliedGiftCard?.code || undefined,
          shippingMethodId: pricing.selectedShippingId || undefined,
          shippingCost: pricing.effectiveShippingCost,
          shippingMethodName: pricing.selectedCttOption?.name || undefined,
          abandonedCartId: abandonedCartId || undefined,
          paymentMethod: selectedPaymentMethod,
          successUrl: `${getPublicBaseUrl()}/store/${wsSlug}/success`,
          cancelUrl: `${getPublicBaseUrl()}/store/${wsSlug}/cancel`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.paidWithGiftCard) {
        clearCart();
        window.location.href = `/store/${wsSlug}/success?order_id=${data.orderId || ""}`;
      } else if (data?.bankTransfer) {
        clearCart();
        setBankTransferOrder({
          orderNumber: data.orderNumber,
          bankDetails: bankTransferDetails,
        });
      } else if (data?.url) {
        trackEvent("checkout_redirect_stripe", { workspaceSlug: wsSlug, total: pricing.finalTotal });
        clearCart();
        window.location.href = data.url;
      } else {
        throw new Error("URL de checkout não recebida");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao criar checkout";
      toast.error(message);
      try { Sentry.captureException(err); } catch {}
      form.setIsProcessing(false);
    }
  };

  // Bank transfer confirmation view
  if (bankTransferOrder) {
    return (
      <div className="min-h-screen bg-background">
        <StoreHeader workspaceSlug={wsSlug} />
        <div className="container mx-auto px-4 py-12 max-w-lg text-center space-y-6">
          <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
          <h2 className="text-2xl font-bold">Encomenda registada!</h2>
          <p className="text-muted-foreground">
            Complete o pagamento por transferência bancária para que possamos processar a sua encomenda.
          </p>
          <CheckoutBankTransferInfo
            bankDetails={bankTransferOrder.bankDetails}
            orderTotal={formatMoney(pricing.finalTotal)}
            orderNumber={bankTransferOrder.orderNumber}
          />
          <Link to={`/store/${wsSlug}`}>
            <Button variant="outline" className="gap-2"><ArrowLeft className="h-4 w-4" /> Voltar à Loja</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <StoreHeader workspaceSlug={wsSlug} />
        <div className="container mx-auto px-4 py-20 text-center">
          <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Carrinho vazio</h2>
          <p className="text-muted-foreground mb-4">Adicione produtos antes de finalizar.</p>
          <Link to={`/store/${wsSlug}`}>
            <Button variant="outline" className="gap-2"><ArrowLeft className="h-4 w-4" /> Voltar à Loja</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Checkout | {storeName}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <StoreHeader workspaceSlug={wsSlug} />

        <div className="container mx-auto px-4 py-8 max-w-5xl">
          {/* Breadcrumb */}
          <Link to={`/store/${wsSlug}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Voltar à Loja
          </Link>

          {/* Checkout header with store branding */}
          <div className="flex items-center gap-3 mb-6">
            {logoUrl && (
              <img src={logoUrl} alt={storeName} className="h-8 w-8 rounded-lg object-cover border" />
            )}
            <div>
              <h1 className="text-xl font-bold">Finalizar Encomenda</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Lock className="h-3 w-3" /> Checkout seguro • {storeName}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex items-center gap-0">
              {/* Step 1 */}
              <button
                type="button"
                onClick={() => form.step === 2 && form.setStep(1)}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-l-lg border transition-colors flex-1",
                  form.step === 1
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 text-muted-foreground border-border hover:bg-muted cursor-pointer"
                )}
              >
                {form.step > 1 ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <span className="h-5 w-5 rounded-full bg-primary-foreground/20 flex items-center justify-center text-xs font-bold">1</span>
                )}
                <span className="hidden sm:inline">Dados pessoais</span>
                <span className="sm:hidden">Dados</span>
              </button>

              {/* Step 2 */}
              <div
                className={cn(
                  "flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-r-lg border border-l-0 flex-1",
                  form.step === 2
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/30 text-muted-foreground border-border"
                )}
              >
                <span className={cn(
                  "h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold",
                  form.step === 2 ? "bg-primary-foreground/20" : "bg-muted"
                )}>2</span>
                <span className="hidden sm:inline">Pagamento</span>
                <span className="sm:hidden">Pagar</span>
              </div>
            </div>
            {/* Progress indicator */}
            <div className="h-1 bg-muted rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                style={{ width: form.step === 1 ? "50%" : "100%" }}
              />
            </div>
          </div>

          <div className="grid lg:grid-cols-5 gap-8">
            {/* Form area */}
            <div className="lg:col-span-3 space-y-6">
              {form.step === 1 ? (
                <CheckoutLeadStep
                  formData={form.formData}
                  fieldErrors={form.fieldErrors}
                  isStep1Valid={form.isStep1Valid}
                  onFieldChange={form.updateField}
                  onSubmit={form.handleStep1Continue}
                />
              ) : (
                <CheckoutPaymentStep
                  formData={form.formData}
                  fieldErrors={termsError ? { ...form.fieldErrors, acceptTerms: termsError } : form.fieldErrors}
                  isProcessing={form.isProcessing}

                  onFieldChange={form.handleEmailChange}
                  onEmailBlur={form.handleEmailBlur}
                  onStepBack={() => form.setStep(1)}
                  onSubmit={handleSubmit}
                  totalWeight={pricing.totalWeight}
                  shippingLoading={pricing.shippingLoading}
                  overWeight={pricing.overWeight}
                  cttOptions={pricing.cttOptions}
                  selectedShippingId={pricing.selectedShippingId}
                  onSelectShipping={pricing.setSelectedShippingId}
                  enabledPaymentMethods={paymentMethods}
                  selectedPaymentMethod={selectedPaymentMethod}
                  onSelectPaymentMethod={setSelectedPaymentMethod}
                />
              )}

              {/* Trust badges below form */}
              <TrustBadges />
            </div>

            {/* Summary sidebar */}
            <div className="lg:col-span-2">
              <CheckoutSummaryCard
                items={items}
                subtotal={subtotal}
                step={form.step}
                wsSlug={wsSlug}
                couponCode={pricing.couponCode}
                onCouponCodeChange={pricing.setCouponCode}
                appliedCoupon={pricing.appliedCoupon}
                onApplyCoupon={pricing.handleApplyCoupon}
                onRemoveCoupon={() => pricing.setAppliedCoupon(null)}
                couponLoading={pricing.couponLoading}
                discountAmount={pricing.discountAmount}
                appliedGiftCard={pricing.appliedGiftCard}
                onApplyGiftCard={pricing.setAppliedGiftCard}
                onRemoveGiftCard={() => pricing.setAppliedGiftCard(null)}
                giftCardAmount={pricing.giftCardAmount}
                effectiveShippingCost={pricing.effectiveShippingCost}
                selectedCttOptionName={pricing.selectedCttOption?.name}
                finalTotal={pricing.finalTotal}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
