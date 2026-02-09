import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useStoreOrderDetail(orderId: string | undefined) {
  return useQuery({
    queryKey: ["store-order-detail", orderId],
    queryFn: async () => {
      if (!orderId) return null;
      const { data, error } = await supabase
        .from("store_orders")
        .select("*, contacts:contact_id(id, name, email), companies:company_id(id, name), opportunities:opportunity_id(id, name), marketing_campaigns:campaign_id(id, name)")
        .eq("id", orderId)
        .maybeSingle();
      if (error) throw error;
      return data as Record<string, unknown> | null;
    },
    enabled: !!orderId,
  });
}
