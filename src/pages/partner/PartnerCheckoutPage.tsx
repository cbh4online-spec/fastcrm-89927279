import { useNavigate } from "react-router-dom";

import { usePartnerAuth } from "@/hooks/partner/usePartnerAuth";
import { usePartnerAccount } from "@/hooks/partner/usePartnerAccount";
import { usePartnerCheckout } from "@/hooks/partner/usePartnerCheckout";
import { usePartnerCart } from "@/contexts/PartnerCartContext";
import { usePartnerCartTotals } from "@/hooks/partner/usePartnerCartTotals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { formatMoneyEur } from "@/lib/money";
import { OrderSummaryBreakdown } from "@/components/partner/OrderSummaryBreakdown";
import { FreeShippingBar } from "@/components/partner/FreeShippingBar";
import { CrossSellRail } from "@/components/partner/CrossSellRail";

export default function PartnerCheckoutPage() {
  const navigate = useNavigate();
  const { partnerUser } = usePartnerAuth();
  const { account } = usePartnerAccount(partnerUser?.partner_account_id);
  const { items, subtotalNet, poNumber, couponCode } = usePartnerCart();
  const { totals } = usePartnerCartTotals(
    partnerUser?.workspace_id,
    partnerUser?.partner_account_id,
    items,
    couponCode,
  );
  const { submitOrder, submitting } = usePartnerCheckout(partnerUser, account);

  const totalForApproval = totals.total_gross || subtotalNet;
  const needsApproval = account?.requires_order_approval &&
    account.approval_threshold != null &&
    totalForApproval > account.approval_threshold;

  const creditExceeded = !!account && account.credit_limit > 0 &&
    (account.current_credit_exposure + (totals.subtotal_net || subtotalNet)) > account.credit_limit;

  const couponInvalid = !!couponCode && totals.coupon && !totals.coupon.valid;

  const handleSubmit = async () => {
    const orderId = await submitOrder(totals);
    if (orderId) navigate(`/partner/orders/${orderId}`);
  };

  if (items.length === 0) {
    navigate("/partner/cart", { replace: true });
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Confirmar Encomenda</h1>

      {creditExceeded && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Limite de crédito ultrapassado. Contacte o gestor comercial para prosseguir.</AlertDescription>
        </Alert>
      )}

      {couponInvalid && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>O cupão aplicado já não é válido. Volte ao carrinho para ajustar.</AlertDescription>
        </Alert>
      )}

      {needsApproval && !creditExceeded && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Esta encomenda requer aprovação interna antes de ser processada.</AlertDescription>
        </Alert>
      )}

      <FreeShippingBar
        threshold={totals.free_shipping_threshold}
        remaining={totals.free_shipping_remaining}
        subtotal={totals.subtotal_net || subtotalNet}
      />

      <Card>
        <CardHeader><CardTitle className="text-base">Itens ({items.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {items.map((item) => {
            const line = totals.lines.find((l) => l.product_id === item.product_id);
            const itemKey = `${item.product_id}::${item.variant_id ?? ''}`;
            return (
              <div key={itemKey} className="flex justify-between text-sm py-1 border-b last:border-b-0">
                <span>
                  {item.product_name} × {item.quantity}
                  {item.variant_label && <span className="text-muted-foreground"> · {item.variant_label}</span>}
                </span>
                <div className="text-right">
                  <span className="font-medium">{formatMoneyEur(line?.line_total_net ?? item.unit_price_net * item.quantity)}</span>
                  {line && line.discount_pct > 0 && (
                    <div className="text-xs text-emerald-700">−{line.discount_pct}% aplicado</div>
                  )}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-3">
          {poNumber && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">PO Number</span>
              <span className="font-medium">{poNumber}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Condições de Pagamento</span>
            <span className="font-medium">{account?.payment_terms || 'N/D'}</span>
          </div>
          <div className="border-t pt-3">
            <OrderSummaryBreakdown totals={totals} fallbackSubtotal={subtotalNet} />
          </div>
        </CardContent>
      </Card>

      <CrossSellRail
        partnerAccountId={partnerUser?.partner_account_id}
        cartProductIds={items.map((i) => i.product_id)}
      />

      <Button className="w-full" size="lg" onClick={handleSubmit} disabled={submitting || !!creditExceeded || !!couponInvalid}>
        {submitting ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A submeter...</>
        ) : (
          <><CheckCircle className="h-4 w-4 mr-2" />{needsApproval ? 'Submeter para Aprovação' : 'Confirmar Encomenda'}</>
        )}
      </Button>
    </div>
  );
}
