import { Separator } from "@/components/ui/separator";
import { Package } from "lucide-react";
import { formatMoney } from "@/lib/money";
import type { CartItem } from "@/contexts/StoreCartContext";
import { CheckoutCouponSection } from "./CheckoutCouponSection";
import { CheckoutGiftCardSection } from "./CheckoutGiftCardSection";

interface CheckoutSummaryCardProps {
  items: CartItem[];
  subtotal: number;
  step: 1 | 2;
  wsSlug: string;
  // Coupon
  couponCode: string;
  onCouponCodeChange: (code: string) => void;
  appliedCoupon: { code: string; discount_type: string; discount_value: number } | null;
  onApplyCoupon: () => void;
  onRemoveCoupon: () => void;
  couponLoading: boolean;
  discountAmount: number;
  // Gift Card
  appliedGiftCard: { id: string; code: string; current_balance: number } | null;
  onApplyGiftCard: (gc: { id: string; code: string; current_balance: number } | null) => void;
  onRemoveGiftCard: () => void;
  giftCardAmount: number;
  // Shipping
  effectiveShippingCost: number;
  selectedCttOptionName?: string;
  // Total
  finalTotal: number;
}

export function CheckoutSummaryCard({
  items,
  subtotal,
  step,
  wsSlug,
  couponCode,
  onCouponCodeChange,
  appliedCoupon,
  onApplyCoupon,
  onRemoveCoupon,
  couponLoading,
  discountAmount,
  appliedGiftCard,
  onApplyGiftCard,
  onRemoveGiftCard,
  giftCardAmount,
  effectiveShippingCost,
  selectedCttOptionName,
  finalTotal,
}: CheckoutSummaryCardProps) {
  return (
    <div className="border rounded-xl p-5 space-y-4 sticky top-24">
      <h2 className="font-semibold">Resumo da encomenda</h2>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.productId} className="flex gap-3">
            <div className="h-14 w-14 rounded-lg bg-muted overflow-hidden flex-shrink-0">
              {item.image ? (
                <img src={item.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <Package className="h-6 w-6 text-muted-foreground/30" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium line-clamp-1">{item.name}</p>
              <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
            </div>
            <p className="text-sm font-medium">€{formatMoney(item.price * item.quantity)}</p>
          </div>
        ))}
      </div>
      <Separator />

      {/* Coupon */}
      {step === 2 && (
        <div className="space-y-2">
          <CheckoutCouponSection
            couponCode={couponCode}
            onCouponCodeChange={onCouponCodeChange}
            appliedCoupon={appliedCoupon}
            onApply={onApplyCoupon}
            onRemove={onRemoveCoupon}
            couponLoading={couponLoading}
          />
        </div>
      )}

      {/* Gift Card */}
      {step === 2 && (
        <div className="space-y-2">
          <CheckoutGiftCardSection
            workspaceSlug={wsSlug}
            appliedGiftCard={appliedGiftCard}
            onApply={onApplyGiftCard}
            onRemove={onRemoveGiftCard}
          />
        </div>
      )}

      {(appliedCoupon || effectiveShippingCost > 0 || appliedGiftCard) && (
        <>
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>€{formatMoney(subtotal)}</span>
          </div>
          {appliedCoupon && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Desconto</span>
              <span>-€{formatMoney(discountAmount)}</span>
            </div>
          )}
          {appliedGiftCard && giftCardAmount > 0 && (
            <div className="flex justify-between text-sm text-purple-600">
              <span>Gift Card</span>
              <span>-€{formatMoney(giftCardAmount)}</span>
            </div>
          )}
          {effectiveShippingCost > 0 && selectedCttOptionName && (
            <div className="flex justify-between text-sm">
              <span>Envio ({selectedCttOptionName})</span>
              <span>€{formatMoney(effectiveShippingCost)}</span>
            </div>
          )}
        </>
      )}

      <Separator />
      <div className="flex justify-between items-center font-semibold text-lg">
        <span>Total</span>
        <span className="text-primary">€{formatMoney(finalTotal)}</span>
      </div>
    </div>
  );
}
