import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ForecastRow {
  id: string;
  product_id: string;
  period_month: string;
  forecast_qty: number;
  confidence: number | null;
  drivers: any;
  product?: { id: string; name: string; sku: string | null; category: string | null };
}

export function useDemandForecast(workspaceId: string | undefined) {
  const { data: forecasts = [], isLoading } = useQuery({
    queryKey: ["demand-forecast", workspaceId],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("demand_forecast")
        .select("*, product:products(id, name, sku, category)")
        .eq("workspace_id", workspaceId)
        .order("period_month", { ascending: true });
      if (error) throw error;
      return (data || []) as ForecastRow[];
    },
    enabled: !!workspaceId,
  });

  return { forecasts, isLoading };
}
