import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingCart, TrendingUp, AlertTriangle, CheckCircle2, Clock, Euro, RefreshCw } from "lucide-react";
import { useAbandonedCarts, useAbandonedCartStats, type AbandonedCart } from "@/hooks/useAbandonedCarts";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

import { RECOVERY_STATUS_LABELS, getRecoveryStatusLabel } from "@/lib/abandonedCartNormalizer";

export function AbandonedCartsPanel() {
  const [statusFilter, setStatusFilter] = useState("all");
  const { data: stats, isLoading: statsLoading } = useAbandonedCartStats();
  const { data: carts = [], isLoading: cartsLoading } = useAbandonedCarts(
    statusFilter !== "all" ? { status: statusFilter } : undefined,
  );

  const recoveryRate = stats && stats.total > 0
    ? ((stats.recovered / stats.total) * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          icon={<ShoppingCart className="h-4 w-4" />}
          label="Carrinhos Abandonados"
          value={statsLoading ? "..." : String(stats?.total || 0)}
        />
        <KpiCard
          icon={<Euro className="h-4 w-4" />}
          label="Valor Total Perdido"
          value={statsLoading ? "..." : `${(stats?.totalValue || 0).toFixed(0)}€`}
        />
        <KpiCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label="Taxa Recuperação"
          value={statsLoading ? "..." : `${recoveryRate}%`}
          accent
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Receita Recuperada"
          value={statsLoading ? "..." : `${(stats?.recoveredValue || 0).toFixed(0)}€`}
          accent
        />
      </div>

      {/* Filters + Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Carrinhos Abandonados</CardTitle>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filtrar..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="abandoned">Abandonados</SelectItem>
              <SelectItem value="touch_1_sent">Toque 1</SelectItem>
              <SelectItem value="touch_2_sent">Toque 2</SelectItem>
              <SelectItem value="touch_3_sent">Toque 3</SelectItem>
              <SelectItem value="recovered">Recuperados</SelectItem>
              <SelectItem value="expired">Expirados</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {cartsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : carts.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <ShoppingCart className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
              <p>Nenhum carrinho abandonado encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-medium text-muted-foreground">
                    <th className="pb-2">Cliente</th>
                    <th className="pb-2">Valor</th>
                    <th className="pb-2">Produtos</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Detetado</th>
                  </tr>
                </thead>
                <tbody>
                  {carts.map((cart) => (
                    <CartRow key={cart.id} cart={cart} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`rounded-lg p-2 ${accent ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function CartRow({ cart }: { cart: AbandonedCart }) {
  const status = getRecoveryStatusLabel(cart.recovery_status);
  const itemCount = Array.isArray(cart.cart_items) ? cart.cart_items.length : 0;
  const timeAgo = formatDistanceToNow(new Date(cart.detected_at), { addSuffix: true, locale: pt });

  return (
    <tr className="border-b last:border-0">
      <td className="py-3">
        <p className="font-medium">{cart.customer_name || "—"}</p>
        <p className="text-xs text-muted-foreground">{cart.customer_email || cart.customer_phone || "—"}</p>
      </td>
      <td className="py-3 font-medium">{Number(cart.cart_value).toFixed(2)}€</td>
      <td className="py-3 text-muted-foreground">{itemCount} produto{itemCount !== 1 ? "s" : ""}</td>
      <td className="py-3">
        <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
      </td>
      <td className="py-3 text-xs text-muted-foreground">{timeAgo}</td>
    </tr>
  );
}
