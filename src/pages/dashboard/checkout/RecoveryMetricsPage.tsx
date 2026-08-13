import { useState } from "react";
import { useRecoveryMetrics } from "@/hooks/useRecoveryMetrics";
import { KPICard, KPIGrid } from "@/components/design-system/KPICard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ShoppingCart, CheckCircle2, TrendingUp, Euro } from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { CheckoutBackHeader } from "@/components/checkout/admin/CheckoutBackHeader";

const PERIOD_OPTIONS = [
  { value: "30", label: "Últimos 30 dias" },
  { value: "60", label: "Últimos 60 dias" },
  { value: "90", label: "Últimos 90 dias" },
];

export default function RecoveryMetricsPage() {
  const [days, setDays] = useState(90);
  const { data, isLoading } = useRecoveryMetrics(days);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const metrics = data;
  const isEmpty = !metrics || metrics.totalAbandoned === 0;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <CheckoutBackHeader title="Métricas de Recuperação" parent={{ label: "Funis de Checkout", to: "/dashboard/checkout" }} />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Métricas de Recuperação</h1>
          <p className="text-sm text-muted-foreground">Performance de recuperação de carrinhos abandonados</p>
        </div>
        <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isEmpty ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ShoppingCart className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Sem dados de carrinhos abandonados neste período.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <KPIGrid columns={4}>
            <KPICard
              title="Total Abandonados"
              value={metrics.totalAbandoned}
              icon={<ShoppingCart className="h-4 w-4" />}
              variant="default"
            />
            <KPICard
              title="Total Recuperados"
              value={metrics.totalRecovered}
              icon={<CheckCircle2 className="h-4 w-4" />}
              variant="success"
            />
            <KPICard
              title="Taxa de Recuperação"
              value={`${metrics.globalRate}%`}
              icon={<TrendingUp className="h-4 w-4" />}
              variant="primary"
            />
            <KPICard
              title="Valor Recuperado"
              value={`€${metrics.totalValueRecovered.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`}
              icon={<Euro className="h-4 w-4" />}
              variant="success"
            />
          </KPIGrid>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Recovery Rate Over Time */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Taxa de Recuperação ao Longo do Tempo</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={metrics.timeline}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip
                      contentStyle={{ fontSize: 12 }}
                      formatter={(value: number) => [`${value}%`, "Taxa"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="rate"
                      name="Taxa %"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary) / 0.1)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Value Recovered Over Time */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Valor Recuperado ao Longo do Tempo</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={metrics.timeline}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ fontSize: 12 }}
                      formatter={(value: number) => [`€${value.toLocaleString("pt-PT")}`, "Valor"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      name="Valor €"
                      stroke="hsl(142 76% 36%)"
                      fill="hsl(142 76% 36% / 0.1)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Performance by Sequence */}
          {metrics.bySequence.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Performance por Sequência</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={Math.max(200, metrics.bySequence.length * 50)}>
                  <BarChart data={metrics.bySequence} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="sequence_name"
                      tick={{ fontSize: 11 }}
                      width={160}
                    />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Legend />
                    <Bar dataKey="rate" name="Taxa %" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="value" name="Valor €" fill="hsl(142 76% 36%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
