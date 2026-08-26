import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { IXCard } from "@/components/entity/ix/IXCard";
import { IXEntityTabs, type IXTabDef } from "@/components/entity/ix/IXEntityTabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Percent, ArrowRight, TrendingUp, TrendingDown } from "lucide-react";
import { useInvoices, useInvoiceStats } from "@/hooks/useInvoices";
import { useCollectionCases } from "@/modules/collections/hooks/useCollectionCases";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceFinancials } from "@/hooks/useWorkspaceFinancials";
import { useInvoiceItemsAggregate } from "@/hooks/useInvoiceItemsAggregate";
import {
  FaturacaoYearChart,
  AgingChart,
  ClientDependencyBar,
  ActiveClientsChart,
  TopItemsChart,
  ItemsUnitsChart,
  VatChart,
} from "@/components/dashboard/ix/IXDashboardCharts";
import { formatEUR } from "@/lib/currency";


type SectionId = "faturacao" | "cobrancas" | "clientes" | "itens" | "impostos";

const SECTIONS: Array<{ id: SectionId; label: string }> = [
  { id: "faturacao", label: "Faturação" },
  { id: "cobrancas", label: "Cobranças" },
  { id: "clientes", label: "Clientes" },
  { id: "itens", label: "Itens" },
  { id: "impostos", label: "Impostos" },
];

function DeltaBadge({ value }: { value?: number }) {
  if (typeof value !== "number" || !isFinite(value) || value === 0) return null;
  const positive = value > 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold",
        positive ? "text-success" : "text-destructive",
      )}
    >
      <Icon className="h-3 w-3" />
      {positive ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

function KpiTile({
  label,
  value,
  hint,
  delta,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: number;
  tone?: "neutral" | "warning" | "danger";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-5",
        tone === "warning" && "border-warning/40 bg-warning/10",
        tone === "danger" && "border-destructive/40 bg-destructive/10",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <DeltaBadge value={delta} />
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function IXDashboard() {
  const navigate = useNavigate();
  const [active, setActive] = useState<SectionId>("faturacao");

  const { currentWorkspace } = useWorkspace();
  const { data: invoices = [], isLoading: invLoading } = useInvoices();
  const stats = useInvoiceStats();
  const { data: cases = [], isLoading: casesLoading } = useCollectionCases();
  const { data: financials, isLoading: finLoading } = useWorkspaceFinancials(currentWorkspace?.id);
  const { data: itemsAgg, isLoading: itemsLoading } = useInvoiceItemsAggregate(currentWorkspace?.id);


  // Faturação — mês corrente
  const monthMetrics = useMemo(() => {
    const now = new Date();
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const currentMonth = invoices.filter((i) => new Date(i.issue_date).getTime() >= startMonth);
    const total = currentMonth.reduce((s, i) => s + Number(i.total || 0), 0);
    const paid = currentMonth.reduce((s, i) => s + Number(i.amount_paid || 0), 0);
    return { count: currentMonth.length, total, paid, outstanding: total - paid };
  }, [invoices]);

  // Cobranças — agregado dos casos abertos
  const collectionsMetrics = useMemo(() => {
    const open = cases.filter((c) => c.status !== "paid");
    const totalDue = open.reduce((s, c) => s + Number(c.total_due || 0), 0);
    const buckets = { d030: 0, d3160: 0, d6190: 0, d90: 0 };
    open.forEach((c) => {
      const d = Number(c.days_overdue || 0);
      if (d <= 30) buckets.d030 += Number(c.total_due || 0);
      else if (d <= 60) buckets.d3160 += Number(c.total_due || 0);
      else if (d <= 90) buckets.d6190 += Number(c.total_due || 0);
      else buckets.d90 += Number(c.total_due || 0);
    });
    return { count: open.length, totalDue, buckets };
  }, [cases]);

  // Clientes — top por faturado
  const topClients = useMemo(() => {
    const map = new Map<string, { name: string; total: number; count: number }>();
    invoices.forEach((i) => {
      const key = i.client_name || "—";
      const cur = map.get(key) ?? { name: key, total: 0, count: 0 };
      cur.total += Number(i.total || 0);
      cur.count += 1;
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [invoices]);

  // Impostos — por taxa
  const vatByRate = useMemo(() => {
    const map = new Map<number, { base: number; tax: number; count: number }>();
    invoices.forEach((i) => {
      const rate = Number(i.tax_rate || 0);
      const cur = map.get(rate) ?? { base: 0, tax: 0, count: 0 };
      cur.base += Number(i.subtotal || 0);
      cur.tax += Number(i.tax_amount || 0);
      cur.count += 1;
      map.set(rate, cur);
    });
    return Array.from(map.entries())
      .map(([rate, v]) => ({ rate, ...v }))
      .sort((a, b) => b.tax - a.tax);
  }, [invoices]);

  const totalVat = vatByRate.reduce((s, r) => s + r.tax, 0);

  const tabs: IXTabDef[] = SECTIONS.map((s) => ({ id: s.id, label: s.label }));

  return (
    <DashboardLayout>
      <div className="min-h-full bg-background">
        {/* Header */}
        <div className="border-b border-border bg-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 pb-5 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Visão Global</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Faturação, cobranças, clientes, itens e impostos num só ecrã.
              </p>
            </div>
            {/* Atalhos rápidos — estilo IX */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { label: "Novo Orçamento", to: "/dashboard/proposals/new" },
                { label: "Nova Guia de Transporte", to: "/dashboard/invoices/new?type=transport" },
                { label: "Novo Contacto", to: "/dashboard/contacts/new" },
                { label: "Novo Item", to: "/dashboard/products?new=1" },
                { label: "Exportar SAF-T", to: "/dashboard/imports/saft" },
                { label: "Lote de Faturas", to: "/dashboard/invoices?bulk=1" },
              ].map((a) => (
                <button
                  key={a.label}
                  onClick={() => navigate(a.to)}
                  className={cn(
                    "h-10 px-4 rounded-full border border-border bg-card text-sm font-semibold text-foreground",
                    "shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors whitespace-nowrap",
                  )}
                >
                  {a.label}
                </button>
              ))}
              <button
                onClick={() => navigate("/dashboard/invoices/new")}
                className="h-10 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-sm hover:bg-primary/90 transition-colors whitespace-nowrap"
              >
                Nova Fatura
              </button>
            </div>
          </div>
          <div className="max-w-7xl mx-auto">
            <IXEntityTabs tabs={tabs} activeId={active} onChange={(id) => setActive(id as SectionId)} />
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
          {active === "faturacao" && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiTile label="Faturado (mês)" value={formatEUR(monthMetrics.total)} hint={`${monthMetrics.count} documentos`} delta={financials?.kpis.thisMonthDelta} />
                <KpiTile label="Recebido (mês)" value={formatEUR(monthMetrics.paid)} />
                <KpiTile label="Este trimestre" value={formatEUR(financials?.kpis.thisQuarter ?? 0)} hint="s/ IVA" delta={financials?.kpis.thisQuarterDelta} />
                <KpiTile label="Este ano" value={formatEUR(financials?.kpis.thisYear ?? 0)} hint="s/ IVA" delta={financials?.kpis.thisYearDelta} />
              </div>
              <IXCard
                title="Faturação por mês"
                description="Comparação dos últimos 3 anos (valores sem IVA)."
              >
                <FaturacaoYearChart yearly={financials?.yearly ?? []} loading={finLoading} />
              </IXCard>

              <IXCard
                title="Estado das faturas"
                actions={
                  <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate("/dashboard/invoices")}>
                    Ver todas <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                }
              >
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { l: "Rascunho", n: stats.totalDraft, v: stats.amountDraft },
                    { l: "Enviadas", n: stats.totalSent, v: stats.amountSent },
                    { l: "Pagas", n: stats.totalPaid, v: stats.amountPaid },
                    { l: "Parcial", n: stats.totalPartiallyPaid, v: stats.amountPartiallyPaid },
                    { l: "Vencidas", n: stats.totalOverdue, v: stats.amountOverdue },
                  ].map((s) => (
                    <div key={s.l} className="rounded-lg border border-border p-3">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.l}</p>
                      <p className="mt-1 text-lg font-semibold">{s.n}</p>
                      <p className="text-xs text-muted-foreground">{formatEUR(s.v)}</p>
                    </div>
                  ))}
                </div>
                {invLoading && <p className="mt-3 text-xs text-muted-foreground">A carregar…</p>}
              </IXCard>
            </>
          )}

          {active === "cobrancas" && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiTile label="Total em dívida" value={formatEUR(financials?.collections.totalOutstanding ?? 0)} />
                <KpiTile label="Não vencido" value={formatEUR(financials?.collections.notDue ?? 0)} tone="warning" />
                <KpiTile label="Vencido" value={formatEUR(financials?.collections.overdue ?? 0)} tone="danger" />
                <KpiTile label="Casos abertos" value={String(collectionsMetrics.count)} hint={`Ticket médio ${formatEUR(collectionsMetrics.count ? collectionsMetrics.totalDue / collectionsMetrics.count : 0)}`} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <IXCard title="Envelhecimento da dívida" description="Últimos 7 meses por data de emissão.">
                  <AgingChart aging={financials?.collections.aging ?? []} loading={finLoading} />
                </IXCard>
                <IXCard
                  title="Clientes devedores"
                  actions={
                    <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate("/dashboard/collections")}>
                      Abrir cobranças <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  }
                >
                  {finLoading ? (
                    <p className="text-sm text-muted-foreground">A carregar…</p>
                  ) : (financials?.collections.topDebtors.length ?? 0) === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem valores em dívida.</p>
                  ) : (
                    <div className="divide-y divide-border">
                      <div className="grid grid-cols-[1fr_auto_auto] gap-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                        <span>Cliente</span>
                        <span className="w-24 text-right">Não vencido</span>
                        <span className="w-24 text-right">Vencido</span>
                      </div>
                      {financials!.collections.topDebtors.map((d) => (
                        <div key={d.key} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 py-2.5 text-sm">
                          <span className="truncate" title={d.name}>{d.name}</span>
                          <span className="w-24 text-right tabular-nums text-muted-foreground">{formatEUR(d.notDue)}</span>
                          <span className="w-24 text-right">
                            {d.overdue > 0 ? (
                              <Badge variant="destructive" className="tabular-nums">{formatEUR(d.overdue)}</Badge>
                            ) : (
                              <span className="tabular-nums text-muted-foreground">{formatEUR(0)}</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </IXCard>
              </div>

              <IXCard
                title="Aging da carteira"
                actions={
                  <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate("/dashboard/collections")}>
                    Abrir cobranças <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                }
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { l: "0–30 dias", v: collectionsMetrics.buckets.d030 },
                    { l: "31–60 dias", v: collectionsMetrics.buckets.d3160 },
                    { l: "61–90 dias", v: collectionsMetrics.buckets.d6190 },
                    { l: "> 90 dias", v: collectionsMetrics.buckets.d90 },
                  ].map((b) => (
                    <div key={b.l} className="rounded-lg border border-border p-3">
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{b.l}</p>
                      <p className="mt-1 text-lg font-semibold">{formatEUR(b.v)}</p>
                    </div>
                  ))}
                </div>
                {casesLoading && <p className="mt-3 text-xs text-muted-foreground">A carregar…</p>}
                {!casesLoading && collectionsMetrics.count === 0 && (
                  <p className="mt-4 text-sm text-muted-foreground">Sem casos de cobrança em aberto.</p>
                )}
              </IXCard>
            </>
          )}

          {active === "clientes" && (
            <IXCard
              title="Top clientes por faturado"
              actions={
                <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate("/dashboard/contacts")}>
                  Ver clientes <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              }
            >
              {topClients.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados de faturação para agregar.</p>
              ) : (
                <div className="divide-y divide-border">
                  {topClients.map((c) => (
                    <div key={c.name} className="flex items-center justify-between py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground">{c.count} documento(s)</p>
                      </div>
                      <p className="text-sm font-semibold tabular-nums">{formatEUR(c.total)}</p>
                    </div>
                  ))}
                </div>
              )}
            </IXCard>
          )}

          {active === "itens" && (
            <IXCard
              title="Itens mais faturados"
              description="Agregação por linhas de fatura (top 10 do último período)."
              actions={
                <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate("/dashboard/products")}>
                  Ver catálogo <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              }
            >
              <p className="text-sm text-muted-foreground">
                Ainda sem agregação dedicada nesta secção. Podes gerir os itens em{" "}
                <button
                  className="text-primary underline-offset-4 hover:underline"
                  onClick={() => navigate("/dashboard/products")}
                >
                  Catálogo
                </button>
                .
              </p>
            </IXCard>
          )}

          {active === "impostos" && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <KpiTile label="IVA liquidado (histórico)" value={formatEUR(totalVat)} />
                <KpiTile label="Taxas distintas" value={String(vatByRate.length)} />
                <KpiTile label="Documentos" value={String(invoices.length)} />
              </div>
              <IXCard title="Detalhe por taxa de IVA">
                {vatByRate.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem dados de IVA para apresentar.</p>
                ) : (
                  <div className="divide-y divide-border">
                    <div className="grid grid-cols-4 gap-3 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                      <span>Taxa</span>
                      <span className="text-right">Docs</span>
                      <span className="text-right">Base</span>
                      <span className="text-right">IVA</span>
                    </div>
                    {vatByRate.map((r) => (
                      <div key={r.rate} className="grid grid-cols-4 gap-3 py-3 text-sm">
                        <span className="font-medium">
                          <Percent className="inline h-3 w-3 mr-1 text-muted-foreground" />
                          {r.rate}%
                        </span>
                        <span className="text-right tabular-nums">{r.count}</span>
                        <span className="text-right tabular-nums">{formatEUR(r.base)}</span>
                        <span className="text-right tabular-nums font-semibold">{formatEUR(r.tax)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </IXCard>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
