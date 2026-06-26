import { useMemo } from "react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceFinancials } from "@/hooks/useWorkspaceFinancials";
import { IXSection } from "@/components/weekly-dashboard/IXSection";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";

const MONTH_LABELS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

function formatEuro(value: number) {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value || 0);
}

function DeltaBadge({ value }: { value: number }) {
  if (!isFinite(value) || value === 0) {
    return <span className="text-xs font-semibold text-muted-foreground">+0%</span>;
  }
  const positive = value > 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold ${
        positive ? "text-emerald-600" : "text-rose-600"
      }`}
    >
      <Icon className="h-3 w-3" />
      {positive ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}

function KpiCard({
  label,
  value,
  delta,
}: {
  label: string;
  value: number;
  delta?: number;
}) {
  return (
    <Card className="p-5 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-muted-foreground">{label}</span>
        {typeof delta === "number" && <DeltaBadge value={delta} />}
      </div>
      <span className="text-2xl font-bold tracking-tight">{formatEuro(value)}</span>
    </Card>
  );
}

export function VisaoGlobalSection() {
  const { currentWorkspace } = useWorkspace();
  const { data, isLoading } = useWorkspaceFinancials(currentWorkspace?.id);

  const faturacaoChart = useMemo(() => {
    if (!data) return [];
    return MONTH_LABELS.map((label, i) => {
      const row: Record<string, any> = { month: label };
      for (const y of data.yearly) row[String(y.year)] = y.months[i];
      return row;
    });
  }, [data]);

  const years = data?.yearly.map((y) => y.year) ?? [];
  const yearColors = ["hsl(var(--muted-foreground) / 0.3)", "hsl(var(--muted-foreground) / 0.5)", "hsl(142 71% 45%)"];

  if (isLoading || !data) {
    return (
      <div className="space-y-10">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-72 w-full" />
          </div>
        ))}
      </div>
    );
  }

  const palette = ["#ef4444", "#f97316", "#f59e0b", "#eab308", "#10b981", "#06b6d4", "#3b82f6", "#a855f7"];

  return (
    <div className="space-y-10">
      {/* FATURAÇÃO */}
      <IXSection
        title="Faturação"
        subtitle="Visão geral da performance de vendas e tendências da faturação (s/ IVA)"
        bare
      >
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
          <Card className="p-5">
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={faturacaoChart}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    tickFormatter={(v) => `€${(v / 1000).toFixed(0)}K`}
                  />
                  <Tooltip
                    formatter={(v: number) => formatEuro(v)}
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  {years.map((y, i) => (
                    <Bar
                      key={y}
                      dataKey={String(y)}
                      name={String(y)}
                      fill={yearColors[i] || "hsl(var(--primary))"}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
            <KpiCard label="Hoje" value={data.kpis.today} />
            <KpiCard label="Este mês" value={data.kpis.thisMonth} delta={data.kpis.thisMonthDelta} />
            <KpiCard label="Este trimestre" value={data.kpis.thisQuarter} delta={data.kpis.thisQuarterDelta} />
            <KpiCard label="Este ano" value={data.kpis.thisYear} delta={data.kpis.thisYearDelta} />
          </div>
        </div>
      </IXSection>

      {/* COBRANÇAS */}
      <IXSection
        title="Cobranças"
        subtitle="Acompanha o fluxo de caixa e o dinheiro em dívida (valores c/ IVA)"
        bare
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Card className="p-4 bg-slate-50 dark:bg-slate-900/40">
                <span className="text-xs font-semibold text-muted-foreground">Total</span>
                <div className="text-lg font-bold mt-1">{formatEuro(data.collections.totalOutstanding)}</div>
              </Card>
              <Card className="p-4 bg-amber-50 dark:bg-amber-950/30">
                <span className="text-xs font-semibold text-muted-foreground">Não vencido</span>
                <div className="text-lg font-bold mt-1">{formatEuro(data.collections.notDue)}</div>
              </Card>
              <Card className="p-4 bg-rose-50 dark:bg-rose-950/30">
                <span className="text-xs font-semibold text-muted-foreground">Vencido</span>
                <div className="text-lg font-bold mt-1">{formatEuro(data.collections.overdue)}</div>
              </Card>
            </div>
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-center mb-3">Envelhecimento da dívida</h3>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.collections.aging}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis tickLine={false} axisLine={false} fontSize={11} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(v: number) => formatEuro(v)} contentStyle={{ borderRadius: 8 }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="recebido" name="Recebido" stackId="a" fill="#86efac" />
                    <Bar dataKey="naoVencido" name="Não vencido" stackId="a" fill="#fde68a" />
                    <Bar dataKey="vencido" name="Vencido" stackId="a" fill="#fca5a5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card className="p-5">
            <h3 className="text-sm font-semibold mb-4">Clientes devedores</h3>
            {data.collections.topDebtors.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem valores em dívida.</p>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-auto">
                <div className="grid grid-cols-[1fr_auto_auto] gap-3 text-xs font-semibold text-muted-foreground border-b pb-2">
                  <span>Cliente</span>
                  <span className="text-right w-24">Não vencido</span>
                  <span className="text-right w-24">Vencido</span>
                </div>
                {data.collections.topDebtors.map((d) => (
                  <div
                    key={d.key}
                    className="grid grid-cols-[1fr_auto_auto] gap-3 items-center text-sm py-1"
                  >
                    <span className="truncate" title={d.name}>{d.name}</span>
                    <span className="text-right w-24 tabular-nums text-muted-foreground">
                      {formatEuro(d.notDue)}
                    </span>
                    <span className="text-right w-24">
                      {d.overdue > 0 ? (
                        <Badge variant="destructive" className="font-mono tabular-nums">
                          {formatEuro(d.overdue)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground tabular-nums">0,00€</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </IXSection>

      {/* CLIENTES */}
      <IXSection
        title="Clientes"
        subtitle="Análise do portefólio de clientes e métricas de atividade"
        bare
      >
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="text-base font-bold mb-4">Dependência de clientes</h3>
            {data.clients.dependency.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem dados suficientes.</p>
            ) : (
              <>
                <div className="flex h-3 rounded-full overflow-hidden">
                  {data.clients.dependency.map((c, i) => (
                    <div
                      key={c.key}
                      style={{ width: `${c.percent}%`, background: palette[i % palette.length] }}
                      title={`${c.name} — ${c.percent.toFixed(2)}%`}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                  {data.clients.dependency.map((c, i) => (
                    <div key={c.key} className="flex items-start gap-2 text-sm">
                      <span
                        className="h-2.5 w-2.5 rounded-full mt-1.5 shrink-0"
                        style={{ background: palette[i % palette.length] }}
                      />
                      <div className="min-w-0">
                        <div className="truncate font-medium" title={c.name}>{c.name}</div>
                        <div className="text-xs text-muted-foreground">{c.percent.toFixed(2)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-center mb-3">Clientes ativos</h3>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.clients.monthly}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                    <YAxis tickLine={false} axisLine={false} fontSize={11} />
                    <Tooltip contentStyle={{ borderRadius: 8 }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="novos" name="Novos Clientes" stackId="a" fill="#a7f3d0" />
                    <Bar dataKey="recorrentes" name="Clientes" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3">
              <Card className="p-4">
                <span className="text-xs font-semibold text-muted-foreground">Total clientes ativos</span>
                <div className="text-2xl font-bold mt-1">{data.clients.activeCount}</div>
              </Card>
              <Card className="p-4">
                <span className="text-xs font-semibold text-muted-foreground">Novos clientes</span>
                <div className="text-2xl font-bold mt-1">{data.clients.newCount}</div>
              </Card>
              <Card className="p-4">
                <span className="text-xs font-semibold text-muted-foreground">Valor médio por cliente</span>
                <div className="text-xl font-bold mt-1">{formatEuro(data.clients.avgPerClient)}</div>
              </Card>
              <Card className="p-4">
                <span className="text-xs font-semibold text-muted-foreground">Valor médio por novo cliente</span>
                <div className="text-xl font-bold mt-1">{formatEuro(data.clients.avgPerNewClient)}</div>
              </Card>
            </div>
          </div>
        </div>
      </IXSection>

      {/* IMPOSTOS */}
      <IXSection
        title="Impostos"
        subtitle="Visão geral dos valores de IVA por mês (últimos 12 meses)"
        bare
      >
        <Card className="p-5">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.vat.monthly}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  tickFormatter={(v) => `€${v >= 1000 ? (v / 1000).toFixed(0) + "K" : v.toFixed(0)}`}
                />
                <Tooltip formatter={(v: number) => formatEuro(v)} contentStyle={{ borderRadius: 8 }} />
                <Bar dataKey="total" name="IVA" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            ⓘ Contacta o teu contabilista para apurar o IVA a entregar ao Estado.
          </p>
        </Card>
      </IXSection>
    </div>
  );
}
