import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { OrderNote } from "@/types/order-note";

export function useContactOrderNotes(contactId: string | undefined) {
  const { data: orders = [], isLoading, error, refetch } = useQuery({
    queryKey: ["contact-order-notes", contactId],
    queryFn: async () => {
      if (!contactId) return [];

      // First, get client_user associated with this contact
      const { data: clientUsers, error: clientError } = await supabase
        .from("client_users")
        .select("id")
        .eq("contact_id", contactId);

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
          installment_count
        `)
        .in("client_user_id", clientUserIds)
        .neq("status", "draft")
        .order("created_at", { ascending: false })
        .limit(10);

      if (ordersError) {
        console.warn('[B2B-ORDERS] CONTACT_ORDERS_FAILED', ordersError.message);
        throw ordersError;
      }
      return orders as Partial<OrderNote>[];
    },
    enabled: !!contactId,
  });

  return {
    orders,
    loading: isLoading,
    error: error?.message || null,
    refetch,
  };
}
