import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useRenewalContracts } from "@/hooks/useRenewals";
import { RENEWAL_STATUS_CONFIG, RENEWAL_INTERVAL_LABELS, getHealthScoreColor } from "@/types/renewal";
import type { RenewalContract } from "@/types/renewal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { KPICard, KPIGrid } from "@/components/design-system/KPICard";
import { Plus, Search, RefreshCw, AlertTriangle, Calendar, Loader2, LayoutGrid, List, CalendarDays, Bell, TrendingUp, Activity, PieChart } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { pt } from "date-fns/locale";
import { CreateRenewalDialog } from "@/components/renewals/CreateRenewalDialog";
import { Progress } from "@/components/ui/progress";
import { RenewalAlerts } from "@/components/renewals/RenewalAlerts";
import { RenewalsKanbanView } from "@/components/renewals/RenewalsKanbanView";
import { RenewalsCalendarView } from "@/components/renewals/RenewalsCalendarView";

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(val);

export default function RenewalsPage() {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [companyFilter, setCompanyFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("renewal_date");

  const { data: contracts = [], isLoading } = useRenewalContracts(
    statusFilter !== "all" ? { status: statusFilter } : undefined
  );

  // Unique companies for filter
  const uniqueCompanies = useMemo(() => {
    const map = new Map<string, string>();
    contracts.forEach((c) => {
      if (c.company?.id && c.company?.name) map.set(c.company.id, c.company.name);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [contracts]);

  // Filtered + sorted
  const filtered = useMemo(() => {
    let result = contracts.filter((c) => {
      if (search) {
        const q = search.toLowerCase();
        const companyName = c.company?.name || "";
        const contactName = c.contact?.name || "";
        if (!companyName.toLowerCase().includes(q) && !contactName.toLowerCase().includes(q)) return false;
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
        case "mrr_desc": return Number(b.total_mrr || 0) - Number(a.total_mrr || 0);
        case "mrr_asc": return Number(a.total_mrr || 0) - Number(b.total_mrr || 0);
        case "health_asc": return a.health_score - b.health_score;
        case "health_desc": return b.health_score - a.health_score;
        default: {
          const da = a.next_renewal_date ? new Date(a.next_renewal_date).getTime() : Infinity;
          const db = b.next_renewal_date ? new Date(b.next_renewal_date).getTime() : Infinity;
          return da - db;
        }
      }
    });

    return result;
  }, [contracts, search, riskFilter, companyFilter, sortBy]);

  // KPIs
  const stats = useMemo(() => {
    const active = contracts.filter((c) => c.status === "active");
    const cancelled = contracts.filter((c) => c.status === "cancelled");
    const totalMRR = active.reduce((sum, c) => sum + Number(c.total_mrr || 0), 0);
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

    return { total: contracts.length, active: active.length, totalMRR, arr: totalMRR * 12, avgMRR, churnRate, overdue, upcoming30 };
  }, [contracts]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Renovações</h1>
            <p className="text-muted-foreground text-sm">Gestão de contratos, licenças, domínios e packs de horas</p>
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" /> Novo Contrato
          </Button>
        </div>

        {/* Enhanced KPIs */}
        <KPIGrid columns={4}>
          <KPICard
            title="ARR Total"
            value={formatCurrency(stats.arr)}
            icon={<TrendingUp className="h-4 w-4" />}
            variant="primary"
            subtitle={`MRR: ${formatCurrency(stats.totalMRR)}`}
          />
          <KPICard
            title="Contratos Ativos"
            value={String(stats.active)}
            icon={<Activity className="h-4 w-4" />}
            variant="success"
            subtitle={`MRR médio: ${formatCurrency(stats.avgMRR)}`}
          />
          <KPICard
            title="Próx. 30 dias"
            value={String(stats.upcoming30)}
            icon={<Calendar className="h-4 w-4" />}
            variant="warning"
            subtitle={`${stats.overdue} em atraso`}
          />
          <KPICard
            title="Taxa de Churn"
            value={`${stats.churnRate.toFixed(1)}%`}
            icon={<PieChart className="h-4 w-4" />}
            variant={stats.churnRate > 10 ? "destructive" : "default"}
            subtitle={`${stats.total} contratos total`}
          />
        </KPIGrid>

        {/* Main tabs */}
        <Tabs defaultValue="list">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <TabsList>
              <TabsTrigger value="list" className="gap-1.5">
                <List className="h-3.5 w-3.5" /> Contratos
              </TabsTrigger>
              <TabsTrigger value="kanban" className="gap-1.5">
                <LayoutGrid className="h-3.5 w-3.5" /> Kanban
              </TabsTrigger>
              <TabsTrigger value="alerts" className="gap-1.5">
                <Bell className="h-3.5 w-3.5" /> Alertas
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-1.5">
                <CalendarDays className="h-3.5 w-3.5" /> Calendário
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Filters (shared) */}
          <div className="flex items-center gap-3 mt-4 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por empresa ou contacto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="paused">Pausados</SelectItem>
                <SelectItem value="expired">Expirados</SelectItem>
                <SelectItem value="cancelled">Cancelados</SelectItem>
              </SelectContent>
            </Select>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Risco" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo risco</SelectItem>
                <SelectItem value="high">Alto (≤40)</SelectItem>
                <SelectItem value="medium">Médio (41-70)</SelectItem>
                <SelectItem value="low">Baixo (71+)</SelectItem>
              </SelectContent>
            </Select>
            {uniqueCompanies.length > 0 && (
              <Select value={companyFilter} onValueChange={setCompanyFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas empresas</SelectItem>
                  {uniqueCompanies.map(([id, name]) => (
                    <SelectItem key={id} value={id}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="renewal_date">Data renovação</SelectItem>
                <SelectItem value="mrr_desc">MRR (maior)</SelectItem>
                <SelectItem value="mrr_asc">MRR (menor)</SelectItem>
                <SelectItem value="health_asc">Health (pior)</SelectItem>
                <SelectItem value="health_desc">Health (melhor)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* List view */}
          <TabsContent value="list" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhum contrato encontrado</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Intervalo</TableHead>
                        <TableHead>Próxima Renovação</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">MRR</TableHead>
                        <TableHead>Health</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((contract) => {
                        const daysUntil = contract.next_renewal_date
                          ? differenceInDays(new Date(contract.next_renewal_date), new Date())
                          : null;
                        const statusConfig = RENEWAL_STATUS_CONFIG[contract.status];
                        return (
                          <TableRow
                            key={contract.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => navigate(`/dashboard/renewals/${contract.id}`)}
                          >
                            <TableCell>
                              <div>
                                <p className="font-medium">{contract.company?.name || "—"}</p>
                                {contract.contact?.name && (
                                  <p className="text-xs text-muted-foreground">{contract.contact.name}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {RENEWAL_INTERVAL_LABELS[contract.renewal_interval]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {contract.next_renewal_date ? (
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className={daysUntil !== null && daysUntil < 0 ? "text-red-600 font-medium" : daysUntil !== null && daysUntil <= 7 ? "text-yellow-600" : ""}>
                                    {format(new Date(contract.next_renewal_date), "dd MMM yyyy", { locale: pt })}
                                  </span>
                                  {daysUntil !== null && (
                                    <span className="text-xs text-muted-foreground">
                                      ({daysUntil < 0 ? `${Math.abs(daysUntil)}d atraso` : `${daysUntil}d`})
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={`${statusConfig.bgColor} ${statusConfig.color} border-0`}>
                                {statusConfig.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(Number(contract.total_mrr || 0))}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={contract.health_score} className="w-12 h-2" />
                                <span className={`text-xs font-medium ${getHealthScoreColor(contract.health_score)}`}>
                                  {contract.health_score}
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Kanban view */}
          <TabsContent value="kanban" className="mt-4">
            <RenewalsKanbanView contracts={filtered} formatCurrency={formatCurrency} />
          </TabsContent>

          {/* Alerts view */}
          <TabsContent value="alerts" className="mt-4">
            <RenewalAlerts />
          </TabsContent>

          {/* Calendar view */}
          <TabsContent value="calendar" className="mt-4">
            <RenewalsCalendarView contracts={filtered} formatCurrency={formatCurrency} />
          </TabsContent>
        </Tabs>

        <CreateRenewalDialog open={showCreate} onOpenChange={setShowCreate} />
      </div>
    </DashboardLayout>
  );
}
