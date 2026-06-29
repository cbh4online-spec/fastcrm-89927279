import { useMemo, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  CalendarIcon, RefreshCw, Euro, TrendingUp, TrendingDown, AlertTriangle,
  CheckCircle2, Receipt, Download, Clock, Wallet, ArrowUpRight, ArrowDownRight,
  Sparkles, Users, Package, ShieldCheck, ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, Area, AreaChart,
} from "recharts";
import { useFinancialReports, type FinancialReportFilters } from "@/hooks/useFinancialReports";
import { useFinancialReportsVerify } from "@/hooks/useFinancialReportsVerify";
import { useCompanies } from "@/hooks/useCompanies";

function fmtEUR(v: number): string {
  return `€${(v || 0).toLocaleString("pt-PT", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
function fmtEURShort(v: number): string {
  const n = Math.abs(v || 0);
  if (n >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `€${(v / 1_000).toFixed(1)}K`;
  return `€${Math.round(v || 0)}`;
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
  "hsl(142, 76%, 36%)",
  "hsl(48, 96%, 53%)",
  "hsl(25, 95%, 53%)",
  "hsl(0, 84%, 60%)",
  "hsl(0, 72%, 41%)",
];

export default function ReportsFinancial() {
  const [period, setPeriod] = useState<Period>("year");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [ownerId, setOwnerId] = useState<string>("all");
  const [companyId, setCompanyId] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [verifyMode, setVerifyMode] = useState<boolean>(false);

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
  const { companies } = useCompanies();
  const { data: verifyData, isFetching: verifyLoading, refetch: refetchVerify } = useFinancialReportsVerify(filters, verifyMode);

  // Trends: compare last full month vs previous (from monthly evolution)
  const trend = useMemo(() => {
    const m = data?.monthly || [];
    if (m.length < 2) return { invoiced: 0, received: 0, lastLabel: "" };
    const last = m[m.length - 1];
    const prev = m[m.length - 2];
    const inv = prev.invoiced > 0 ? ((last.invoiced - prev.invoiced) / prev.invoiced) * 100 : 0;
    const rec = prev.received > 0 ? ((last.received - prev.received) / prev.received) * 100 : 0;
    return { invoiced: inv, received: rec, lastLabel: last.label };
  }, [data]);

  const topClientMax = data?.topClients[0]?.total || 0;
  const topProductMax = data?.topProducts[0]?.total || 0;
  const totalAging = (data?.aging || []).reduce((s, b) => s + b.amount, 0);

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

  const k = data?.kpis;
  const collectionPct = k?.collectionRate || 0;
  const overdueShare = k && k.totalDue > 0 ? (k.overdue / k.totalDue) * 100 : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        {/* HEADER IX */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">Relatórios Financeiros</h1>
            <p className="text-sm text-muted-foreground max-w-xl">
              Visão consolidada de faturação, cobranças, clientes e produtos — com aging de dívida e tendências mensais.
            </p>
            <p className="text-[11px] text-muted-foreground">
              {dateRange.from && dateRange.to
                ? `${format(new Date(dateRange.from), "dd MMM yyyy", { locale: pt })} → ${format(new Date(dateRange.to), "dd MMM yyyy", { locale: pt })}`
                : "Período não definido"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={verifyMode ? "default" : "outline"}
              size="sm"
              onClick={() => setVerifyMode((v) => !v)}
              className="gap-2 h-9 rounded-full"
              title="Compara KPIs com totais reais de invoice_payments"
            >
              <ShieldCheck className="h-4 w-4" />
              {verifyMode ? "Verificação ativa" : "Verificar valores"}
            </Button>
            <Button variant="outline" size="icon" onClick={() => { refetch(); if (verifyMode) refetchVerify(); }} disabled={isFetching} className="h-9 w-9 rounded-full">
              <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            </Button>
            <Button size="sm" onClick={exportCSV} disabled={!data} className="gap-2 rounded-full h-9">
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
          </div>
        </div>


        {/* FILTERS BAR */}
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
                <TabsList>
                  <TabsTrigger value="month">Mês</TabsTrigger>
                  <TabsTrigger value="quarter">Trimestre</TabsTrigger>
                  <TabsTrigger value="year">Ano</TabsTrigger>
                  <TabsTrigger value="custom">Personalizado</TabsTrigger>
                </TabsList>
              </Tabs>

              {period === "custom" && (
                <>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="justify-start text-left font-normal">
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
                      <Button variant="outline" size="sm" className="justify-start text-left font-normal">
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

              <div className="h-6 w-px bg-border mx-1 hidden md:block" />

              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Vendedor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os vendedores</SelectItem>
                  {data?.owners.map(o => <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="Cliente" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  {companies?.slice(0, 200).map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {data?.categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>

              {(ownerId !== "all" || companyId !== "all" || category !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setOwnerId("all"); setCompanyId("all"); setCategory("all"); }}
                >
                  Limpar filtros
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* VERIFY BANNER */}
        {verifyMode && (() => {
          if (verifyLoading || !verifyData || !k) {
            return (
              <Card className="border-dashed border-primary/30 bg-primary/5">
                <CardContent className="p-4 flex items-center gap-3 text-sm">
                  <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-muted-foreground">A verificar valores contra <code className="font-mono text-xs">invoice_payments</code>…</span>
                </CardContent>
              </Card>
            );
          }
          const EPS = 0.5; // €0.50 de tolerância
          const diffInv = (k.totalInvoiced || 0) - verifyData.totalInvoiced;
          const diffRec = (k.totalReceived || 0) - verifyData.totalReceived;
          const diffDue = (k.totalDue || 0) - verifyData.totalDue;
          const diffRate = (k.collectionRate || 0) - verifyData.collectionRate;
          const rows = [
            { label: "Faturado", kpi: k.totalInvoiced, real: verifyData.totalInvoiced, diff: diffInv, fmt: fmtEUR },
            { label: "Recebido", kpi: k.totalReceived, real: verifyData.totalReceived, diff: diffRec, fmt: fmtEUR },
            { label: "Em dívida", kpi: k.totalDue, real: verifyData.totalDue, diff: diffDue, fmt: fmtEUR },
            { label: "Taxa cobrança", kpi: k.collectionRate, real: verifyData.collectionRate, diff: diffRate, fmt: (v: number) => `${(v || 0).toFixed(2)}%` },
          ];
          const hasDiff = rows.some(r => Math.abs(r.diff) > (r.label === "Taxa cobrança" ? 0.1 : EPS));
          return (
            <Card className={cn(
              "border-2",
              hasDiff
                ? "border-destructive/40 bg-destructive/5"
                : "border-emerald-500/30 bg-emerald-500/5"
            )}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {hasDiff ? (
                      <ShieldAlert className="h-5 w-5 text-destructive" />
                    ) : (
                      <ShieldCheck className="h-5 w-5 text-emerald-600" />
                    )}
                    <div>
                      <div className="text-sm font-semibold">
                        {hasDiff ? "Discrepância detetada" : "KPIs validados"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {hasDiff
                          ? "Os valores apresentados divergem dos totais reais em invoice_payments. Revê os dados ou contacta o suporte."
                          : `Confirmado contra invoice_payments (${verifyData.invoiceCount} faturas).`}
                      </div>
                    </div>
                  </div>
                  <Badge variant={hasDiff ? "destructive" : "secondary"} className="font-mono text-[10px]">
                    {hasDiff ? "FALHA" : "OK"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  {rows.map((r) => {
                    const tol = r.label === "Taxa cobrança" ? 0.1 : EPS;
                    const bad = Math.abs(r.diff) > tol;
                    return (
                      <div key={r.label} className={cn(
                        "rounded-md border p-2 space-y-1",
                        bad ? "border-destructive/40 bg-destructive/5" : "border-border bg-muted/30"
                      )}>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{r.label}</div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">KPI</span>
                          <span className="font-mono">{r.fmt(r.kpi)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-muted-foreground">Real</span>
                          <span className="font-mono">{r.fmt(r.real)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-1 border-t">
                          <span className="text-muted-foreground">Δ</span>
                          <span className={cn("font-mono font-semibold", bad ? "text-destructive" : "text-emerald-600")}>
                            {r.diff > 0 ? "+" : ""}{r.fmt(r.diff)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })()}

        {/* KPI HERO — 4 big cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[140px] rounded-xl" />)
          ) : (
            <>
              <BigKPI
                title="Faturado"
                value={fmtEUR(k?.totalInvoiced || 0)}
                subtitle={`${k?.invoiceCount || 0} faturas no período`}
                icon={Receipt}
                tone="primary"
                trend={trend.invoiced}
                trendLabel={trend.lastLabel}
              />
              <BigKPI
                title="Recebido"
                value={fmtEUR(k?.totalReceived || 0)}
                subtitle={`Taxa de cobrança ${collectionPct.toFixed(1)}%`}
                icon={Wallet}
                tone="emerald"
                trend={trend.received}
                trendLabel={trend.lastLabel}
                progress={collectionPct}
              />
              <BigKPI
                title="Em dívida"
                value={fmtEUR(k?.totalDue || 0)}
                subtitle={k && k.totalInvoiced > 0 ? `${(((k.totalDue) / k.totalInvoiced) * 100).toFixed(1)}% do faturado` : "—"}
                icon={Clock}
                tone="amber"
              />
              <BigKPI
                title="Vencido"
                value={fmtEUR(k?.overdue || 0)}
                subtitle={`${overdueShare.toFixed(1)}% da dívida total`}
                icon={AlertTriangle}
                tone="destructive"
              />
            </>
          )}
        </div>

        {/* Secondary metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[80px]" />)
          ) : (
            <>
              <MiniStat icon={TrendingUp} label="Ticket médio" value={fmtEUR(k?.avgTicket || 0)} />
              <MiniStat icon={CheckCircle2} label="Taxa cobrança" value={`${collectionPct.toFixed(1)}%`} accent="emerald" />
              <MiniStat icon={Users} label="Clientes ativos" value={String(data?.topClients.length || 0)} />
              <MiniStat icon={Package} label="Produtos vendidos" value={String(data?.topProducts.length || 0)} />
            </>
          )}
        </div>

        {/* Monthly evolution */}
        <Card className="rounded-2xl shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Evolução mensal — Faturação vs Recebimentos
              </CardTitle>
              <CardDescription>Tendência por mês no período selecionado</CardDescription>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[hsl(217,91%,60%)]" /> Faturado</div>
              <div className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[hsl(142,76%,36%)]" /> Recebido</div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[340px]" /> : (
              <ResponsiveContainer width="100%" height={340}>
                <ComposedChart data={data?.monthly || []} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradInv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(217,91%,60%)" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="hsl(217,91%,60%)" stopOpacity={0.5} />
                    </linearGradient>
                    <linearGradient id="gradRec" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(142,76%,36%)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(142,76%,36%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => fmtEURShort(v as number)} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
                  <Tooltip
                    formatter={(v: number) => fmtEUR(v)}
                    contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12 }}
                    cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                  />
                  <Bar dataKey="invoiced" name="Faturado" fill="url(#gradInv)" radius={[6, 6, 0, 0]} maxBarSize={42} />
                  <Line type="monotone" dataKey="received" name="Recebido" stroke="hsl(142,76%,36%)" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(142,76%,36%)" }} activeDot={{ r: 5 }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top clients + Top products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Top 10 Clientes
              </CardTitle>
              <CardDescription>Ranking por valor faturado no período</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-[300px]" /> : !data?.topClients.length ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Sem dados</p>
              ) : (
                <div className="space-y-3">
                  {data.topClients.map((c, i) => {
                    const pct = topClientMax > 0 ? (c.total / topClientMax) * 100 : 0;
                    const paidPct = c.total > 0 ? (c.received / c.total) * 100 : 0;
                    return (
                      <div key={c.id} className="space-y-1.5 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "text-[10px] font-bold w-6 h-6 rounded-md grid place-items-center",
                            i < 3 ? "bg-muted text-foreground" : "bg-muted text-muted-foreground"
                          )}>{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{c.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {c.count} fatura{c.count !== 1 ? "s" : ""} · {paidPct.toFixed(0)}% pago
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">{fmtEUR(c.total)}</p>
                            {c.due > 0 && <p className="text-[11px] text-amber-600">{fmtEUR(c.due)} em dívida</p>}
                          </div>
                        </div>
                        <div className="ml-9 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" /> Top 10 Produtos
              </CardTitle>
              <CardDescription>Ranking por valor faturado no período</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-[300px]" /> : !data?.topProducts.length ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Sem dados</p>
              ) : (
                <div className="space-y-3">
                  {data.topProducts.map((p, i) => {
                    const pct = topProductMax > 0 ? (p.total / topProductMax) * 100 : 0;
                    return (
                      <div key={p.id} className="space-y-1.5 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "text-[10px] font-bold w-6 h-6 rounded-md grid place-items-center",
                            i < 3 ? "bg-muted text-muted-foreground" : "bg-muted text-muted-foreground"
                          )}>{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{p.name}</p>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              {p.category && <Badge variant="outline" className="text-[10px] py-0 h-4">{p.category}</Badge>}
                              <span>{p.qty.toLocaleString("pt-PT")} un</span>
                            </div>
                          </div>
                          <p className="text-sm font-semibold">{fmtEUR(p.total)}</p>
                        </div>
                        <div className="ml-9 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Aging */}
        <Card className="rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" /> Aging de Contas a Receber
            </CardTitle>
            <CardDescription>Distribuição da dívida por antiguidade do vencimento · Total {fmtEUR(totalAging)}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-[280px]" /> : (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
                <div className="md:col-span-2 relative">
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie
                        data={(data?.aging || []).filter(a => a.amount > 0)}
                        dataKey="amount"
                        nameKey="label"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={2}
                        strokeWidth={0}
                      >
                        {(data?.aging || []).filter(a => a.amount > 0).map((b, idx) => {
                          const origIdx = (data?.aging || []).findIndex(a => a.label === b.label);
                          return <Cell key={idx} fill={AGING_COLORS[origIdx >= 0 ? origIdx : idx]} />;
                        })}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => fmtEUR(v)}
                        contentStyle={{ backgroundColor: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 10, fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total dívida</p>
                    <p className="text-lg font-bold">{fmtEURShort(totalAging)}</p>
                  </div>
                </div>
                <div className="md:col-span-3 space-y-2">
                  {(data?.aging || []).map((b, i) => {
                    const pct = totalAging > 0 ? (b.amount / totalAging) * 100 : 0;
                    return (
                      <div key={b.label} className="space-y-1 p-2 rounded-lg border bg-card">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: AGING_COLORS[i] }} />
                            <span className="text-sm font-medium">{b.label}</span>
                            <Badge variant="outline" className="text-[10px] py-0 h-4">{b.count}</Badge>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">{fmtEUR(b.amount)}</p>
                            <p className="text-[10px] text-muted-foreground">{pct.toFixed(1)}% do total</p>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: AGING_COLORS[i] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

/* ---------- Subcomponents ---------- */

function BigKPI({
  title, value, subtitle, icon: Icon, tone, trend, trendLabel, progress,
}: {
  title: string; value: string; subtitle?: string; icon: any;
  tone: "primary" | "emerald" | "amber" | "destructive";
  trend?: number; trendLabel?: string; progress?: number;
}) {
  const trendColor = {
    primary: "text-primary",
    emerald: "text-emerald-600",
    amber: "text-amber-600",
    destructive: "text-destructive",
  }[tone];
  const showTrend = typeof trend === "number" && Math.abs(trend) > 0.05;
  const trendUp = (trend || 0) >= 0;

  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div className="h-9 w-9 rounded-lg grid place-items-center bg-muted text-muted-foreground">
            <Icon className="h-4 w-4" />
          </div>
          {showTrend && (
            <div className={cn(
              "flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-md bg-muted",
              trendUp ? "text-emerald-600" : "text-destructive"
            )}>
              {trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(trend!).toFixed(1)}%
            </div>
          )}
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{title}</p>
          <p className={cn("text-2xl font-bold tracking-tight mt-1", tone === "destructive" && "text-destructive")}>{value}</p>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        {typeof progress === "number" && (
          <Progress value={Math.min(100, Math.max(0, progress))} className="h-1.5" />
        )}
        {showTrend && trendLabel && (
          <p className={cn("text-[10px] text-muted-foreground -mt-1")}>vs mês anterior · <span className={trendColor}>{trendLabel}</span></p>
        )}

      </CardContent>
    </Card>
  );
}

function MiniStat({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: "emerald" }) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-3 flex items-center gap-3">
        <div className={cn(
          "h-9 w-9 rounded-lg grid place-items-center",
          accent === "emerald" ? "bg-muted text-muted-foreground" : "bg-muted text-muted-foreground"
        )}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="text-base font-bold truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
