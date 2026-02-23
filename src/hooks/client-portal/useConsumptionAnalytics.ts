import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { subMonths, startOfMonth, endOfMonth, format } from "date-fns";

export interface ConsumptionData {
  totalNet: number;
  totalGross: number;
  byCategory: { category: string; qty: number; value: number }[];
  byLine: { line: string; qty: number; value: number }[];
  monthly: { month: string; value: number; qty: number }[];
}

export type ConsumptionPeriod = "month" | "quarter" | "semester" | "year";

function getMonthsForPeriod(period: ConsumptionPeriod): number {
  switch (period) {
    case "month": return 1;
    case "quarter": return 3;
    case "semester": return 6;
    case "year": return 12;
  }
}

export function useConsumptionAnalytics(
  clientUserId: string | undefined,
  workspaceId: string | undefined,
  period: ConsumptionPeriod = "semester"
) {
  return useQuery({
    queryKey: ["consumption-analytics", clientUserId, workspaceId, period],
    queryFn: async (): Promise<ConsumptionData> => {
      if (!clientUserId || !workspaceId) {
        return { totalNet: 0, totalGross: 0, byCategory: [], byLine: [], monthly: [] };
      }

      const months = getMonthsForPeriod(period);
      const startDate = startOfMonth(subMonths(new Date(), months - 1)).toISOString();

      // Fetch invoiced orders for this client
      const { data: orders } = await supabase
        .from("order_notes")
        .select("id, total_net, total_gross, created_at")
        .eq("client_user_id", clientUserId)
        .eq("status", "invoiced")
        .gte("created_at", startDate);

      if (!orders || orders.length === 0) {
        return { totalNet: 0, totalGross: 0, byCategory: [], byLine: [], monthly: [] };
      }

      const orderIds = orders.map((o: any) => o.id);
      const totalNet = orders.reduce((s: number, o: any) => s + (o.total_net || 0), 0);
      const totalGross = orders.reduce((s: number, o: any) => s + (o.total_gross || 0), 0);

      // Fetch items with product details
      const { data: items } = await supabase
        .from("order_note_items")
        .select("product_id, product_name, quantity, line_total_net")
        .in("order_note_id", orderIds);

      // Get product categories and lines
      const productIds = [...new Set((items || []).map((i: any) => i.product_id).filter(Boolean))];
      let productsMap = new Map<string, { category: string | null; line: string | null }>();

      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from("products")
          .select("id, category, line")
          .in("id", productIds);

        (products || []).forEach((p: any) => productsMap.set(p.id, { category: p.category, line: p.line }));
      }

      // Aggregate by category
      const categoryMap = new Map<string, { qty: number; value: number }>();
      const lineMap = new Map<string, { qty: number; value: number }>();

      (items || []).forEach((item: any) => {
        const prod = productsMap.get(item.product_id);
        const cat = prod?.category || "Sem categoria";
        const line = prod?.line || "Sem linha";

        const catEntry = categoryMap.get(cat) || { qty: 0, value: 0 };
        catEntry.qty += item.quantity;
        catEntry.value += item.line_total_net || 0;
        categoryMap.set(cat, catEntry);

        const lineEntry = lineMap.get(line) || { qty: 0, value: 0 };
        lineEntry.qty += item.quantity;
        lineEntry.value += item.line_total_net || 0;
        lineMap.set(line, lineEntry);
      });

      // Monthly aggregation
      const monthlyMap = new Map<string, { value: number; qty: number }>();
      for (let i = months - 1; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        const key = format(d, "yyyy-MM");
        monthlyMap.set(key, { value: 0, qty: 0 });
      }

      orders.forEach((o: any) => {
        const key = format(new Date(o.created_at), "yyyy-MM");
        const entry = monthlyMap.get(key);
        if (entry) {
          entry.value += o.total_net || 0;
          entry.qty += 1;
        }
      });

      return {
        totalNet,
        totalGross,
        byCategory: Array.from(categoryMap.entries())
          .map(([category, data]) => ({ category, ...data }))
          .sort((a, b) => b.value - a.value),
        byLine: Array.from(lineMap.entries())
          .map(([line, data]) => ({ line, ...data }))
          .sort((a, b) => b.value - a.value),
        monthly: Array.from(monthlyMap.entries())
          .map(([month, data]) => ({ month: format(new Date(month + "-01"), "MMM yy"), ...data })),
      };
    },
    enabled: !!clientUserId && !!workspaceId,
  });
}
