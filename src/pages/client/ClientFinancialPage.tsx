import { ClientLayout } from "@/components/client-portal/ClientLayout";
import { useClientPermissions } from "@/hooks/client-portal/useClientPermissions";
import { useClientInvoices } from "@/hooks/client-portal/useClientInvoices";
import { useClientAuth } from "@/hooks/client-portal/useClientAuth";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Loader2, DollarSign, Clock, AlertTriangle, CreditCard } from "lucide-react";
import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { pt } from "date-fns/locale";

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v);

export default function ClientFinancialPage() {
  const workspaceId = localStorage.getItem("client_workspace_id") || undefined;
  const { clientUser } = useClientAuth({ workspaceId });
  const { canViewFinancials, isLoading: permLoading } = useClientPermissions();
  const { invoices, isLoading, totalInvoiced, totalPaid, totalPending, totalOverdue } =
    useClientInvoices();

  // Monthly chart data (last 12 months)
  const chartData = useMemo(() => {
    const now = new Date();
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(now, i));
      const monthEnd = endOfMonth(subMonths(now, i));
      const monthInvoices = invoices.filter((inv) =>
        isWithinInterval(new Date(inv.issue_date), { start: monthStart, end: monthEnd })
      );
      const faturado = monthInvoices.reduce((s, inv) => s + inv.total, 0);
      const pago = monthInvoices.reduce((s, inv) => s + (inv.amount_paid ?? 0), 0);
      months.push({
        month: format(monthStart, "MMM yy", { locale: pt }),
        faturado,
        pago,
      });
    }
    return months;
  }, [invoices]);

  if (permLoading) {
    return (
      <ClientLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ClientLayout>
    );
  }

  if (!canViewFinancials) {
    return <Navigate to="/client/dashboard" replace />;
  }

  const kpis = [
    { label: "Total Faturado", value: fmt(totalInvoiced), icon: DollarSign, className: "text-foreground" },
    { label: "Total Pago", value: fmt(totalPaid), icon: CreditCard, className: "text-green-600" },
    { label: "Pendente", value: fmt(totalPending), icon: Clock, className: "text-amber-600" },
    { label: "Vencido", value: fmt(totalOverdue), icon: AlertTriangle, className: totalOverdue > 0 ? "text-red-600" : "text-muted-foreground" },
  ];

  return (
    <ClientLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6" />
            Financeiro
          </h1>
          <p className="text-muted-foreground">Visão financeira consolidada</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {kpis.map((kpi) => (
                <Card key={kpi.label}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <kpi.icon className={`h-4 w-4 ${kpi.className}`} />
                      <p className="text-sm text-muted-foreground">{kpi.label}</p>
                    </div>
                    <p className={`text-2xl font-bold ${kpi.className}`}>{kpi.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Monthly Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Evolução Mensal (12 meses)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} className="text-xs" />
                      <Tooltip
                        formatter={(value: number) => fmt(value)}
                        labelClassName="font-medium"
                      />
                      <Bar dataKey="faturado" name="Faturado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="pago" name="Pago" fill="hsl(var(--primary) / 0.4)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Commercial Conditions */}
            {clientUser && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Condições Comerciais</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Condições de Pagamento</p>
                      <p className="font-medium">{clientUser.payment_terms || "Imediato"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Limite de Crédito</p>
                      <p className="font-medium">{clientUser.credit_limit ? fmt(clientUser.credit_limit) : "Sem limite"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </ClientLayout>
  );
}
