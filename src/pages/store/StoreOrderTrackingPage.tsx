import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Helmet } from "react-helmet-async";
import { Package, Truck, CheckCircle2, Clock, ExternalLink, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { formatMoney } from "@/lib/money";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: "Pendente", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  paid: { label: "Pago", color: "bg-blue-100 text-blue-800", icon: CreditCard },
  processing: { label: "Em preparação", color: "bg-indigo-100 text-indigo-800", icon: Package },
  shipped: { label: "Enviado", color: "bg-purple-100 text-purple-800", icon: Truck },
  delivered: { label: "Entregue", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  cancelled: { label: "Cancelado", color: "bg-red-100 text-red-800", icon: Clock },
  refunded: { label: "Reembolsado", color: "bg-gray-100 text-gray-800", icon: Clock },
};

const TIMELINE_STEPS = ["pending", "paid", "processing", "shipped", "delivered"];

export default function StoreOrderTrackingPage() {
  const { workspaceSlug, orderId } = useParams<{ workspaceSlug: string; orderId: string }>();

  const { data: order, isLoading } = useQuery({
    queryKey: ["public-order-tracking", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_orders")
        .select("id, order_number, status, items, subtotal, discount_amount, shipping_cost, total, currency, created_at, paid_at, shipped_at, completed_at, tracking_number, tracking_carrier, tracking_url, shipping_method_name")
        .eq("id", orderId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });

  const { data: storeSettings } = useQuery({
    queryKey: ["store-settings-public", workspaceSlug],
    queryFn: async () => {
      const { data: ws } = await supabase
        .from("public_workspaces")
        .select("id")
        .eq("slug", workspaceSlug!)
        .single();
      if (!ws) return null;
      const { data } = await supabase
        .from("store_settings")
        .select("store_name, logo_url, primary_color")
        .eq("workspace_id", ws.id)
        .maybeSingle();
      return data;
    },
    enabled: !!workspaceSlug,
  });

  const storeName = storeSettings?.store_name || "Loja";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-2xl p-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Package className="h-16 w-16 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-semibold">Encomenda não encontrada</h1>
          <p className="text-muted-foreground">Verifique o link e tente novamente.</p>
        </div>
      </div>
    );
  }

  const status = order.status || "pending";
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const StatusIcon = statusConfig.icon;
  const currentStepIdx = TIMELINE_STEPS.indexOf(status);
  const items = (order.items as any[]) || [];

  return (
    <>
      <Helmet>
        <title>Encomenda {order.order_number} | {storeName}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card">
          <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {storeSettings?.logo_url && (
                <img src={storeSettings.logo_url} alt="" className="h-8 w-8 rounded-md object-cover" />
              )}
              <span className="font-semibold">{storeName}</span>
            </div>
            <Badge className={statusConfig.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
          {/* Order number & date */}
          <div>
            <h1 className="text-2xl font-bold">Encomenda #{order.order_number}</h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(order.created_at), "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: pt })}
            </p>
          </div>

          {/* Timeline */}
          {status !== "cancelled" && status !== "refunded" && (
            <div className="flex items-center justify-between">
              {TIMELINE_STEPS.map((step, idx) => {
                const stepConf = STATUS_CONFIG[step];
                const StepIcon = stepConf.icon;
                const isActive = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                return (
                  <div key={step} className="flex flex-col items-center flex-1 relative">
                    {idx > 0 && (
                      <div
                        className={`absolute top-4 right-1/2 left-[-50%] h-0.5 ${
                          idx <= currentStepIdx ? "bg-primary" : "bg-muted"
                        }`}
                        style={{ width: "100%", left: "-50%" }}
                      />
                    )}
                    <div
                      className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                        isCurrent
                          ? "border-primary bg-primary text-primary-foreground"
                          : isActive
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-muted bg-muted text-muted-foreground"
                      }`}
                    >
                      <StepIcon className="h-4 w-4" />
                    </div>
                    <span className={`mt-1 text-[10px] font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                      {stepConf.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tracking info */}
          {order.tracking_number && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Tracking do envio</h2>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {order.tracking_carrier || "Transportadora"}: <span className="font-mono font-medium text-foreground">{order.tracking_number}</span>
                </span>
                {order.tracking_url && (
                  <Button variant="outline" size="sm" asChild className="gap-1">
                    <a href={order.tracking_url} target="_blank" rel="noopener noreferrer">
                      Seguir envio <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                )}
              </div>
              {order.shipping_method_name && (
                <p className="text-xs text-muted-foreground">Método: {order.shipping_method_name}</p>
              )}
            </div>
          )}

          {/* Shipping address removed from public view for privacy */}

          {/* Items */}
          <div className="rounded-lg border p-4 space-y-4">
            <h3 className="font-semibold">Produtos</h3>
            <div className="space-y-3">
              {items.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {item.image ? (
                      <img src={item.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-5 w-5 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-medium">€{formatMoney((item.unit_price || item.price) * item.quantity)}</p>
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>€{formatMoney(order.subtotal)}</span>
              </div>
              {(order.discount_amount ?? 0) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Desconto</span>
                  <span>-€{formatMoney(order.discount_amount)}</span>
                </div>
              )}
              {(order.shipping_cost ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Envio</span>
                  <span>€{formatMoney(order.shipping_cost)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-semibold text-base pt-1">
                <span>Total</span>
                <span className="text-primary">€{formatMoney(order.total)}</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
