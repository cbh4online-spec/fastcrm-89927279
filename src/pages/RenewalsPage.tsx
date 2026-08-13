import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { usePageElementVisibility } from "@/hooks/usePageElementVisibility";
import { useRenewalContracts } from "@/hooks/useRenewals";
import {
  RENEWAL_STATUS_CONFIG,
  RENEWAL_INTERVAL_LABELS,
  getHealthScoreColor,
  calculateRealMRR,
  getIntervalSuffix,
} from "@/types/renewal";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  RefreshCw,
  Calendar,
  Loader2,
  LayoutGrid,
  List,
  CalendarDays,
  Bell,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { pt } from "date-fns/locale";
import { CreateRenewalDialog } from "@/components/renewals/CreateRenewalDialog";
import { RenewalAlerts } from "@/components/renewals/RenewalAlerts";
import { RenewalsKanbanView } from "@/components/renewals/RenewalsKanbanView";
import { RenewalsCalendarView } from "@/components/renewals/RenewalsCalendarView";
import {
  DocumentListLayout,
  DocumentFilterChip,
  DocumentListToolbar,
  DocumentSummaryCard,
  DocumentRow,
  DocumentStatusBadge,
  type DocumentStatusTone,
  type SummaryItem,
} from "@/components/documents/listing";

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(val);

const statusToneMap: Record<string, DocumentStatusTone> = {
  active: "paid",
  paused: "pending",
  expired: "overdue",
  cancelled: "cancelled",
  pending_renewal: "partial",
};

const statusOptions = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Ativos" },
  { value: "paused", label: "Pausados" },
  { value: "expired", label: "Expirados" },
  { value: "cancelled", label: "Cancelados" },
];

const riskOptions = [
  { value: "all", label: "Todo risco" },
  { value: "high", label: "Alto (≤40)" },
  { value: "medium", label: "Médio (41-70)" },
  { value: "low", label: "Baixo (71+)" },
];

const sortOptions = [
  { value: "renewal_date", label: "Data renovação" },
  { value: "mrr_desc", label: "MRR (maior)" },
  { value: "mrr_asc", label: "MRR (menor)" },
  { value: "health_asc", label: "Health (pior)" },
  { value: "health_desc", label: "Health (melhor)" },
];

export default function RenewalsPage() {
  const { isElementVisible } = usePageElementVisibility("renewals");
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("renewal_date");
  const [pageSize, setPageSize] = useState(25);

  const { data: contracts = [], isLoading } = useRenewalContracts(
    statusFilter !== "all" ? { status: statusFilter } : undefined,
  );

  const uniqueCompanies = useMemo(() => {
    const map = new Map<string, string>();
    contracts.forEach((c) => {
      if (c.company?.id && c.company?.name) map.set(c.company.id, c.company.name);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [contracts]);

  const filtered = useMemo(() => {
    const result = contracts.filter((c) => {
      if (search) {
        const q = search.toLowerCase();
        const companyName = c.company?.name || "";
        const contactName = c.contact?.name || "";
        if (!companyName.toLowerCase().includes(q) && !contactName.toLowerCase().includes(q))
          return false;
      }
      if (riskFilter !== "all") {
        const hs = c.health_score;
        if (riskFilter === "high" && hs > 40) return false;
        if (riskFilter === "medium" && (hs <= 40 || hs > 70)) return false;
        if (riskFilter === "low" && hs <= 70) return false;
      }
      if (companyFilter !== "all" && c.company?.id !== companyFilter) return false;
      return true;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case "mrr_desc":
          return Number(b.total_mrr || 0) - Number(a.total_mrr || 0);
        case "mrr_asc":
          return Number(a.total_mrr || 0) - Number(b.total_mrr || 0);
        case "health_asc":
          return a.health_score - b.health_score;
        case "health_desc":
          return b.health_score - a.health_score;
        default: {
          const da = a.next_renewal_date ? new Date(a.next_renewal_date).getTime() : Infinity;
          const db = b.next_renewal_date ? new Date(b.next_renewal_date).getTime() : Infinity;
          return da - db;
        }
      }
    });

    return result;
  }, [contracts, search, riskFilter, companyFilter, sortBy]);

  const stats = useMemo(() => {
    const active = contracts.filter((c) => c.status === "active");
    const cancelled = contracts.filter((c) => c.status === "cancelled");
    const totalMRR = active.reduce(
      (sum, c) =>
        sum +
        calculateRealMRR(
          Number(c.total_mrr || 0),
          c.renewal_interval,
          c.start_date,
          c.next_renewal_date,
        ),
      0,
    );
    const avgMRR = active.length > 0 ? totalMRR / active.length : 0;
    const churnRate = contracts.length > 0 ? (cancelled.length / contracts.length) * 100 : 0;
    const overdue = contracts.filter((c) => {
      if (!c.next_renewal_date) return false;
      return differenceInDays(new Date(c.next_renewal_date), new Date()) < 0;
    }).length;
    const upcoming30 = contracts.filter((c) => {
      if (!c.next_renewal_date) return false;
      const days = differenceInDays(new Date(c.next_renewal_date), new Date());
      return days >= 0 && days <= 30;
    }).length;

    return {
      total: contracts.length,
      active: active.length,
      cancelled: cancelled.length,
      totalMRR,
      arr: totalMRR * 12,
      avgMRR,
      churnRate,
      overdue,
      upcoming30,
    };
  }, [contracts]);

  const summaryItems: SummaryItem[] = [
    { label: "ARR Total", value: formatCurrency(stats.arr), tone: "primary" },
    { label: "MRR Ativo", value: formatCurrency(stats.totalMRR), tone: "default" },
    { label: "Contratos Ativos", value: String(stats.active), tone: "default" },
    { label: "Próx. 30 dias", value: String(stats.upcoming30), tone: "default" },
    {
      label: "Em atraso",
      value: String(stats.overdue),
      tone: stats.overdue > 0 ? "destructive" : "default",
    },
    {
      label: "Taxa Churn",
      value: `${stats.churnRate.toFixed(1)}%`,
      tone: stats.churnRate > 10 ? "destructive" : "default",
    },
  ];

  const activeStatusLabel =
    statusOptions.find((o) => o.value === statusFilter)?.label ?? "Todos";
  const activeRiskLabel = riskOptions.find((o) => o.value === riskFilter)?.label ?? "Todo risco";
  const activeCompanyLabel =
    companyFilter === "all"
      ? "Todas empresas"
      : uniqueCompanies.find(([id]) => id === companyFilter)?.[1] ?? "Empresa";

  const clearFilters = () => {
    setStatusFilter("all");
    setRiskFilter("all");
    setCompanyFilter("all");
    setSearch("");
  };
  const hasFilters =
    statusFilter !== "all" || riskFilter !== "all" || companyFilter !== "all" || !!search;

  const visible = filtered.slice(0, pageSize);

  return (
    <DashboardLayout>
      <Tabs defaultValue="list" className="flex flex-col">
        <DocumentListLayout
          title="Renovações"
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Pesquisar por empresa ou contacto..."
          primaryAction={
            <Button onClick={() => setShowCreate(true)} className="rounded-full">
              <Plus className="mr-2 h-4 w-4" /> Novo Contrato
            </Button>
          }
          chips={
            <>
              <DocumentFilterChip
                label="Estado"
                value={activeStatusLabel}
                active={statusFilter !== "all"}
              >
                {statusOptions.map((o) => (
                  <DropdownMenuItem key={o.value} onClick={() => setStatusFilter(o.value)}>
                    {o.label}
                  </DropdownMenuItem>
                ))}
              </DocumentFilterChip>
              <DocumentFilterChip
                label="Risco"
                value={activeRiskLabel}
                active={riskFilter !== "all"}
              >
                {riskOptions.map((o) => (
                  <DropdownMenuItem key={o.value} onClick={() => setRiskFilter(o.value)}>
                    {o.label}
                  </DropdownMenuItem>
                ))}
              </DocumentFilterChip>
              <DocumentFilterChip
                label="Empresa"
                value={activeCompanyLabel}
                active={companyFilter !== "all"}
              >
                <DropdownMenuItem onClick={() => setCompanyFilter("all")}>
                  Todas empresas
                </DropdownMenuItem>
                {uniqueCompanies.map(([id, name]) => (
                  <DropdownMenuItem key={id} onClick={() => setCompanyFilter(id)}>
                    {name}
                  </DropdownMenuItem>
                ))}
              </DocumentFilterChip>
            </>
          }
          summary={
            <DocumentSummaryCard
              items={summaryItems}
              footer={
                <span className="text-muted-foreground">
                  {stats.total} contratos · {stats.cancelled} cancelados · MRR médio{" "}
                  <span className="font-semibold text-foreground">
                    {formatCurrency(stats.avgMRR)}
                  </span>
                </span>
              }
            />
          }
          toolbar={
            <div className="flex flex-wrap items-center justify-between gap-3">
              <TabsList className="rounded-full bg-muted/60">
                {isElementVisible("tab", "list") && (
                  <TabsTrigger value="list" className="gap-1.5 rounded-full">
                    <List className="h-3.5 w-3.5" /> Contratos
                  </TabsTrigger>
                )}
                {isElementVisible("tab", "kanban") && (
                  <TabsTrigger value="kanban" className="gap-1.5 rounded-full">
                    <LayoutGrid className="h-3.5 w-3.5" /> Kanban
                  </TabsTrigger>
                )}
                {isElementVisible("tab", "alerts") && (
                  <TabsTrigger value="alerts" className="gap-1.5 rounded-full">
                    <Bell className="h-3.5 w-3.5" /> Alertas
                  </TabsTrigger>
                )}
                {isElementVisible("tab", "calendar") && (
                  <TabsTrigger value="calendar" className="gap-1.5 rounded-full">
                    <CalendarDays className="h-3.5 w-3.5" /> Calendário
                  </TabsTrigger>
                )}
              </TabsList>
              <DocumentListToolbar
                sortOptions={sortOptions}
                sortValue={sortBy}
                onSortChange={setSortBy}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                totalCount={filtered.length}
                countLabel="Contratos"
                onClearFilters={clearFilters}
                clearFiltersDisabled={!hasFilters}
              />
            </div>
          }
        >
          <TabsContent value="list" className="m-0 flex flex-col gap-2">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : visible.length === 0 ? (
              <div className="rounded-xl border border-dashed bg-card py-12 text-center text-muted-foreground">
                <RefreshCw className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p>Nenhum contrato encontrado</p>
              </div>
            ) : (
              visible.map((contract) => {
                const daysUntil = contract.next_renewal_date
                  ? differenceInDays(new Date(contract.next_renewal_date), new Date())
                  : null;
                const statusConfig = RENEWAL_STATUS_CONFIG[contract.status];
                const overdue = daysUntil !== null && daysUntil < 0;
                const renewalLabel = contract.next_renewal_date
                  ? `${format(new Date(contract.next_renewal_date), "dd MMM yyyy", { locale: pt })}${
                      daysUntil !== null
                        ? ` (${
                            daysUntil < 0
                              ? `${Math.abs(daysUntil)}d atraso`
                              : `${daysUntil}d`
                          })`
                        : ""
                    }`
                  : undefined;

                return (
                  <DocumentRow
                    key={contract.id}
                    onClick={() => navigate(`/dashboard/renewals/${contract.id}`)}
                    statusBadge={
                      <DocumentStatusBadge
                        label={statusConfig.label}
                        tone={statusToneMap[contract.status] ?? "neutral"}
                      />
                    }
                    number={contract.company?.name || "—"}
                    subtitle={RENEWAL_INTERVAL_LABELS[contract.renewal_interval]}
                    clientName={contract.contact?.name || contract.company?.name || "—"}
                    clientSubtitle={
                      contract.contact?.name ? contract.company?.name : undefined
                    }
                    issueDate={
                      contract.start_date
                        ? format(new Date(contract.start_date), "dd MMM yyyy", { locale: pt })
                        : undefined
                    }
                    dueDate={renewalLabel}
                    dueDateTone={overdue ? "overdue" : "default"}
                    totalPrimary={`${formatCurrency(Number(contract.total_mrr || 0))}${getIntervalSuffix(
                      contract.renewal_interval,
                      contract.start_date,
                      contract.next_renewal_date,
                    )}`}
                    totalSecondary={`Health ${contract.health_score}`}
                    action={
                      <div className="hidden w-24 items-center gap-2 lg:flex">
                        <Progress value={contract.health_score} className="h-2 w-14" />
                        <span
                          className={`text-xs font-medium ${getHealthScoreColor(
                            contract.health_score,
                          )}`}
                        >
                          {contract.health_score}
                        </span>
                      </div>
                    }
                  />
                );
              })
            )}
            {filtered.length > pageSize && (
              <div className="pt-2 text-center text-xs text-muted-foreground">
                A mostrar {visible.length} de {filtered.length}. Ajuste "Resultados por Página"
                para ver mais.
              </div>
            )}
          </TabsContent>

          <TabsContent value="kanban" className="m-0">
            <RenewalsKanbanView contracts={filtered} formatCurrency={formatCurrency} />
          </TabsContent>

          <TabsContent value="alerts" className="m-0">
            <RenewalAlerts />
          </TabsContent>

          <TabsContent value="calendar" className="m-0">
            <RenewalsCalendarView contracts={filtered} formatCurrency={formatCurrency} />
          </TabsContent>
        </DocumentListLayout>
      </Tabs>

      <CreateRenewalDialog open={showCreate} onOpenChange={setShowCreate} />
    </DashboardLayout>
  );
}
