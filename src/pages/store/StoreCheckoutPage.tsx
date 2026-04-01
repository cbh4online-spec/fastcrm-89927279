import { useParams, Link, useSearchParams } from "react-router-dom";
import { getPublicBaseUrl } from "@/utils/getPublicDomain";
import { Helmet } from "react-helmet-async";
import { StoreHeader } from "@/components/store/StoreHeader";
import { useStoreCart } from "@/contexts/StoreCartContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingBag, CheckCircle2, ChevronRight } from "lucide-react";
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

export default function StoreCheckoutPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const [searchParams] = useSearchParams();
  const abandonedCartId = searchParams.get("abandoned_cart_id") || undefined;
  const { items, subtotal, clearCart } = useStoreCart();
  const { workspaceId: wsId, slug: wsSlug } = useResolveStoreWorkspace(workspaceSlug);
  const { data: storeSettings } = usePublicStoreSettings(wsId || "");
  const storeName = storeSettings?.store_name || "Loja";

  const form = useCheckoutForm({ wsId, wsSlug, items, subtotal });
  const pricing = useCheckoutPricing({ items, subtotal, wsId, wsSlug, customerEmail: form.formData.email });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          successUrl: `${getPublicBaseUrl()}/store/${wsSlug}/success`,
          cancelUrl: `${getPublicBaseUrl()}/store/${wsSlug}/cancel`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.paidWithGiftCard) {
        clearCart();
        window.location.href = `/store/${wsSlug}/success`;
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

        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Link to={`/store/${wsSlug}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="h-4 w-4" /> Voltar à Loja
          </Link>

          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-8">
            <div className={cn("flex items-center gap-2 text-sm font-medium", form.step === 1 ? "text-primary" : "text-muted-foreground")}>
              {form.step > 1 ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <span className="h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</span>}
              <button type="button" onClick={() => form.step === 2 && form.setStep(1)} className={form.step === 2 ? "hover:underline cursor-pointer" : ""}>Dados pessoais</button>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <div className={cn("flex items-center gap-2 text-sm font-medium", form.step === 2 ? "text-primary" : "text-muted-foreground")}>
              <span className={cn("h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold", form.step === 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>2</span>
              Pagamento
            </div>
          </div>

          <div className="grid md:grid-cols-5 gap-8">
            <div className="md:col-span-3">
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
                  fieldErrors={form.fieldErrors}
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
                />
              )}
            </div>

            <div className="md:col-span-2">
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
