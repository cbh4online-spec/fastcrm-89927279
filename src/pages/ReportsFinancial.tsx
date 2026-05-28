import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { CalendarIcon, RefreshCw, Euro, TrendingUp, AlertTriangle, CheckCircle2, Receipt, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Cell,
} from "recharts";
import { useFinancialReports, type FinancialReportFilters } from "@/hooks/useFinancialReports";
import { useCompanies } from "@/hooks/useCompanies";

function fmtEUR(v: number): string {
  return `€${(v || 0).toLocaleString("pt-PT", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

type Period = "month" | "quarter" | "year" | "custom";

function rangeForPeriod(p: Period): { from?: string; to?: string } {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  if (p === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    return { from, to };
  }
  if (p === "quarter") {
    const qStart = Math.floor(now.getMonth() / 3) * 3;
    const from = new Date(now.getFullYear(), qStart, 1).toISOString().slice(0, 10);
    return { from, to };
  }
  if (p === "year") {
    const from = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
    return { from, to };
  }
  return {};
}

const AGING_COLORS = [
  "hsl(142, 76%, 36%)",  // current
  "hsl(48, 96%, 53%)",   // 1-30
  "hsl(25, 95%, 53%)",   // 31-60
  "hsl(0, 84%, 60%)",    // 61-90
  "hsl(0, 72%, 41%)",    // +90
];

export default function ReportsFinancial() {
  const [period, setPeriod] = useState<Period>("year");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [ownerId, setOwnerId] = useState<string>("all");
  const [companyId, setCompanyId] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");

  const dateRange = useMemo(() => {
    if (period === "custom") {
      return {
        from: customFrom ? customFrom.toISOString().slice(0, 10) : undefined,
        to: customTo ? customTo.toISOString().slice(0, 10) : undefined,
      };
    }
    return rangeForPeriod(period);
  }, [period, customFrom, customTo]);

  const filters: FinancialReportFilters = {
    dateFrom: dateRange.from,
    dateTo: dateRange.to,
    ownerId: ownerId === "all" ? undefined : ownerId,
    companyId: companyId === "all" ? undefined : companyId,
    productCategory: category === "all" ? undefined : category,
  };

  const { data, isLoading, refetch, isFetching } = useFinancialReports(filters);
  const { data: companies } = useCompanies();

  const exportCSV = () => {
    if (!data) return;
    const rows: string[] = [];
    rows.push("Métrica,Valor");
    rows.push(`Total Faturado,${data.kpis.totalInvoiced.toFixed(2)}`);
    rows.push(`Total Recebido,${data.kpis.totalReceived.toFixed(2)}`);
    rows.push(`Em Dívida,${data.kpis.totalDue.toFixed(2)}`);
    rows.push(`Vencido,${data.kpis.overdue.toFixed(2)}`);
    rows.push(`Nº Faturas,${data.kpis.invoiceCount}`);
    rows.push(`Ticket Médio,${data.kpis.avgTicket.toFixed(2)}`);
    rows.push("");
    rows.push("Mês,Faturado,Recebido");
    data.monthly.forEach(m => rows.push(`${m.label},${m.invoiced.toFixed(2)},${m.received.toFixed(2)}`));
    rows.push("");
    rows.push("Top Clientes,Total,Recebido,Em Dívida,Nº Faturas");
    data.topClients.forEach(c => rows.push(`"${c.name}",${c.total.toFixed(2)},${c.received.toFixed(2)},${c.due.toFixed(2)},${c.count}`));
    rows.push("");
    rows.push("Top Produtos,Categoria,Qtd,Total");
    data.topProducts.forEach(p => rows.push(`"${p.name}","${p.category || ""}",${p.qty},${p.total.toFixed(2)}`));
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-financeiro-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Relatórios Financeiros & Vendas</h1>
            <p className="text-muted-foreground text-sm">
              KPIs de faturação, recebimentos, top clientes e produtos, aging de dívida
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={!data}>
              <Download className="h-4 w-4 mr-2" /> Exportar CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 flex flex-wrap items-center gap-3">
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Este mês</SelectItem>
                <SelectItem value="quarter">Este trimestre</SelectItem>
                <SelectItem value="year">Este ano</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>

            {period === "custom" && (
              <>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[160px] justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customFrom ? format(customFrom, "dd MMM yyyy", { locale: pt }) : "De"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-[160px] justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customTo ? format(customTo, "dd MMM yyyy", { locale: pt }) : "Até"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customTo} onSelect={setCustomTo} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </>
            )}

            <Select value={ownerId} onValueChange={setOwnerId}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Vendedor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os vendedores</SelectItem>
                {data?.owners.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Cliente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {companies?.slice(0, 200).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {data?.categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[96px]" />)
          ) : (
            <>
              <KPI title="Faturado" value={fmtEUR(data?.kpis.totalInvoiced || 0)} icon={Receipt} color="text-primary" />
              <KPI title="Recebido" value={fmtEUR(data?.kpis.totalReceived || 0)} icon={CheckCircle2} color="text-emerald-600" />
              <KPI title="Em dívida" value={fmtEUR(data?.kpis.totalDue || 0)} icon={Euro} color="text-amber-600" />
              <KPI title="Vencido" value={fmtEUR(data?.kpis.overdue || 0)} icon={AlertTriangle} color="text-destructive" />
              <KPI title="Ticket médio" value={fmtEUR(data?.kpis.avgTicket || 0)} icon={TrendingUp} color="text-foreground" subtitle={`${data?.kpis.invoiceCount || 0} faturas`} />
              <KPI title="Taxa cobrança" value={`${(data?.kpis.collectionRate || 0).toFixed(1)}%`} icon={CheckCircle2} color="text-emerald-600" />
            </>
          )}
        </div>

        {/* Monthly evolution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolução mensal — Faturação vs Recebimentos</CardTitle>
            <CardDescription>Comparação por mês no período selecionado</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[320px]" /> : (
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={data?.monthly || []}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => fmtEUR(v as number)} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => fmtEUR(v)} contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="invoiced" name="Faturado" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="received" name="Recebido" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top clients + Top products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top 10 Clientes</CardTitle>
              <CardDescription>Por valor faturado no período</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-[300px]" /> : !data?.topClients.length ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Sem dados</p>
              ) : (
                <div className="space-y-2">
                  {data.topClients.map((c, i) => (
                    <div key={c.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
                      <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.count} fatura{c.count !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{fmtEUR(c.total)}</p>
                        {c.due > 0 && <p className="text-xs text-amber-600">{fmtEUR(c.due)} em dívida</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top 10 Produtos</CardTitle>
              <CardDescription>Por valor faturado no período</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-[300px]" /> : !data?.topProducts.length ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Sem dados</p>
              ) : (
                <div className="space-y-2">
                  {data.topProducts.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50">
                      <span className="text-xs font-mono text-muted-foreground w-5">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {p.category && <Badge variant="outline" className="text-[10px] py-0">{p.category}</Badge>}
                          <span>{p.qty.toLocaleString("pt-PT")} un</span>
                        </div>
                      </div>
                      <p className="text-sm font-semibold">{fmtEUR(p.total)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Aging */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aging de Contas a Receber</CardTitle>
            <CardDescription>Distribuição da dívida por antiguidade do vencimento</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[280px]" /> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={data?.aging || []}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => fmtEUR(v as number)} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => fmtEUR(v)} contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      {(data?.aging || []).map((_, idx) => <Cell key={idx} fill={AGING_COLORS[idx]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {(data?.aging || []).map((b, i) => (
                    <div key={b.label} className="flex items-center justify-between p-2 rounded-md border">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: AGING_COLORS[i] }} />
                        <span className="text-sm font-medium">{b.label}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{fmtEUR(b.amount)}</p>
                        <p className="text-xs text-muted-foreground">{b.count} fatura{b.count !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function KPI({ title, value, icon: Icon, color, subtitle }: { title: string; value: string; icon: any; color?: string; subtitle?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</span>
          <Icon className={cn("h-4 w-4", color || "text-muted-foreground")} />
        </div>
        <p className="text-xl font-bold">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
