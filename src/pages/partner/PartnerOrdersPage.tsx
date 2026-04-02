import { PartnerLayout } from "@/components/partner/PartnerLayout";
import { usePartnerAuth } from "@/hooks/partner/usePartnerAuth";
import { usePartnerOrders } from "@/hooks/partner/usePartnerOrders";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText } from "lucide-react";
import { formatMoneyEur } from "@/lib/money";
import { Link } from "react-router-dom";
import { partnerOrderStatusConfig } from "@/types/partner";

export default function PartnerOrdersPage() {
  const { partnerUser } = usePartnerAuth();
  const { orders, isLoading } = usePartnerOrders(partnerUser?.partner_account_id);

  return (
    <PartnerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Encomendas</h1>
          <p className="text-muted-foreground">Histórico de encomendas B2B</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p>Sem encomendas registadas.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const config = partnerOrderStatusConfig[order.status];
              return (
                <Link key={order.id} to={`/partner/orders/${order.id}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium">{order.order_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString('pt-PT')}
                          {order.po_number && ` · PO: ${order.po_number}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-bold">{formatMoneyEur(order.total_net)}</p>
                        <Badge variant="outline" className={config?.color}>{config?.label || order.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </PartnerLayout>
  );
}
