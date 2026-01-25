import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useOperationalDashboard } from "@/hooks/useOperationalDashboard";
import { useLeads } from "@/hooks/useLeads";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useInvoices } from "@/hooks/useInvoices";
import { KPICardWithChart } from "@/components/dashboard/KPICardWithChart";
import { RecentLeadsWidget } from "@/components/dashboard/RecentLeadsWidget";
import { MyTasksWidget } from "@/components/dashboard/MyTasksWidget";
import { OpportunitySummaryChart } from "@/components/dashboard/OpportunitySummaryChart";
import { LeadsByStatusChart } from "@/components/dashboard/LeadsByStatusChart";
import { WeeklySalesChart } from "@/components/dashboard/WeeklySalesChart";
import { InactivityAlertsBanner } from "@/components/productivity/InactivityAlertsBanner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Search, Filter, Download, Plus, Bell, HelpCircle } from "lucide-react";
import { format, subMonths, isWithinInterval, startOfMonth, endOfMonth } from "date-fns";
import { pt } from "date-fns/locale";

export default function Dashboard() {
  const navigate = useNavigate();
  const { kpis, isLoading } = useOperationalDashboard();
  const { data: leads } = useLeads();
  const { data: opportunities } = useOpportunities();
  const { data: paidInvoices } = useInvoices({ status: "paid" });

  // Calculate KPI data for cards
  const kpiData = useMemo(() => {
    const now = new Date();
    const thisMonth = startOfMonth(now);
    const lastMonth = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
    const twoMonthsAgo = startOfMonth(subMonths(now, 2));
    const twoMonthsAgoEnd = endOfMonth(subMonths(now, 2));

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

    // Create chart data for leads (last 6 months)
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

    return {
      leads: {
        total: leads?.length || 0,
        trend: leadsTrend,
        chartData: leadsChartData,
      },
      opportunities: {
        total: openOpps.length,
        trend: oppsTrend,
        chartData: oppsChartData,
      },
      sales: {
        total: salesThisMonth,
        trend: salesTrend,
        chartData: salesChartData,
      },
    };
  }, [leads, opportunities, paidInvoices]);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(3).replace(".", ".")}`;
    if (num >= 1000) return `${(num / 1000).toFixed(3).replace(".", ".")}`;
    return num.toLocaleString("pt-PT");
  };

  const formatCurrency = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(3).replace(".", ".")}`;
    if (num >= 1000) return `${(num / 1000).toFixed(3).replace(".", ".")}`;
    return num.toLocaleString("pt-PT");
  };

  return (
    <DashboardLayout>
      <ScrollArea className="h-[calc(100vh-5rem)]">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Dashboard</h1>
              <span className="text-muted-foreground">···</span>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon">
                <HelpCircle className="h-5 w-5 text-muted-foreground" />
              </Button>
              <Button size="icon" className="rounded-full bg-primary">
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Última atualização:</span>
              <span className="text-primary font-medium">
                {format(new Date(), "d 'de' MMMM yyyy", { locale: pt })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Pesquisar" 
                  className="pl-9 w-48 h-9"
                />
              </div>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Filter className="h-4 w-4" />
                Filtrar
              </Button>
              <Button size="sm" className="gap-1.5 bg-primary">
                <Download className="h-4 w-4" />
                Importar/Exportar
              </Button>
            </div>
          </div>

          {/* Inactivity Alerts */}
          <InactivityAlertsBanner className="mx-0" />

          {/* Main Content */}
          <div className="grid grid-cols-12 gap-6">
            {/* Left Column - Main Content */}
            <div className="col-span-12 lg:col-span-9 space-y-6">
              {/* KPI Cards Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KPICardWithChart
                  title="Total de Leads"
                  value={formatNumber(kpiData.leads.total)}
                  trend={kpiData.leads.trend}
                  chartData={kpiData.leads.chartData}
                  chartColor="hsl(var(--primary))"
                  onClick={() => navigate("/dashboard/leads")}
                />
                <KPICardWithChart
                  title="Total de Oportunidades"
                  value={formatNumber(kpiData.opportunities.total)}
                  trend={kpiData.opportunities.trend}
                  chartData={kpiData.opportunities.chartData}
                  chartColor="hsl(var(--primary))"
                  onClick={() => navigate("/dashboard/opportunities")}
                />
                <KPICardWithChart
                  title="Total de Vendas"
                  value={formatCurrency(kpiData.sales.total)}
                  trend={kpiData.sales.trend}
                  chartData={kpiData.sales.chartData}
                  chartColor="hsl(var(--primary))"
                  onClick={() => navigate("/dashboard/invoices")}
                />
              </div>

              {/* Opportunity Summary Chart */}
              <OpportunitySummaryChart isLoading={isLoading} />

              {/* Bottom Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <LeadsByStatusChart isLoading={isLoading} />
                <WeeklySalesChart isLoading={isLoading} />
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="col-span-12 lg:col-span-3 space-y-6">
              <RecentLeadsWidget maxItems={6} isLoading={isLoading} />
              <MyTasksWidget maxItems={5} isLoading={isLoading} />
            </div>
          </div>
        </div>
      </ScrollArea>
    </DashboardLayout>
  );
}
