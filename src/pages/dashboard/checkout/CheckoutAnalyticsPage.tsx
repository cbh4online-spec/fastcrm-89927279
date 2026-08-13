import { useCheckoutSessions } from "@/hooks/useCheckoutSessions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BarChart3, ShoppingCart, TrendingUp, DollarSign } from "lucide-react";
import { CheckoutBackHeader } from "@/components/checkout/admin/CheckoutBackHeader";

export default function CheckoutAnalyticsPage() {
  const { data: sessions, isLoading } = useCheckoutSessions();

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  const all = sessions || [];
  const completed = all.filter((s: any) => s.status === "completed");
  const totalRevenue = completed.reduce((s: number, c: any) => s + (c.total_value || 0), 0);
  const avgOrderValue = completed.length > 0 ? totalRevenue / completed.length : 0;
  const conversionRate = all.length > 0 ? (completed.length / all.length) * 100 : 0;
  const upsellAccepted = all.filter((s: any) => (s.upsells_accepted || []).length > 0).length;
  const upsellRate = all.length > 0 ? (upsellAccepted / all.length) * 100 : 0;

  return (
    <div className="space-y-6 p-6">
      <CheckoutBackHeader title="Analytics de Checkout" parent={{ label: "Funis de Checkout", to: "/dashboard/checkout" }} />
      <div>
        <h1 className="text-2xl font-bold">Analytics de Checkout</h1>
        <p className="text-muted-foreground">Métricas de conversão e receita</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sessões</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{all.length}</div>
            <p className="text-xs text-muted-foreground">{completed.length} concluídas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRevenue.toFixed(2)}€</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">AOV</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgOrderValue.toFixed(2)}€</div>
            <p className="text-xs text-muted-foreground">Upsell rate: {upsellRate.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sessões Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {all.slice(0, 20).map((s: any) => (
              <div key={s.id} className="flex items-center justify-between rounded border p-3 text-sm">
                <div>
                  <span className="font-medium">{s.customer_email || "Anónimo"}</span>
                  <span className="ml-2 text-muted-foreground">{new Date(s.created_at).toLocaleString("pt-PT")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{(s.total_value || 0).toFixed(2)}€</span>
                  <span className={`rounded px-2 py-0.5 text-xs ${s.status === "completed" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                    {s.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
