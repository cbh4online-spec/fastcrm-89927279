import { useParams } from "react-router-dom";
import { PartnerLayout } from "@/components/partner/PartnerLayout";
import { usePartnerOrderDetail } from "@/hooks/partner/usePartnerOrders";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { formatMoneyEur } from "@/lib/money";
import { partnerOrderStatusConfig } from "@/types/partner";

export default function PartnerOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { order, isLoading } = usePartnerOrderDetail(id);

  return (
    <PartnerLayout>
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : !order ? (
        <p className="text-center py-12 text-muted-foreground">Encomenda não encontrada.</p>
      ) : (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{order.order_number}</h1>
              <p className="text-muted-foreground">{new Date(order.created_at).toLocaleDateString('pt-PT')}</p>
            </div>
            <Badge variant="outline" className={partnerOrderStatusConfig[order.status]?.color}>
              {partnerOrderStatusConfig[order.status]?.label || order.status}
            </Badge>
          </div>

          {order.po_number && (
            <p className="text-sm"><span className="text-muted-foreground">PO:</span> {order.po_number}</p>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Itens</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm py-2 border-b last:border-b-0">
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      {item.sku && <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>}
                    </div>
                    <div className="text-right">
                      <p>{item.quantity} × {formatMoneyEur(item.unit_price_net)}</p>
                      <p className="font-semibold">{formatMoneyEur(item.line_total_net)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 space-y-2">
              <div className="flex justify-between text-sm"><span>Subtotal</span><span>{formatMoneyEur(order.subtotal_net)}</span></div>
              <div className="flex justify-between text-sm"><span>IVA</span><span>{formatMoneyEur(order.tax_amount)}</span></div>
              <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total</span><span>{formatMoneyEur(order.total_gross)}</span></div>
            </CardContent>
          </Card>

          {order.notes && (
            <Card>
              <CardHeader><CardTitle className="text-base">Notas</CardTitle></CardHeader>
              <CardContent><p className="text-sm">{order.notes}</p></CardContent>
            </Card>
          )}
        </div>
      )}
    </PartnerLayout>
  );
}
