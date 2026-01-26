import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useOperationalDashboard } from "@/hooks/useOperationalDashboard";
import { useLeads } from "@/hooks/useLeads";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useInvoices } from "@/hooks/useInvoices";
import { useTasks, useCreateTask } from "@/hooks/useTasks";
import { useCompanies } from "@/hooks/useCompanies";
import {
  NexusKPICard,
  NexusActivityList,
  NexusOpportunityChart,
  NexusLeadsDonut,
  NexusWeeklySales,
} from "@/components/dashboard/nexus";
import { InactivityAlertsBanner } from "@/components/productivity/InactivityAlertsBanner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Calendar,
  Download,
  Plus,
  Users,
  Target,
  DollarSign,
  Briefcase,
  Building2,
  Contact,
  CheckSquare,
  ChevronDown,
  CalendarRange,
} from "lucide-react";
import { format, subMonths, subDays, isWithinInterval, startOfMonth, endOfMonth, formatDistanceToNow, startOfWeek, endOfWeek, startOfYear } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Dialog components for creating entities
import { CreateLeadDialog } from "@/components/crm/CreateLeadDialog";
import { CreateOpportunityDialog } from "@/components/crm/CreateOpportunityDialog";
import { CreateContactDialog } from "@/components/contacts/CreateContactDialog";
import { CreateCompanyDialog } from "@/components/companies/CreateCompanyDialog";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";

export default function Dashboard() {
  const navigate = useNavigate();
  const { kpis, isLoading } = useOperationalDashboard();
  const { data: leads } = useLeads();
  const { data: opportunities } = useOpportunities();
  const { data: paidInvoices } = useInvoices({ status: "paid" });
  const { data: tasks } = useTasks();
  const { companies } = useCompanies();
  const createTask = useCreateTask();

  // Dialog states for creating entities
  const [createLeadOpen, setCreateLeadOpen] = useState(false);
  const [createOpportunityOpen, setCreateOpportunityOpen] = useState(false);
  const [createContactOpen, setCreateContactOpen] = useState(false);
  const [createCompanyOpen, setCreateCompanyOpen] = useState(false);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  
  // Period filter state
  type PeriodFilter = "7d" | "30d" | "this_month" | "last_month" | "this_year" | "all" | "custom";
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("this_month");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  
  const periodLabels: Record<PeriodFilter, string> = {
    "7d": "Últimos 7 dias",
    "30d": "Últimos 30 dias", 
    "this_month": "Este mês",
    "last_month": "Mês passado",
    "this_year": "Este ano",
    "all": "Todo o período",
    "custom": customDateRange.from && customDateRange.to 
      ? `${format(customDateRange.from, "d MMM", { locale: pt })} - ${format(customDateRange.to, "d MMM", { locale: pt })}`
      : "Personalizado",
  };
  
  // Get date range based on selected period
  const getDateRange = (period: PeriodFilter) => {
    const now = new Date();
    switch (period) {
      case "7d":
        return { start: subDays(now, 7), end: now };
      case "30d":
        return { start: subDays(now, 30), end: now };
      case "this_month":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "last_month":
        const lastMonthStart = startOfMonth(subMonths(now, 1));
        return { start: lastMonthStart, end: endOfMonth(lastMonthStart) };
      case "this_year":
        return { start: startOfYear(now), end: now };
      case "all":
        return { start: new Date(0), end: now };
      case "custom":
        return { 
          start: customDateRange.from || startOfMonth(now), 
          end: customDateRange.to || now 
        };
      default:
        return { start: startOfMonth(now), end: now };
    }
  };

  // Export dashboard data
  const handleExport = () => {
    const exportData = {
      periodo: periodLabels[periodFilter],
      dataExportacao: format(new Date(), "dd/MM/yyyy HH:mm", { locale: pt }),
      kpis: {
        totalLeads: kpiData.leads.total,
        tendenciaLeads: `${kpiData.leads.trend}%`,
        totalOportunidades: kpiData.opportunities.total,
        valorPipeline: kpiData.opportunities.value,
        tendenciaOportunidades: `${kpiData.opportunities.trend}%`,
        vendasPeriodo: kpiData.sales.total,
        tendenciaVendas: `${kpiData.sales.trend}%`,
        totalEmpresas: kpiData.companies,
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dashboard-export-${format(new Date(), "yyyy-MM-dd")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Dashboard exportado com sucesso!");
  };

  // Get current period dates
  const { start: periodStart, end: periodEnd } = useMemo(() => getDateRange(periodFilter), [periodFilter, customDateRange]);

  // Calculate KPI data for cards based on selected period
  const kpiData = useMemo(() => {
    const now = new Date();
    
    // Get previous period for comparison
    const periodDuration = periodEnd.getTime() - periodStart.getTime();
    const previousPeriodEnd = new Date(periodStart.getTime() - 1);
    const previousPeriodStart = new Date(previousPeriodEnd.getTime() - periodDuration);

    // Leads in selected period
    const leadsInPeriod = leads?.filter((l: any) =>
      isWithinInterval(new Date(l.created_at), { start: periodStart, end: periodEnd })
    ).length || 0;
    const leadsInPreviousPeriod = leads?.filter((l: any) =>
      isWithinInterval(new Date(l.created_at), { start: previousPeriodStart, end: previousPeriodEnd })
    ).length || 0;
    const leadsTrend = leadsInPreviousPeriod > 0
      ? Math.round(((leadsInPeriod - leadsInPreviousPeriod) / leadsInPreviousPeriod) * 100)
      : 0;

    const leadsChartData = Array.from({ length: 6 }, (_, i) => {
      const monthStart = startOfMonth(subMonths(now, 5 - i));
      const monthEnd = endOfMonth(subMonths(now, 5 - i));
      const count = leads?.filter((l: any) =>
        isWithinInterval(new Date(l.created_at), { start: monthStart, end: monthEnd })
      ).length || 0;
      return { value: count };
    });

    // Open opportunities (pipeline value - not filtered by creation date, just status)
    const openOpportunities = opportunities?.filter((o: any) => o.status === "open") || [];
    const openOppValue = openOpportunities.reduce((sum: number, o: any) => sum + (o.value || 0), 0);
    
    // For trend: count opportunities created in each period
    const oppsCreatedInPeriod = opportunities?.filter((o: any) =>
      isWithinInterval(new Date(o.created_at), { start: periodStart, end: periodEnd })
    ).length || 0;
    const oppsCreatedInPreviousPeriod = opportunities?.filter((o: any) =>
      isWithinInterval(new Date(o.created_at), { start: previousPeriodStart, end: previousPeriodEnd })
    ).length || 0;
    const oppsTrend = oppsCreatedInPreviousPeriod > 0
      ? Math.round(((oppsCreatedInPeriod - oppsCreatedInPreviousPeriod) / oppsCreatedInPreviousPeriod) * 100)
      : 0;

    const oppsChartData = Array.from({ length: 6 }, (_, i) => {
      const monthStart = startOfMonth(subMonths(now, 5 - i));
      const monthEnd = endOfMonth(subMonths(now, 5 - i));
      const value = opportunities?.filter((o: any) =>
        isWithinInterval(new Date(o.created_at), { start: monthStart, end: monthEnd })
      ).reduce((sum: number, o: any) => sum + (o.value || 0), 0) || 0;
      return { value };
    });

    // Sales in selected period (from WON opportunities based on updated_at - when they were won)
    const wonOppsInPeriod = opportunities?.filter((o: any) =>
      o.status === "won" && o.updated_at && isWithinInterval(new Date(o.updated_at), { start: periodStart, end: periodEnd })
    ) || [];
    const salesInPeriod = wonOppsInPeriod.reduce((sum: number, o: any) => sum + (o.value || 0), 0);
    
    const wonOppsInPreviousPeriod = opportunities?.filter((o: any) =>
      o.status === "won" && o.updated_at && isWithinInterval(new Date(o.updated_at), { start: previousPeriodStart, end: previousPeriodEnd })
    ) || [];
    const salesInPreviousPeriod = wonOppsInPreviousPeriod.reduce((sum: number, o: any) => sum + (o.value || 0), 0);
    const salesTrend = salesInPreviousPeriod > 0
      ? Math.round(((salesInPeriod - salesInPreviousPeriod) / salesInPreviousPeriod) * 100)
      : 0;

    const salesChartData = Array.from({ length: 6 }, (_, i) => {
      const monthStart = startOfMonth(subMonths(now, 5 - i));
      const monthEnd = endOfMonth(subMonths(now, 5 - i));
      const value = opportunities?.filter((o: any) =>
        o.status === "won" && o.updated_at && isWithinInterval(new Date(o.updated_at), { start: monthStart, end: monthEnd })
      ).reduce((sum: number, o: any) => sum + (o.value || 0), 0) || 0;
      return { value };
    });

    // Contacts / Companies (total, not filtered by period)
    const companiesTotal = companies?.length || 0;

    return {
      leads: {
        total: leadsInPeriod,
        trend: leadsTrend,
        chartData: leadsChartData,
      },
      opportunities: {
        total: openOpportunities.length,
        value: openOppValue,
        trend: oppsTrend,
        chartData: oppsChartData,
      },
      sales: {
        total: salesInPeriod,
        trend: salesTrend,
        chartData: salesChartData,
      },
      companies: companiesTotal,
    };
  }, [leads, opportunities, paidInvoices, companies, periodFilter]);

  // Prepare recent leads for activity list
  const recentLeadsItems = useMemo(() => {
    return leads
      ?.slice()
      .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6)
      .map((lead: any) => {
        const companyName = lead.company_id
          ? companies?.find((c: any) => c.id === lead.company_id)?.name
          : lead.company;

        return {
          id: lead.id,
          name: lead.name,
          email: lead.email,
          subtitle: companyName ? `· ${companyName}` : undefined,
          timestamp: formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: pt }),
          badge: lead.status === "new" ? { label: "Novo", variant: "secondary" as const } : undefined,
        };
      }) || [];
  }, [leads, companies]);

  // Prepare tasks for activity list
  const taskItems = useMemo(() => {
    return tasks
      ?.filter((t: any) => t.status !== "completed")
      .slice(0, 5)
      .map((task: any) => ({
        id: task.id,
        name: task.title,
        subtitle: task.description?.substring(0, 50) || undefined,
        timestamp: task.due_date
          ? format(new Date(task.due_date), "d MMM", { locale: pt })
          : undefined,
        badge: task.priority === "high"
          ? { label: "Urgente", variant: "destructive" as const }
          : task.priority === "medium"
            ? { label: "Média", variant: "secondary" as const }
            : undefined,
      })) || [];
  }, [tasks]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString("pt-PT");
  };

  const formatCurrency = (num: number) => {
    if (num >= 1000000) return `€${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `€${(num / 1000).toFixed(1)}K`;
    return `€${num.toLocaleString("pt-PT")}`;
  };

  return (
    <DashboardLayout>
      <ScrollArea className="h-[calc(100vh-5rem)]">
        <div className="p-4 md:p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <Badge variant="outline" className="text-xs font-normal">
                  FastCRM
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Bem-vindo de volta. Aqui está o resumo da sua atividade.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="gap-1.5 bg-primary shadow-lg shadow-primary/25">
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Novo</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setCreateLeadOpen(true)}>
                    <Target className="h-4 w-4 mr-2" />
                    Novo Lead
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCreateOpportunityOpen(true)}>
                    <Briefcase className="h-4 w-4 mr-2" />
                    Nova Oportunidade
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCreateContactOpen(true)}>
                    <Contact className="h-4 w-4 mr-2" />
                    Novo Contacto
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCreateCompanyOpen(true)}>
                    <Building2 className="h-4 w-4 mr-2" />
                    Nova Empresa
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCreateTaskOpen(true)}>
                    <CheckSquare className="h-4 w-4 mr-2" />
                    Nova Tarefa
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Última atualização:</span>
              <span className="font-medium text-foreground">
                {format(new Date(), "d 'de' MMMM yyyy", { locale: pt })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 h-9">
                    <Calendar className="h-4 w-4" />
                    <span className="hidden sm:inline">{periodLabels[periodFilter]}</span>
                    <ChevronDown className="h-3 w-3 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-popover">
                  <DropdownMenuItem onClick={() => setPeriodFilter("7d")}>
                    Últimos 7 dias
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPeriodFilter("30d")}>
                    Últimos 30 dias
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPeriodFilter("this_month")}>
                    Este mês
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPeriodFilter("last_month")}>
                    Mês passado
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPeriodFilter("this_year")}>
                    Este ano
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPeriodFilter("all")}>
                    Todo o período
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setDatePickerOpen(true)}>
                    <CalendarRange className="h-4 w-4 mr-2" />
                    Período personalizado
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Custom Date Range Popover */}
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <span className="hidden" />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover" align="end">
                  <div className="p-3 space-y-3">
                    <p className="text-sm font-medium">Selecione o período</p>
                    <CalendarComponent
                      mode="range"
                      selected={customDateRange}
                      onSelect={(range) => {
                        setCustomDateRange({ from: range?.from, to: range?.to });
                      }}
                      numberOfMonths={2}
                      locale={pt}
                      className={cn("p-3 pointer-events-auto")}
                    />
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setDatePickerOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        size="sm" 
                        onClick={() => {
                          if (customDateRange.from && customDateRange.to) {
                            setPeriodFilter("custom");
                            setDatePickerOpen(false);
                          } else {
                            toast.error("Selecione as duas datas");
                          }
                        }}
                      >
                        Aplicar
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Button 
                variant="outline" 
                size="sm" 
                className="gap-1.5 h-9"
                onClick={handleExport}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Exportar</span>
              </Button>
            </div>
          </div>

          {/* Inactivity Alerts */}
          <InactivityAlertsBanner className="mx-0" />

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <NexusKPICard
              title="Total Leads"
              value={formatNumber(kpiData.leads.total)}
              subtitle="Potenciais clientes"
              trend={kpiData.leads.trend}
              icon={Target}
              chartData={kpiData.leads.chartData}
              accentColor="emerald"
              onClick={() => navigate("/dashboard/leads")}
            />
            <NexusKPICard
              title="Oportunidades"
              value={formatNumber(kpiData.opportunities.total)}
              subtitle={formatCurrency(kpiData.opportunities.value)}
              trend={kpiData.opportunities.trend}
              icon={Briefcase}
              chartData={kpiData.opportunities.chartData}
              accentColor="violet"
              onClick={() => navigate("/dashboard/opportunities")}
            />
            <NexusKPICard
              title="Vendas do Mês"
              value={formatCurrency(kpiData.sales.total)}
              subtitle="Receita confirmada"
              trend={kpiData.sales.trend}
              icon={DollarSign}
              chartData={kpiData.sales.chartData}
              accentColor="primary"
              onClick={() => navigate("/dashboard/invoices")}
            />
            <NexusKPICard
              title="Empresas"
              value={formatNumber(kpiData.companies)}
              subtitle="Base de clientes"
              icon={Users}
              accentColor="amber"
              onClick={() => navigate("/dashboard/companies")}
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-12 gap-4 lg:gap-6">
            {/* Left Column - Charts */}
            <div className="col-span-12 lg:col-span-8 space-y-4 lg:space-y-6">
              {/* Opportunity Summary Chart */}
              <NexusOpportunityChart isLoading={isLoading} periodStart={periodStart} periodEnd={periodEnd} />

              {/* Bottom Row - Two Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                <NexusLeadsDonut isLoading={isLoading} />
                <NexusWeeklySales isLoading={isLoading} />
              </div>
            </div>

            {/* Right Sidebar - Activity Lists */}
            <div className="col-span-12 lg:col-span-4 space-y-4 lg:space-y-6">
              <NexusActivityList
                title="Leads Recentes"
                items={recentLeadsItems}
                isLoading={isLoading}
                onItemClick={(item) => navigate(`/dashboard/leads?selected=${item.id}`)}
                onViewAll={() => navigate("/dashboard/leads")}
                emptyState={{
                  title: "Sem leads recentes",
                  description: "Novos leads aparecerão aqui",
                }}
              />

              <NexusActivityList
                title="Minhas Tarefas"
                items={taskItems}
                isLoading={isLoading}
                onItemClick={(item) => navigate(`/dashboard/tasks?selected=${item.id}`)}
                onViewAll={() => navigate("/dashboard/tasks")}
                emptyState={{
                  title: "Sem tarefas pendentes",
                  description: "Suas tarefas aparecerão aqui",
                }}
              />
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Create Dialogs */}
      <CreateLeadDialog open={createLeadOpen} onOpenChange={setCreateLeadOpen} />
      <CreateOpportunityDialog open={createOpportunityOpen} onOpenChange={setCreateOpportunityOpen} />
      <CreateContactDialog open={createContactOpen} onOpenChange={setCreateContactOpen} />
      <CreateCompanyDialog open={createCompanyOpen} onOpenChange={setCreateCompanyOpen} />
      <CreateTaskDialog 
        open={createTaskOpen} 
        onOpenChange={setCreateTaskOpen}
        entityName="Dashboard"
        onCreateTask={(task) => {
          createTask.mutate({
            title: task.title,
            due_at: task.due_at,
            assigned_to: task.assigned_to,
          });
          setCreateTaskOpen(false);
        }}
      />
    </DashboardLayout>
  );
}
