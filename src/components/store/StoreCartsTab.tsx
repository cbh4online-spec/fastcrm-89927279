import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, Clock, Smartphone, Monitor, Tablet, AlertTriangle, Eye, DollarSign } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { motion } from "framer-motion";

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3 },
};

const deviceIcon = (type: string) => {
  if (type === "mobile") return <Smartphone className="h-4 w-4" />;
  if (type === "tablet") return <Tablet className="h-4 w-4" />;
  return <Monitor className="h-4 w-4" />;
};

const recoveryStatusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  abandoned: { label: "Abandonado", variant: "destructive" },
  contacted: { label: "Contactado", variant: "secondary" },
  recovered: { label: "Recuperado", variant: "default" },
  expired: { label: "Expirado", variant: "outline" },
};

export function StoreCartsTab() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  // Active carts: sessions with cart_items in last 30 minutes
  const activeCarts = useQuery({
    queryKey: ["store-active-carts", workspaceId],
    queryFn: async () => {
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("store_visitor_sessions" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .not("cart_items", "is", null)
        .gt("last_activity_at", thirtyMinAgo)
        .order("cart_updated_at", { ascending: false });

      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!workspaceId,
    refetchInterval: 15_000, // Auto-refresh every 15s
  });

  // Abandoned carts
  const abandonedCarts = useQuery({
    queryKey: ["store-abandoned-carts", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_abandoned_carts" as any)
        .select("*")
        .eq("workspace_id", workspaceId!)
        .order("abandoned_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!workspaceId,
  });

  // KPIs
  const totalAbandoned = abandonedCarts.data?.length || 0;
  const lostValue = abandonedCarts.data?.reduce((sum: number, c: any) => sum + (c.subtotal || 0), 0) || 0;
  const recovered = abandonedCarts.data?.filter((c: any) => c.recovery_status === "recovered").length || 0;
  const recoveryRate = totalAbandoned > 0 ? (recovered / totalAbandoned) * 100 : 0;
  const activeCount = activeCarts.data?.length || 0;
  const activeValue = activeCarts.data?.reduce((sum: number, c: any) => sum + (c.cart_subtotal || 0), 0) || 0;

  return (
    <div className="space-y-6 mt-6">
      {/* KPIs */}
      <motion.div {...fadeIn} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-muted-foreground">Carrinhos Ativos</p>
              <div className="relative">
                <ShoppingCart className="h-4 w-4 text-primary" />
                {activeCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                )}
              </div>
            </div>
            <p className="text-2xl font-bold">{activeCount}</p>
            <p className="text-xs text-muted-foreground">€{activeValue.toFixed(2)} em valor</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-muted-foreground">Abandonados</p>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <p className="text-2xl font-bold">{totalAbandoned}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-muted-foreground">Valor Perdido</p>
              <DollarSign className="h-4 w-4 text-warning" />
            </div>
            <p className="text-2xl font-bold text-destructive">€{lostValue.toFixed(2)}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-muted-foreground">Taxa Recuperação</p>
              <Eye className="h-4 w-4 text-success" />
            </div>
            <p className="text-2xl font-bold text-success">{recoveryRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Active Carts */}
      <motion.div {...fadeIn} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              Carrinhos Ativos
              {activeCount > 0 && (
                <Badge variant="default" className="ml-2 gap-1">
                  <span className="h-1.5 w-1.5 bg-green-400 rounded-full animate-pulse" />
                  Ao vivo
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activeCarts.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : activeCount === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum carrinho ativo neste momento</p>
            ) : (
              <div className="space-y-3">
                {(activeCarts.data || []).map((session: any) => {
                  const cartItems = (session.cart_items || []) as any[];
                  const timeAgo = session.cart_updated_at
                    ? formatDistanceToNow(new Date(session.cart_updated_at), { addSuffix: true, locale: pt })
                    : "—";

                  return (
                    <div key={session.id} className="border rounded-xl p-4 flex items-start gap-4">
                      <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                        {deviceIcon(session.device_type || "desktop")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {cartItems.length} {cartItems.length === 1 ? "artigo" : "artigos"}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {timeAgo}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {cartItems.slice(0, 3).map((item: any, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {item.name} ×{item.quantity}
                            </Badge>
                          ))}
                          {cartItems.length > 3 && (
                            <Badge variant="secondary" className="text-xs">+{cartItems.length - 3}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">€{(session.cart_subtotal || 0).toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground capitalize">{session.device_type || "desktop"}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Abandoned Carts */}
      <motion.div {...fadeIn} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Carrinhos Abandonados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {abandonedCarts.isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : totalAbandoned === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum carrinho abandonado</p>
            ) : (
              <div className="space-y-3">
                {(abandonedCarts.data || []).map((cart: any) => {
                  const items = (cart.items || []) as any[];
                  const status = recoveryStatusLabels[cart.recovery_status] || recoveryStatusLabels.abandoned;
                  const timeAgo = cart.abandoned_at
                    ? formatDistanceToNow(new Date(cart.abandoned_at), { addSuffix: true, locale: pt })
                    : "—";

                  return (
                    <div key={cart.id} className="border rounded-xl p-4 flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {cart.customer_name || cart.customer_email || "Visitante anónimo"}
                          </span>
                          <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-1">
                          {items.slice(0, 3).map((item: any, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {item.name} ×{item.quantity}
                            </Badge>
                          ))}
                          {items.length > 3 && (
                            <Badge variant="secondary" className="text-xs">+{items.length - 3}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{timeAgo}</p>
                      </div>
                      <p className="text-sm font-bold text-destructive">€{(cart.subtotal || 0).toFixed(2)}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
