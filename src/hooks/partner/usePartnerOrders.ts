import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { PartnerOrderHeader } from "@/types/partner";

export function usePartnerOrders(partnerAccountId: string | undefined) {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["partner-orders", partnerAccountId],
    enabled: !!partnerAccountId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_order_headers")
        .select("*")
        .eq("partner_account_id", partnerAccountId!)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as PartnerOrderHeader[];
    },
  });

  return { orders, isLoading };
}

export function usePartnerOrderDetail(orderId: string | undefined) {
  const { data: order, isLoading } = useQuery({
    queryKey: ["partner-order-detail", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_order_headers")
        .select("*, partner_order_items(*)")
        .eq("id", orderId!)
        .single();

      if (error) throw error;
      return {
        ...data,
        items: data.partner_order_items,
      } as PartnerOrderHeader;
    },
  });

  return { order, isLoading };
}
