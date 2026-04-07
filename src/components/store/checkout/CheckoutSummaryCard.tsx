import { Separator } from "@/components/ui/separator";
import { Package, ShieldCheck, Truck, Tag } from "lucide-react";
import { formatMoney } from "@/lib/money";
import type { CartItem } from "@/contexts/StoreCartContext";
import { CheckoutCouponSection } from "./CheckoutCouponSection";
import { CheckoutGiftCardSection } from "./CheckoutGiftCardSection";

interface CheckoutSummaryCardProps {
  items: CartItem[];
  subtotal: number;
  step: 1 | 2;
  wsSlug: string;
  couponCode: string;
  onCouponCodeChange: (code: string) => void;
  appliedCoupon: { code: string; discount_type: string; discount_value: number } | null;
  onApplyCoupon: () => void;
  onRemoveCoupon: () => void;
  couponLoading: boolean;
  discountAmount: number;
  appliedGiftCard: { id: string; code: string; current_balance: number } | null;
  onApplyGiftCard: (gc: { id: string; code: string; current_balance: number } | null) => void;
  onRemoveGiftCard: () => void;
  giftCardAmount: number;
  effectiveShippingCost: number;
  selectedCttOptionName?: string;
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
    <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4 sticky top-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          Resumo da encomenda
        </h2>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {items.reduce((sum, i) => sum + i.quantity, 0)} {items.reduce((sum, i) => sum + i.quantity, 0) === 1 ? "item" : "itens"}
        </span>
      </div>

      {/* Items */}
      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
        {items.map((item) => (
          <div key={item.productId} className="flex gap-3 group">
            <div className="h-16 w-16 rounded-lg bg-muted overflow-hidden flex-shrink-0 border border-border/50">
              {item.image ? (
                <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <Package className="h-6 w-6 text-muted-foreground/30" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium line-clamp-2 leading-tight">{item.name}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground">Qtd: {item.quantity}</span>
                <span className="text-sm font-semibold">€{formatMoney(item.price * item.quantity)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Separator />

      {/* Coupon & Gift Card (step 2 only) */}
      {step === 2 && (
        <div className="space-y-3">
          <CheckoutCouponSection
            couponCode={couponCode}
            onCouponCodeChange={onCouponCodeChange}
            appliedCoupon={appliedCoupon}
            onApply={onApplyCoupon}
            onRemove={onRemoveCoupon}
            couponLoading={couponLoading}
          />
          <CheckoutGiftCardSection
            workspaceSlug={wsSlug}
            appliedGiftCard={appliedGiftCard}
            onApply={onApplyGiftCard}
            onRemove={onRemoveGiftCard}
          />
        </div>
      )}

      {/* Price breakdown */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>€{formatMoney(subtotal)}</span>
        </div>
        {appliedCoupon && (
          <div className="flex justify-between text-sm">
            <span className="text-green-600 flex items-center gap-1">
              <Tag className="h-3 w-3" /> Desconto
            </span>
            <span className="text-green-600 font-medium">-€{formatMoney(discountAmount)}</span>
          </div>
        )}
        {appliedGiftCard && giftCardAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-purple-600">Gift Card</span>
            <span className="text-purple-600 font-medium">-€{formatMoney(giftCardAmount)}</span>
          </div>
        )}
        {effectiveShippingCost > 0 && selectedCttOptionName && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Truck className="h-3 w-3" /> {selectedCttOptionName}
            </span>
            <span>€{formatMoney(effectiveShippingCost)}</span>
          </div>
        )}
        {effectiveShippingCost === 0 && step === 2 && selectedCttOptionName && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <Truck className="h-3 w-3" /> Envio
            </span>
            <span className="text-green-600 font-medium">Grátis</span>
          </div>
        )}
      </div>

      <Separator />

      {/* Total */}
      <div className="flex justify-between items-center">
        <span className="text-base font-bold">Total</span>
        <span className="text-xl font-bold text-primary">€{formatMoney(finalTotal)}</span>
      </div>

      {/* Mini trust indicators */}
      <div className="flex items-center justify-center gap-3 pt-1">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <ShieldCheck className="h-3 w-3 text-green-600" />
          Compra segura
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Truck className="h-3 w-3" />
          Envio rápido
        </div>
      </div>
    </div>
  );
}
