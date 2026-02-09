import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { StoreHeader } from "@/components/store/StoreHeader";
import { StoreCartDrawer } from "@/components/store/StoreCartDrawer";
import { useStoreOrderHistory } from "@/hooks/useStoreReviewsWishlist";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, ArrowLeft, Truck, ExternalLink, RotateCcw } from "lucide-react";
import { StoreReturnRequestForm } from "@/components/store/StoreReturnRequestForm";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  paid: { label: "Pago", variant: "default" },
  processing: { label: "Em processamento", variant: "outline" },
  shipped: { label: "Enviado", variant: "default" },
  delivered: { label: "Entregue", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
  refunded: { label: "Reembolsado", variant: "destructive" },
};

export default function StoreOrderHistoryPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const wsSlug = workspaceSlug || "";
  const { data: orders = [], isLoading } = useStoreOrderHistory();

  return (
    <>
      <Helmet><title>As Minhas Encomendas | Loja</title></Helmet>
      <div className="min-h-screen bg-background">
        <StoreHeader workspaceSlug={wsSlug} />
        <StoreCartDrawer workspaceSlug={wsSlug} />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Link to={`/store/${wsSlug}`}>
              <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
            </Link>
            <h1 className="text-2xl font-bold">As Minhas Encomendas</h1>
            <div className="ml-auto">
              <Link to={`/store/${wsSlug}/downloads`}>
                <Button variant="outline" size="sm" className="gap-2">
                  <Package className="h-4 w-4" />
                  Produtos Digitais
                </Button>
              </Link>
            </div>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground space-y-3">
              <Package className="h-16 w-16 mx-auto opacity-20" />
              <p>Ainda não tem encomendas</p>
              <Link to={`/store/${wsSlug}`}>
                <Button variant="outline">Explorar produtos</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const items = (order.items as any[]) || [];
                const status = statusLabels[order.status] || { label: order.status, variant: "secondary" as const };
                return (
                  <div key={order.id} className="border rounded-xl p-4 md:p-6 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold">#{order.order_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(order.created_at), "d MMM yyyy 'às' HH:mm", { locale: pt })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={status.variant}>{status.label}</Badge>
                        <span className="text-lg font-bold text-primary">
                          €{Number(order.total).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 overflow-x-auto">
                      {items.slice(0, 4).map((item: any, i: number) => (
                        <div key={i} className="h-16 w-16 rounded-lg overflow-hidden bg-muted flex-shrink-0 border">
                          {item.image ? (
                            <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <Package className="h-6 w-6 text-muted-foreground/30" />
                            </div>
                          )}
                        </div>
                      ))}
                      {items.length > 4 && (
                        <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center text-sm text-muted-foreground flex-shrink-0 border">
                          +{items.length - 4}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{items.length} {items.length === 1 ? "produto" : "produtos"}</span>
                      {(order as any).tracking_number && (
                        <span className="flex items-center gap-1">
                          <Truck className="h-3 w-3" />
                          {(order as any).tracking_url ? (
                            <a href={(order as any).tracking_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-0.5">
                              {(order as any).tracking_number} <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          ) : (
                            <span className="font-mono">{(order as any).tracking_number}</span>
                          )}
                        </span>
                      )}
                    </div>
                    {/* Return Request Button */}
                    {["paid", "processing", "shipped", "delivered"].includes(order.status) && (
                      <div className="flex justify-end pt-2 border-t">
                        <StoreReturnRequestForm
                          orderId={order.id}
                          orderNumber={order.order_number || order.id.slice(0, 8)}
                          orderTotal={Number(order.total)}
                          orderStatus={order.status}
                          orderItems={items.map((item: any) => ({
                            product_id: item.product_id,
                            name: item.name,
                            quantity: item.quantity,
                            unit_price: item.unit_price,
                          }))}
                          workspaceId={(order as any).workspace_id || ""}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
