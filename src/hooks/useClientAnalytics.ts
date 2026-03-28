import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface ClientAnalyticsData {
  totalClients: number;
  activeClients: number;
  suspendedClients: number;
  pendingClients: number;
  activationRate: number;
  // Commercial
  clientRankings: ClientRanking[];
  monthlyOrders: number;
  monthlyRevenue: number;
  totalRevenue: number;
  totalOrders: number;
  // Weekly activity (last 12 weeks)
  weeklyActivity: { week: string; orders: number; revenue: number }[];
  // Inactivity alerts
  inactiveClients: InactiveClient[];
}

export interface ClientRanking {
  id: string;
  name: string;
  email: string;
  status: string;
  totalOrders: number;
  totalValue: number;
  lastOrderDate: string | null;
}

export interface InactiveClient {
  id: string;
  name: string;
  email: string;
  daysSinceLastOrder: number;
  totalHistoricValue: number;
}

export function useClientAnalytics() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["client-analytics", workspaceId],
    queryFn: async (): Promise<ClientAnalyticsData> => {
      if (!workspaceId) throw new Error("No workspace");

      // 1. Get all clients
      const { data: clients, error: cErr } = await supabase
        .from("client_users")
        .select("id, name, email, status, created_at")
        .eq("workspace_id", workspaceId);

      if (cErr) throw cErr;

      const total = clients?.length || 0;
      const active = clients?.filter(c => c.status === "active").length || 0;
      const suspended = clients?.filter(c => c.status === "suspended").length || 0;
      const pending = clients?.filter(c => c.status === "pending").length || 0;
      const activationRate = total > 0 ? Math.round((active / total) * 100) : 0;

      // 2. Get all orders with client info
      const { data: orders, error: oErr } = await supabase
        .from("order_notes")
        .select("id, client_user_id, total_gross, status, created_at, submitted_at")
        .eq("workspace_id", workspaceId)
        .neq("status", "draft")
        .neq("status", "cancelled");

      if (oErr) throw oErr;

      // Monthly stats
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthOrders = orders?.filter(o => new Date(o.created_at) >= startOfMonth) || [];

      // Client rankings
      const clientMap = new Map<string, { orders: number; value: number; lastDate: string | null }>();
      (orders || []).forEach(o => {
        if (!o.client_user_id) return;
        const existing = clientMap.get(o.client_user_id) || { orders: 0, value: 0, lastDate: null };
        existing.orders++;
        existing.value += o.total_gross || 0;
        if (!existing.lastDate || o.created_at > existing.lastDate) existing.lastDate = o.created_at;
        clientMap.set(o.client_user_id, existing);
      });

      const rankings: ClientRanking[] = (clients || [])
        .map(c => {
          const stats = clientMap.get(c.id) || { orders: 0, value: 0, lastDate: null };
          return {
            id: c.id,
            name: c.name,
            email: c.email,
            status: c.status || "active",
            totalOrders: stats.orders,
            totalValue: stats.value,
            lastOrderDate: stats.lastDate,
          };
        })
        .sort((a, b) => b.totalValue - a.totalValue);

      // Inactive clients (active clients with no order in 30+ days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const inactiveClients: InactiveClient[] = rankings
        .filter(c => c.status === "active" && (!c.lastOrderDate || new Date(c.lastOrderDate) < thirtyDaysAgo))
        .map(c => {
          const daysSince = c.lastOrderDate
            ? Math.floor((now.getTime() - new Date(c.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24))
            : 999;
          return {
            id: c.id,
            name: c.name,
            email: c.email,
            daysSinceLastOrder: daysSince,
            totalHistoricValue: c.totalValue,
          };
        })
        .sort((a, b) => b.daysSinceLastOrder - a.daysSinceLastOrder);

      // Weekly activity (last 12 weeks)
      const weeklyActivity: { week: string; orders: number; revenue: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - (i * 7 + weekStart.getDay()));
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 7);
        const label = `S${12 - i}`;

        const weekOrders = (orders || []).filter(o => {
          const d = new Date(o.created_at);
          return d >= weekStart && d < weekEnd;
        });

        weeklyActivity.push({
          week: label,
          orders: weekOrders.length,
          revenue: weekOrders.reduce((s, o) => s + (o.total_gross || 0), 0),
        });
      }

      return {
        totalClients: total,
        activeClients: active,
        suspendedClients: suspended,
        pendingClients: pending,
        activationRate,
        clientRankings: rankings,
        monthlyOrders: monthOrders.length,
        monthlyRevenue: monthOrders.reduce((s, o) => s + (o.total_gross || 0), 0),
        totalRevenue: (orders || []).reduce((s, o) => s + (o.total_gross || 0), 0),
        totalOrders: orders?.length || 0,
        weeklyActivity,
        inactiveClients,
      };
    },
    enabled: !!workspaceId,
    staleTime: 60_000,
  });
}
