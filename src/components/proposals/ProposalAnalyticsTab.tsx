import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProposals } from "@/hooks/useProposals";
import { useProposalAnalytics } from "@/hooks/useProposalAnalytics";
import { KPICard } from "@/components/kpis/KPICard";
import {
  Eye,
  ShoppingCart,
  CreditCard,
  TrendingUp,
  DollarSign,
  Calculator,
  FileText,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format, subMonths, startOfMonth, isAfter } from "date-fns";
import { pt } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_COLORS: Record<string, string> = {
  draft: "hsl(var(--muted-foreground))",
  published: "hsl(var(--primary))",
  accepted: "hsl(142, 71%, 45%)",
  expired: "hsl(var(--warning))",
  rejected: "hsl(var(--destructive))",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Rascunho",
  published: "Publicada",
  accepted: "Aceite",
  expired: "Expirada",
  rejected: "Rejeitada",
};

export function ProposalAnalyticsTab() {
  const { data: proposals, isLoading: proposalsLoading } = useProposals();
  const { data: analytics, isLoading: analyticsLoading } = useProposalAnalytics();

  const isLoading = proposalsLoading || analyticsLoading;

  // Status distribution for pie chart
  const statusData = useMemo(() => {
    if (!proposals?.length) return [];
    const counts: Record<string, number> = {};
    proposals.forEach((p) => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, count]) => ({
      name: STATUS_LABELS[status] || status,
      value: count,
      color: STATUS_COLORS[status] || "hsl(var(--muted))",
    }));
  }, [proposals]);

  // Monthly evolution (last 6 months)
  const monthlyData = useMemo(() => {
    if (!proposals?.length) return [];
    const now = new Date();
    const months: { month: string; label: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(now, i);
      const start = startOfMonth(d);
      const nextStart = startOfMonth(subMonths(now, i - 1));
      const label = format(d, "MMM yy", { locale: pt });
      const count = proposals.filter((p) => {
        const created = new Date(p.created_at);
        return isAfter(created, start) && (i === 0 || !isAfter(created, nextStart));
      }).length;
      months.push({ month: label, label, count });
    }
    return months;
  }, [proposals]);

  // Conversion funnel
  const funnelData = useMemo(() => {
    if (!proposals?.length) return [];
    const total = proposals.length;
    const published = proposals.filter((p) => p.status !== "draft").length;
    const viewed = proposals.filter((p) => (p.views_count || 0) > 0).length;
    const accepted = proposals.filter((p) => p.status === "accepted").length;
    return [
      { label: "Criadas", value: total, pct: 100 },
      { label: "Publicadas", value: published, pct: total > 0 ? Math.round((published / total) * 100) : 0 },
      { label: "Visualizadas", value: viewed, pct: total > 0 ? Math.round((viewed / total) * 100) : 0 },
      { label: "Aceites", value: accepted, pct: total > 0 ? Math.round((accepted / total) * 100) : 0 },
    ];
  }, [proposals]);

  // Top 5 proposals by views
  const topProposals = useMemo(() => {
    if (!proposals?.length) return [];
    return [...proposals]
      .sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
      .slice(0, 5);
  }, [proposals]);

  // Average value
  const avgValue = useMemo(() => {
    if (!proposals?.length) return 0;
    const withPrice = proposals.filter((p) => p.price && p.price > 0);
    if (!withPrice.length) return 0;
    return withPrice.reduce((s, p) => s + (p.price || 0), 0) / withPrice.length;
  }, [proposals]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72 rounded-lg" />
          <Skeleton className="h-72 rounded-lg" />
        </div>
      </div>
    );
  }

  const hasData = proposals && proposals.length > 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          label="Visualizações"
          value={analytics?.totalViews ?? 0}
          format="number"
          icon={<Eye className="h-4 w-4" />}
        />
        <KPICard
          label="Checkouts"
          value={analytics?.totalCheckouts ?? 0}
          format="number"
          icon={<ShoppingCart className="h-4 w-4" />}
        />
        <KPICard
          label="Pagamentos"
          value={analytics?.totalPayments ?? 0}
          format="number"
          icon={<CreditCard className="h-4 w-4" />}
        />
        <KPICard
          label="Conversão"
          value={analytics?.conversionRate ? analytics.conversionRate.toFixed(1) : "0"}
          format="percentage"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <KPICard
          label="Receita Total"
          value={analytics?.revenueTotal ?? 0}
          format="currency"
          icon={<DollarSign className="h-4 w-4" />}
        />
        <KPICard
          label="Valor Médio"
          value={avgValue}
          format="currency"
          icon={<Calculator className="h-4 w-4" />}
        />
      </div>

      {!hasData ? (
        <Card className="p-12 text-center">
          <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-30" />
          <h3 className="text-lg font-medium mb-2">Sem dados de análise</h3>
          <p className="text-sm text-muted-foreground">
            Crie propostas para começar a ver métricas de performance e conversão.
          </p>
        </Card>
      ) : (
        <>
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribuição por Estado</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Monthly Evolution */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Evolução Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" className="text-xs" />
                    <YAxis allowDecimals={false} className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="count" name="Propostas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Conversion Funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Funil de Conversão</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {funnelData.map((step, i) => (
                  <div key={step.label} className="flex items-center gap-4">
                    <span className="text-sm font-medium w-28 shrink-0">{step.label}</span>
                    <div className="flex-1 h-8 bg-muted rounded-md overflow-hidden">
                      <div
                        className="h-full rounded-md transition-all"
                        style={{
                          width: `${step.pct}%`,
                          backgroundColor: `hsl(var(--primary) / ${1 - i * 0.2})`,
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold w-16 text-right">
                      {step.value} ({step.pct}%)
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top 5 Proposals */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Top 5 Propostas</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead className="text-right">Views</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topProposals.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="max-w-[200px] truncate font-medium">
                          {p.title}
                        </TableCell>
                        <TableCell className="text-right">{p.views_count || 0}</TableCell>
                        <TableCell className="text-right">
                          {p.price ? `€${p.price.toLocaleString("pt-PT")}` : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {STATUS_LABELS[p.status] || p.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Performance by Template */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance por Modelo</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {analytics?.byTemplate && analytics.byTemplate.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Modelo</TableHead>
                        <TableHead className="text-right">Views</TableHead>
                        <TableHead className="text-right">Pagam.</TableHead>
                        <TableHead className="text-right">Conv.</TableHead>
                        <TableHead className="text-right">Receita</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.byTemplate.map((t, i) => (
                        <TableRow key={i}>
                          <TableCell className="max-w-[160px] truncate font-medium">
                            {t.templateName}
                          </TableCell>
                          <TableCell className="text-right">{t.views}</TableCell>
                          <TableCell className="text-right">{t.payments}</TableCell>
                          <TableCell className="text-right">{t.conversionRate.toFixed(1)}%</TableCell>
                          <TableCell className="text-right">
                            €{t.revenue.toLocaleString("pt-PT")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-8 text-center text-sm text-muted-foreground">
                    Sem dados de tracking por modelo ainda.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
