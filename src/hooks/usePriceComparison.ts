import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PriceHistoryPoint {
  price: number;
  compare_at_price: number | null;
  recorded_at: string;
}

export function usePriceHistory(productId: string | undefined) {
  return useQuery({
    queryKey: ["price-history", productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from("product_price_history")
        .select("price, compare_at_price, recorded_at")
        .eq("product_id", productId)
        .order("recorded_at", { ascending: true })
        .limit(100);
      if (error) throw error;
      return (data || []) as PriceHistoryPoint[];
    },
    enabled: !!productId,
  });
}

export function usePriceComparison(productId: string | undefined, category: string | undefined, workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["price-comparison", productId, category],
    queryFn: async () => {
      if (!productId || !category || !workspaceId) return [];
      const { data, error } = await supabase
        .from("products")
        .select("id, name, base_price, images, currency, store_published")
        .eq("workspace_id", workspaceId)
        .eq("category", category)
        .eq("store_published", true)
        .neq("id", productId)
        .order("base_price", { ascending: true })
        .limit(6);
      if (error) throw error;
      return data || [];
    },
    enabled: !!productId && !!category && !!workspaceId,
  });
}

export interface ExternalPrice {
  id: string;
  source_name: string;
  source_url: string;
  price: number;
  currency: string;
  fetched_at: string;
}

export function useExternalPrices(productId: string | undefined) {
  return useQuery({
    queryKey: ["external-prices", productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from("product_external_prices")
        .select("*")
        .eq("product_id", productId)
        .gte("expires_at", new Date().toISOString())
        .order("price", { ascending: true });
      if (error) throw error;
      return (data || []) as ExternalPrice[];
    },
    enabled: !!productId,
  });
}

export function useFetchExternalPrices(productId: string | undefined) {
  return useQuery({
    queryKey: ["fetch-external-prices", productId],
    queryFn: async () => {
      if (!productId) return null;
      const { data, error } = await supabase.functions.invoke("compare-prices", {
        body: { productId },
      });
      if (error) throw error;
      return data;
    },
    enabled: false, // Manual trigger only
  });
}
