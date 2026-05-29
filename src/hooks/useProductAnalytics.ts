import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProductAnalyticsSummary {
  top_in_proposals: Array<{
    product_id: string;
    name: string;
    count: number;
    total_value: number;
    total_qty: number;
  }>;
  conversion_rates: Array<{
    product_id: string;
    name: string;
    proposals_count: number;
    invoices_count: number;
    conversion_rate: number;
  }>;
  avg_margins: Array<{
    product_id: string;
    name: string;
    category: string | null;
    cost: number;
    avg_sell_price: number;
    base_price: number;
    margin_pct: number;
    units_sold: number;
  }>;
  price_trends: Array<{
    product_id: string;
    name: string;
    cost: number;
    trend: Array<{ month: string; avg_price: number; volume: number }>;
  }>;
  inactive_products: Array<{
    product_id: string;
    name: string;
    sku: string | null;
    category: string | null;
    base_price: number;
    stock_quantity: number;
    last_activity: string;
    days_inactive: number;
  }>;
  top_by_category: Array<{
    category: string;
    total_revenue: number;
    products: Array<{ id: string; name: string; revenue: number }>;
  }>;
  computed_at: string;
}

export interface SingleProductAnalytics {
  product_id: string;
  name: string;
  category: string | null;
  proposals_count: number;
  invoices_count: number;
  conversion_rate: number;
  total_qty_sold: number;
  total_revenue: number;
  avg_sell_price: number;
  cost: number;
  margin_pct: number;
  stock_movements_count: number;
  monthly_trend: Array<{ month: string; revenue: number; qty: number; proposals: number }>;
}

async function fetchAnalytics(workspaceId: string, productId?: string, daysInactive?: number) {
  const { data, error } = await supabase.functions.invoke("compute-product-analytics", {
    body: {
      workspace_id: workspaceId,
      product_id: productId,
      days_inactive: daysInactive ?? 90,
    },
  });
  if (error) throw new Error(error.message || "Erro ao calcular analytics");
  if (data?.error) throw new Error(data.error);
  return data as any;
}


export function useProductAnalytics(workspaceId: string | undefined, daysInactive = 90) {
  return useQuery<ProductAnalyticsSummary>({
    queryKey: ["product-analytics", workspaceId, daysInactive],
    queryFn: () => fetchAnalytics(workspaceId!, undefined, daysInactive),
    enabled: !!workspaceId,
    staleTime: 1000 * 60 * 15,
  });
}

export function useSingleProductAnalytics(workspaceId: string | undefined, productId: string | undefined) {
  return useQuery<SingleProductAnalytics>({
    queryKey: ["product-analytics-single", workspaceId, productId],
    queryFn: () => fetchAnalytics(workspaceId!, productId),
    enabled: !!workspaceId && !!productId,
    staleTime: 1000 * 60 * 15,
  });
}
