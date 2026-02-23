import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subDays } from "date-fns";

export interface ProductRanking {
  product_id: string;
  product_name: string;
  total_qty: number;
  total_value: number;
  last_purchased_at: string | null;
  images: string[] | null;
  trend: "up" | "down" | "stable";
}

export type RankingPeriod = 30 | 90 | 180;

export function useProductRankings(
  clientUserId: string | undefined,
  workspaceId: string | undefined,
  periodDays: RankingPeriod = 30
) {
  return useQuery({
    queryKey: ["product-rankings", clientUserId, workspaceId, periodDays],
    queryFn: async (): Promise<ProductRanking[]> => {
      if (!clientUserId || !workspaceId) return [];

      const startDate = subDays(new Date(), periodDays).toISOString();
      const prevStartDate = subDays(new Date(), periodDays * 2).toISOString();

      // Current period orders
      const { data: orders } = await supabase
        .from("order_notes")
        .select("id, created_at")
        .eq("client_user_id", clientUserId)
        .eq("status", "invoiced")
        .gte("created_at", startDate);

      // Previous period orders (for trend)
      const { data: prevOrders } = await supabase
        .from("order_notes")
        .select("id")
        .eq("client_user_id", clientUserId)
        .eq("status", "invoiced")
        .gte("created_at", prevStartDate)
        .lt("created_at", startDate);

      if (!orders || orders.length === 0) return [];

      const orderIds = orders.map((o: any) => o.id);
      const prevOrderIds = (prevOrders || []).map((o: any) => o.id);

      // Fetch items
      const { data: items } = await supabase
        .from("order_note_items")
        .select("product_id, product_name, quantity, line_total_net")
        .in("order_note_id", orderIds);

      // Fetch prev items for trend
      let prevProductQty = new Map<string, number>();
      if (prevOrderIds.length > 0) {
        const { data: prevItems } = await supabase
          .from("order_note_items")
          .select("product_id, quantity")
          .in("order_note_id", prevOrderIds);

        (prevItems || []).forEach((i: any) => {
          prevProductQty.set(i.product_id, (prevProductQty.get(i.product_id) || 0) + i.quantity);
        });
      }

      // Aggregate
      const productMap = new Map<string, { name: string; qty: number; value: number; lastDate: string | null }>();

      (items || []).forEach((item: any) => {
        const existing = productMap.get(item.product_id);
        if (existing) {
          existing.qty += item.quantity;
          existing.value += item.line_total_net || 0;
        } else {
          productMap.set(item.product_id, {
            name: item.product_name,
            qty: item.quantity,
            value: item.line_total_net || 0,
            lastDate: null,
          });
        }
      });

      // Get product images
      const productIds = [...productMap.keys()];
      let imagesMap = new Map<string, string[] | null>();

      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from("products")
          .select("id, images")
          .in("id", productIds);

        (products || []).forEach((p: any) => imagesMap.set(p.id, p.images));
      }

      return Array.from(productMap.entries())
        .map(([product_id, data]) => {
          const prevQty = prevProductQty.get(product_id) || 0;
          let trend: "up" | "down" | "stable" = "stable";
          if (data.qty > prevQty) trend = "up";
          else if (data.qty < prevQty) trend = "down";

          return {
            product_id,
            product_name: data.name,
            total_qty: data.qty,
            total_value: data.value,
            last_purchased_at: data.lastDate,
            images: imagesMap.get(product_id) || null,
            trend,
          };
        })
        .sort((a, b) => b.total_qty - a.total_qty)
        .slice(0, 10);
    },
    enabled: !!clientUserId && !!workspaceId,
  });
}
