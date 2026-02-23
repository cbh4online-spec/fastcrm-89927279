import { useState } from "react";
import { ClientLayout } from "@/components/client-portal/ClientLayout";
import { useClientAuth } from "@/hooks/client-portal/useClientAuth";
import { useConsumptionAnalytics, ConsumptionPeriod } from "@/hooks/client-portal/useConsumptionAnalytics";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, TrendingUp, Loader2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from "recharts";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(210 80% 55%)",
  "hsl(160 60% 45%)",
  "hsl(30 90% 55%)",
  "hsl(280 70% 55%)",
  "hsl(0 70% 55%)",
];

const periodLabels: Record<ConsumptionPeriod, string> = {
  month: "Último mês",
  quarter: "Último trimestre",
  semester: "Último semestre",
  year: "Último ano",
};

export default function ClientConsumptionPage() {
  const { clientUser } = useClientAuth();
  const [period, setPeriod] = useState<ConsumptionPeriod>("semester");
  const { data, isLoading } = useConsumptionAnalytics(clientUser?.id, clientUser?.workspace_id, period);

  return (
    <ClientLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-primary" />
              Consumo por Categoria
            </h1>
            <p className="text-muted-foreground mt-1">Análise detalhada do seu consumo</p>
          </div>
          <Select value={period} onValueChange={(v) => setPeriod(v as ConsumptionPeriod)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(periodLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !data || (data.totalNet === 0) ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Sem dados de consumo para o período selecionado.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total s/IVA</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{data.totalNet.toFixed(2)}€</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total c/IVA</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">{data.totalGross.toFixed(2)}€</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* By Category */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Consumo por Categoria</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.byCategory.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={data.byCategory.slice(0, 8)} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis type="number" className="text-xs" />
                        <YAxis dataKey="category" type="category" width={100} className="text-xs" />
                        <Tooltip formatter={(v: number) => [`${v.toFixed(2)}€`, "Valor"]} />
                        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">Sem dados</p>
                  )}
                </CardContent>
              </Card>

              {/* Distribution Pie */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Distribuição</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.byCategory.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={data.byCategory.slice(0, 5)}
                          dataKey="value"
                          nameKey="category"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={({ category, percent }) => `${category} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {data.byCategory.slice(0, 5).map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => [`${v.toFixed(2)}€`, "Valor"]} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">Sem dados</p>
                  )}
                </CardContent>
              </Card>

              {/* Monthly Evolution */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> Evolução Mensal
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={data.monthly}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip formatter={(v: number) => [`${v.toFixed(2)}€`, "Valor"]} />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* By Line */}
              {data.byLine.length > 0 && (
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Consumo por Linha</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={data.byLine.slice(0, 8)}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="line" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip formatter={(v: number) => [`${v.toFixed(2)}€`, "Valor"]} />
                        <Bar dataKey="value" fill="hsl(210 80% 55%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </ClientLayout>
  );
}
