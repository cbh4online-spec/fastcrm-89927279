import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useOperationalDashboard } from "@/hooks/useOperationalDashboard";
import { useLeads } from "@/hooks/useLeads";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useInvoices } from "@/hooks/useInvoices";
import { useTasks } from "@/hooks/useTasks";
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
  Calendar,
  Search,
  Filter,
  Download,
  Plus,
  Bell,
  HelpCircle,
  Users,
  Target,
  TrendingUp,
  DollarSign,
  Briefcase,
  FileText,
} from "lucide-react";
import { format, subMonths, isWithinInterval, startOfMonth, endOfMonth, formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

export default function Dashboard() {
  const navigate = useNavigate();
  const { kpis, isLoading } = useOperationalDashboard();
  const { data: leads } = useLeads();
  const { data: opportunities } = useOpportunities();
  const { data: paidInvoices } = useInvoices({ status: "paid" });
  const { data: tasks } = useTasks();
  const { companies } = useCompanies();

  // Calculate KPI data for cards
  const kpiData = useMemo(() => {
    const now = new Date();
    const thisMonth = startOfMonth(now);
    const lastMonth = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    // Leads
    const leadsThisMonth = leads?.filter((l: any) =>
      new Date(l.created_at) >= thisMonth
    ).length || 0;
    const leadsLastMonth = leads?.filter((l: any) =>
      isWithinInterval(new Date(l.created_at), { start: lastMonth, end: lastMonthEnd })
    ).length || 0;
    const leadsTrend = leadsLastMonth > 0
      ? Math.round(((leadsThisMonth - leadsLastMonth) / leadsLastMonth) * 100)
      : 0;

    const leadsChartData = Array.from({ length: 6 }, (_, i) => {
      const monthStart = startOfMonth(subMonths(now, 5 - i));
      const monthEnd = endOfMonth(subMonths(now, 5 - i));
      const count = leads?.filter((l: any) =>
        isWithinInterval(new Date(l.created_at), { start: monthStart, end: monthEnd })
      ).length || 0;
      return { value: count };
    });

    // Opportunities
    const openOpps = opportunities?.filter((o: any) => o.status === "open") || [];
    const oppValue = openOpps.reduce((sum: number, o: any) => sum + (o.value || 0), 0);
    const oppsThisMonth = openOpps.filter((o: any) =>
      new Date(o.created_at) >= thisMonth
    ).length;
    const oppsLastMonth = opportunities?.filter((o: any) =>
      o.status === "open" && isWithinInterval(new Date(o.created_at), { start: lastMonth, end: lastMonthEnd })
    ).length || 0;
    const oppsTrend = oppsLastMonth > 0
      ? Math.round(((oppsThisMonth - oppsLastMonth) / oppsLastMonth) * 100)
      : 0;

    const oppsChartData = Array.from({ length: 6 }, (_, i) => {
      const monthStart = startOfMonth(subMonths(now, 5 - i));
      const monthEnd = endOfMonth(subMonths(now, 5 - i));
      const count = opportunities?.filter((o: any) =>
        o.status === "open" && isWithinInterval(new Date(o.created_at), { start: monthStart, end: monthEnd })
      ).length || 0;
      return { value: count };
    });

    // Sales (from paid invoices)
    const salesThisMonth = paidInvoices?.filter((inv: any) =>
      inv.paid_at && new Date(inv.paid_at) >= thisMonth
    ).reduce((sum: number, inv: any) => sum + (inv.total || 0), 0) || 0;
    const salesLastMonth = paidInvoices?.filter((inv: any) =>
      inv.paid_at && isWithinInterval(new Date(inv.paid_at), { start: lastMonth, end: lastMonthEnd })
    ).reduce((sum: number, inv: any) => sum + (inv.total || 0), 0) || 0;
    const salesTrend = salesLastMonth > 0
      ? Math.round(((salesThisMonth - salesLastMonth) / salesLastMonth) * 100)
      : 0;

    const salesChartData = Array.from({ length: 6 }, (_, i) => {
      const monthStart = startOfMonth(subMonths(now, 5 - i));
      const monthEnd = endOfMonth(subMonths(now, 5 - i));
      const value = paidInvoices?.filter((inv: any) =>
        inv.paid_at && isWithinInterval(new Date(inv.paid_at), { start: monthStart, end: monthEnd })
      ).reduce((sum: number, inv: any) => sum + (inv.total || 0), 0) || 0;
      return { value };
    });

    // Contacts / Companies
    const companiesTotal = companies?.length || 0;

    return {
      leads: {
        total: leads?.length || 0,
        trend: leadsTrend,
        chartData: leadsChartData,
      },
      opportunities: {
        total: openOpps.length,
        value: oppValue,
        trend: oppsTrend,
        chartData: oppsChartData,
      },
      sales: {
        total: salesThisMonth,
        trend: salesTrend,
        chartData: salesChartData,
      },
      companies: companiesTotal,
    };
  }, [leads, opportunities, paidInvoices, companies]);

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
              <Button size="sm" className="gap-1.5 bg-primary shadow-lg shadow-primary/25">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Novo</span>
              </Button>
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
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar..."
                  className="pl-9 w-full sm:w-48 h-9 bg-muted/50 border-transparent focus:border-border"
                />
              </div>
              <Button variant="outline" size="sm" className="gap-1.5 h-9">
                <Filter className="h-4 w-4" />
                <span className="hidden sm:inline">Filtrar</span>
              </Button>
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
    </DashboardLayout>
  );
}
