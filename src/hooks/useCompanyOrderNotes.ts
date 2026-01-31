import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { OrderNote } from "@/types/order-note";

export function useCompanyOrderNotes(companyId: string | undefined) {
  const { data: orders = [], isLoading, error, refetch } = useQuery({
    queryKey: ["company-order-notes", companyId],
    queryFn: async () => {
      if (!companyId) return [];

      // First, get client_users associated with this company
      const { data: clientUsers, error: clientError } = await supabase
        .from("client_users")
        .select("id")
        .eq("company_id", companyId);

      if (clientError) throw clientError;
      if (!clientUsers || clientUsers.length === 0) return [];

      const clientUserIds = clientUsers.map(c => c.id);

      // Then fetch orders for those client users
      const { data: orders, error: ordersError } = await supabase
        .from("order_notes")
        .select(`
          id,
          order_number,
          status,
          total_net,
          total_vat,
          total_gross,
          submitted_at,
          created_at,
          installment_requested,
          installment_count,
          client_user:client_users(id, name)
        `)
        .in("client_user_id", clientUserIds)
        .neq("status", "draft")
        .order("created_at", { ascending: false })
        .limit(20);

      if (ordersError) throw ordersError;
      return orders as Array<Partial<OrderNote> & { client_user?: { id: string; name: string } }>;
    },
    enabled: !!companyId,
  });

  // Calculate aggregated stats
  const stats = {
    totalOrders: orders.length,
    totalValue: orders.reduce((sum, o) => sum + (o.total_gross || 0), 0),
    pendingOrders: orders.filter(o => ["submitted", "awaiting_approval", "in_preparation"].includes(o.status || "")).length,
  };

  return {
    orders,
    stats,
    loading: isLoading,
    error: error?.message || null,
    refetch,
  };
}
