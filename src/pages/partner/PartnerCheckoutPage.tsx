import { useNavigate } from "react-router-dom";
import { PartnerLayout } from "@/components/partner/PartnerLayout";
import { usePartnerAuth } from "@/hooks/partner/usePartnerAuth";
import { usePartnerAccount } from "@/hooks/partner/usePartnerAccount";
import { usePartnerCheckout } from "@/hooks/partner/usePartnerCheckout";
import { usePartnerCart } from "@/contexts/PartnerCartContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { formatMoneyEur } from "@/lib/money";

export default function PartnerCheckoutPage() {
  const navigate = useNavigate();
  const { partnerUser } = usePartnerAuth();
  const { account } = usePartnerAccount(partnerUser?.partner_account_id);
  const { items, subtotalNet, poNumber, orderNotes } = usePartnerCart();
  const { submitOrder, submitting } = usePartnerCheckout(partnerUser, account);

  const needsApproval = account?.requires_order_approval &&
    account.approval_threshold != null &&
    subtotalNet > account.approval_threshold;

  const creditExceeded = account && account.credit_limit > 0 &&
    (account.current_credit_exposure + subtotalNet) > account.credit_limit;

  const handleSubmit = async () => {
    const orderId = await submitOrder();
    if (orderId) navigate(`/partner/orders/${orderId}`);
  };

  if (items.length === 0) {
    navigate("/partner/cart", { replace: true });
    return null;
  }

  return (
    <PartnerLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Confirmar Encomenda</h1>

        {creditExceeded && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Limite de crédito ultrapassado. Contacte o gestor comercial para prosseguir.</AlertDescription>
          </Alert>
        )}

        {needsApproval && !creditExceeded && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Esta encomenda requer aprovação interna antes de ser processada.</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader><CardTitle className="text-base">Itens ({items.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {items.map((item) => (
              <div key={item.product_id} className="flex justify-between text-sm py-1 border-b last:border-b-0">
                <span>{item.product_name} × {item.quantity}</span>
                <span className="font-medium">{formatMoneyEur(item.unit_price_net * item.quantity)}</span>
              </div>
            ))}
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
              <div className="flex justify-between text-sm">
                <span>Subtotal (net)</span>
                <span>{formatMoneyEur(subtotalNet)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>IVA (23%)</span>
                <span>{formatMoneyEur(subtotalNet * 0.23)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2">
                <span>Total</span>
                <span>{formatMoneyEur(subtotalNet * 1.23)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button className="w-full" size="lg" onClick={handleSubmit} disabled={submitting || !!creditExceeded}>
          {submitting ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />A submeter...</>
          ) : (
            <><CheckCircle className="h-4 w-4 mr-2" />{needsApproval ? 'Submeter para Aprovação' : 'Confirmar Encomenda'}</>
          )}
        </Button>
      </div>
    </PartnerLayout>
  );
}
