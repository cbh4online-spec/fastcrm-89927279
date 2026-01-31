import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, 
  ShoppingCart, 
  TrendingUp, 
  CreditCard,
  CheckCircle,
  Clock
} from "lucide-react";

export function ClientUserStats() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const { data: stats, isLoading } = useQuery({
    queryKey: ["client-user-stats", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;

      // Get client counts by status
      const { data: clients, error: clientsError } = await supabase
        .from("client_users")
        .select("id, status")
        .eq("workspace_id", workspaceId);

      if (clientsError) throw clientsError;

      const activeClients = clients?.filter(c => c.status === "active").length || 0;
      const pendingClients = clients?.filter(c => c.status === "pending").length || 0;
      const totalClients = clients?.length || 0;

      // Get orders for current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: orders, error: ordersError } = await supabase
        .from("order_notes")
        .select("id, status, total_gross, installment_requested")
        .eq("workspace_id", workspaceId)
        .neq("status", "draft")
        .gte("submitted_at", startOfMonth.toISOString());

      if (ordersError) throw ordersError;

      const monthlyOrders = orders?.length || 0;
      const monthlyValue = orders?.reduce((sum, o) => sum + (o.total_gross || 0), 0) || 0;
      
      // Installment stats
      const installmentRequests = orders?.filter(o => o.installment_requested).length || 0;
      const approvedOrders = orders?.filter(o => ["approved", "in_preparation", "invoiced"].includes(o.status)).length || 0;

      // Get all-time totals
      const { data: allOrders, error: allOrdersError } = await supabase
        .from("order_notes")
        .select("id, total_gross, status")
        .eq("workspace_id", workspaceId)
        .neq("status", "draft")
        .neq("status", "cancelled")
        .neq("status", "rejected");

      if (allOrdersError) throw allOrdersError;

      const totalValue = allOrders?.reduce((sum, o) => sum + (o.total_gross || 0), 0) || 0;
      const totalOrders = allOrders?.length || 0;

      return {
        activeClients,
        pendingClients,
        totalClients,
        monthlyOrders,
        monthlyValue,
        totalValue,
        totalOrders,
        installmentRequests,
        approvedOrders,
        approvalRate: monthlyOrders > 0 ? Math.round((approvedOrders / monthlyOrders) * 100) : 0,
      };
    },
    enabled: !!workspaceId,
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      title: "Clientes Activos",
      value: stats.activeClients,
      subvalue: `${stats.pendingClients} pendentes`,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Encomendas (Mês)",
      value: stats.monthlyOrders,
      subvalue: `€${stats.monthlyValue.toFixed(0)} valor`,
      icon: ShoppingCart,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Volume Total",
      value: `€${(stats.totalValue / 1000).toFixed(1)}k`,
      subvalue: `${stats.totalOrders} encomendas`,
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-100",
    },
    {
      title: "Taxa Aprovação",
      value: `${stats.approvalRate}%`,
      subvalue: `${stats.installmentRequests} c/ prestações`,
      icon: CheckCircle,
      color: "text-emerald-600",
      bgColor: "bg-emerald-100",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.subvalue}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
