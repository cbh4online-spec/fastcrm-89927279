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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  Search,
  Download,
  Plus,
  Bell,
  HelpCircle,
  Users,
  Target,
  DollarSign,
  Briefcase,
  Building2,
  Contact,
  CheckSquare,
  ChevronDown,
} from "lucide-react";
import { format, subMonths, subDays, isWithinInterval, startOfMonth, endOfMonth, formatDistanceToNow, startOfWeek, endOfWeek, startOfYear } from "date-fns";
import { pt } from "date-fns/locale";

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
  type PeriodFilter = "7d" | "30d" | "this_month" | "last_month" | "this_year" | "all";
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("this_month");
  
  const periodLabels: Record<PeriodFilter, string> = {
    "7d": "Últimos 7 dias",
    "30d": "Últimos 30 dias", 
    "this_month": "Este mês",
    "last_month": "Mês passado",
    "this_year": "Este ano",
    "all": "Todo o período",
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
      default:
        return { start: startOfMonth(now), end: now };
    }
  };

  // Calculate KPI data for cards based on selected period
  const kpiData = useMemo(() => {
    const now = new Date();
    const { start: periodStart, end: periodEnd } = getDateRange(periodFilter);
    
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

    // Opportunities in selected period
    const oppsInPeriod = opportunities?.filter((o: any) => 
      o.status === "open" && isWithinInterval(new Date(o.created_at), { start: periodStart, end: periodEnd })
    ) || [];
    const oppValue = oppsInPeriod.reduce((sum: number, o: any) => sum + (o.value || 0), 0);
    const oppsInPreviousPeriod = opportunities?.filter((o: any) =>
      o.status === "open" && isWithinInterval(new Date(o.created_at), { start: previousPeriodStart, end: previousPeriodEnd })
    ).length || 0;
    const oppsTrend = oppsInPreviousPeriod > 0
      ? Math.round(((oppsInPeriod.length - oppsInPreviousPeriod) / oppsInPreviousPeriod) * 100)
      : 0;

    const oppsChartData = Array.from({ length: 6 }, (_, i) => {
      const monthStart = startOfMonth(subMonths(now, 5 - i));
      const monthEnd = endOfMonth(subMonths(now, 5 - i));
      const count = opportunities?.filter((o: any) =>
        o.status === "open" && isWithinInterval(new Date(o.created_at), { start: monthStart, end: monthEnd })
      ).length || 0;
      return { value: count };
    });

    // Sales in selected period (from paid invoices)
    const salesInPeriod = paidInvoices?.filter((inv: any) =>
      inv.paid_at && isWithinInterval(new Date(inv.paid_at), { start: periodStart, end: periodEnd })
    ).reduce((sum: number, inv: any) => sum + (inv.total || 0), 0) || 0;
    const salesInPreviousPeriod = paidInvoices?.filter((inv: any) =>
      inv.paid_at && isWithinInterval(new Date(inv.paid_at), { start: previousPeriodStart, end: previousPeriodEnd })
    ).reduce((sum: number, inv: any) => sum + (inv.total || 0), 0) || 0;
    const salesTrend = salesInPreviousPeriod > 0
      ? Math.round(((salesInPeriod - salesInPreviousPeriod) / salesInPreviousPeriod) * 100)
      : 0;

    const salesChartData = Array.from({ length: 6 }, (_, i) => {
      const monthStart = startOfMonth(subMonths(now, 5 - i));
      const monthEnd = endOfMonth(subMonths(now, 5 - i));
      const value = paidInvoices?.filter((inv: any) =>
        inv.paid_at && isWithinInterval(new Date(inv.paid_at), { start: monthStart, end: monthEnd })
      ).reduce((sum: number, inv: any) => sum + (inv.total || 0), 0) || 0;
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
        total: oppsInPeriod.length,
        value: oppValue,
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
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Bell className="h-5 w-5 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <HelpCircle className="h-5 w-5 text-muted-foreground" />
              </Button>
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
                <DropdownMenuContent align="end" className="w-48">
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
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm" className="gap-1.5 h-9">
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
              <NexusOpportunityChart isLoading={isLoading} days={14} />

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
