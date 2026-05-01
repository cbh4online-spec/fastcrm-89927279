import { formatMoneyEur } from "@/lib/money";
import type { PartnerCartTotals } from "@/hooks/partner/usePartnerCartTotals";

interface Props {
  totals: PartnerCartTotals;
  fallbackSubtotal?: number;
}

export function OrderSummaryBreakdown({ totals, fallbackSubtotal = 0 }: Props) {
  const subtotalOriginal = totals.subtotal_original || fallbackSubtotal;
  const hasSavings = totals.total_savings > 0;

  return (
    <div className="space-y-1.5 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Subtotal</span>
        <span>{formatMoneyEur(subtotalOriginal)}</span>
      </div>
      {totals.quantity_break_savings > 0 && (
        <div className="flex justify-between text-emerald-700">
          <span>Desconto por quantidade</span>
          <span>−{formatMoneyEur(totals.quantity_break_savings)}</span>
        </div>
      )}
      {totals.bundle_savings > 0 && (
        <div className="flex justify-between text-emerald-700">
          <span>Desconto bundle</span>
          <span>−{formatMoneyEur(totals.bundle_savings)}</span>
        </div>
      )}
      {totals.coupon_savings > 0 && (
        <div className="flex justify-between text-emerald-700">
          <span>Cupão {totals.coupon?.code}</span>
          <span>−{formatMoneyEur(totals.coupon_savings)}</span>
        </div>
      )}
      {hasSavings && (
        <div className="flex justify-between font-medium pt-1 border-t">
          <span>Subtotal líquido</span>
          <span>{formatMoneyEur(totals.subtotal_net)}</span>
        </div>
      )}
      <div className="flex justify-between text-muted-foreground">
        <span>Envio</span>
        <span>{totals.shipping_amount > 0 ? formatMoneyEur(totals.shipping_amount) : 'Grátis'}</span>
      </div>
      <div className="flex justify-between text-muted-foreground">
        <span>IVA (23%)</span>
        <span>{formatMoneyEur(totals.tax_amount)}</span>
      </div>
      <div className="flex justify-between font-bold text-base pt-2 border-t">
        <span>Total</span>
        <span>{formatMoneyEur(totals.total_gross)}</span>
      </div>
      {hasSavings && (
        <div className="text-xs text-emerald-700 text-right pt-1">
          Poupou {formatMoneyEur(totals.total_savings)} nesta encomenda
        </div>
      )}
    </div>
  );
}
