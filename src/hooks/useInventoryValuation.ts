import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export interface InventoryValuationRow {
  product_id: string;
  product_name: string;
  sku: string | null;
  category: string | null;
  current_stock: number;
  fifo_avg_cost: number;
  total_cost_value: number;
  unit_sale_price: number;
  total_sale_value: number;
  latent_margin: number;
  latent_margin_pct: number;
}

export interface InventorySummary {
  total_products: number;
  total_units: number;
  total_cost_value: number;
  total_sale_value: number;
  total_latent_margin: number;
  avg_margin_pct: number;
  zero_stock_count: number;
  negative_margin_count: number;
}

export function useInventoryValuation() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  const rowsQuery = useQuery({
    queryKey: ["inventory-valuation", wsId],
    enabled: !!wsId,
    staleTime: 60_000,
    queryFn: async (): Promise<InventoryValuationRow[]> => {
      const { data, error } = await supabase.rpc("calculate_fifo_inventory_value", {
        _workspace_id: wsId,
      });
      if (error) throw error;
      return (data || []) as InventoryValuationRow[];
    },
  });

  const summaryQuery = useQuery({
    queryKey: ["inventory-summary", wsId],
    enabled: !!wsId,
    staleTime: 60_000,
    queryFn: async (): Promise<InventorySummary | null> => {
      const { data, error } = await supabase.rpc("get_workspace_inventory_summary", {
        _workspace_id: wsId,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row as InventorySummary) || null;
    },
  });

  return {
    rows: rowsQuery.data || [],
    summary: summaryQuery.data,
    isLoading: rowsQuery.isLoading || summaryQuery.isLoading,
    error: rowsQuery.error || summaryQuery.error,
    refetch: () => {
      rowsQuery.refetch();
      summaryQuery.refetch();
    },
  };
}

export function useProductValuation(productId: string | undefined) {
  const { rows, isLoading } = useInventoryValuation();
  const row = productId ? rows.find((r) => r.product_id === productId) : undefined;
  return { valuation: row, isLoading };
}
