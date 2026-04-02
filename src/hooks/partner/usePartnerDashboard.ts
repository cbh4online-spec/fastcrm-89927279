import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePartnerDashboard(partnerAccountId: string | undefined, workspaceId: string | undefined) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["partner-dashboard", partnerAccountId],
    enabled: !!partnerAccountId && !!workspaceId,
    queryFn: async () => {
      // Get orders summary
      const { data: orders } = await supabase
        .from("partner_order_headers")
        .select("id, status, total_net, created_at")
        .eq("partner_account_id", partnerAccountId!)
        .order("created_at", { ascending: false })
        .limit(500);

      const allOrders = orders || [];
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);

      const monthOrders = allOrders.filter(o => new Date(o.created_at) >= thisMonth);
      const quarterOrders = allOrders.filter(o => new Date(o.created_at) >= thisQuarter);

      const monthRevenue = monthOrders.reduce((sum, o) => sum + (o.total_net || 0), 0);
      const quarterRevenue = quarterOrders.reduce((sum, o) => sum + (o.total_net || 0), 0);

      const openOrders = allOrders.filter(o => 
        ['submitted', 'awaiting_approval', 'approved', 'processing'].includes(o.status)
      ).length;

      const pendingApprovals = allOrders.filter(o => o.status === 'awaiting_approval').length;

      return {
        monthRevenue,
        quarterRevenue,
        totalOrders: allOrders.length,
        openOrders,
        pendingApprovals,
        recentOrders: allOrders.slice(0, 5),
      };
    },
  });

  return { stats, isLoading };
}
