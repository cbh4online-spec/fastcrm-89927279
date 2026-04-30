import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

const sb = supabase as any;

export interface PricingRule {
  id: string;
  workspace_id: string;
  category: string | null;
  product_id: string | null;
  applies_to: "all" | "category" | "product";
  min_margin_pct: number;
  target_margin_pct: number | null;
  max_margin_pct: number | null;
  is_active: boolean;
}

export interface MarketResearch {
  id: string;
  product_id: string;
  market_avg_price: number | null;
  market_min_price: number | null;
  market_max_price: number | null;
  competitors_json: Array<{ name: string; price: number; url?: string }>;
  suggested_price: number | null;
  suggested_margin_pct: number | null;
  research_date: string;
  model_used: string | null;
}

export interface MarketResearchResult {
  success: boolean;
  market_avg_price?: number;
  market_min_price?: number;
  market_max_price?: number;
  suggested_price?: number;
  suggested_margin_pct?: number;
  competitors?: Array<{ name: string; price: number; url?: string }>;
  market_summary?: string;
  price_position?: "below_market" | "at_market" | "above_market";
  error?: string;
}

// ---- Pricing Rules ----

export function usePricingRules() {
  const { currentWorkspace } = useWorkspace();
  const wsId = currentWorkspace?.id;

  return useQuery({
    queryKey: ["pricing-rules", wsId],
    queryFn: async () => {
      if (!wsId) return [];
      const { data, error } = await sb
        .from("product_pricing_rules")
        .select("*")
        .eq("workspace_id", wsId)
        .eq("is_active", true)
        .order("applies_to", { ascending: true });
      if (error) throw error;
      return (data || []) as PricingRule[];
    },
    enabled: !!wsId,
  });
}

export function useUpsertPricingRule() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (rule: Partial<PricingRule> & { id?: string }) => {
      const wsId = currentWorkspace?.id;
      if (!wsId) throw new Error("No workspace");
      const payload = { ...rule, workspace_id: wsId, updated_at: new Date().toISOString() };

      if (rule.id) {
        const { data, error } = await sb
          .from("product_pricing_rules")
          .update(payload)
          .eq("id", rule.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await sb
          .from("product_pricing_rules")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pricing-rules"] });
      toast.success("Regra de margem guardada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ---- Market Research ----

export function useMarketResearchHistory(productId: string | undefined) {
  return useQuery({
    queryKey: ["market-research", productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await sb
        .from("product_market_research")
        .select("*")
        .eq("product_id", productId)
        .order("research_date", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data || []) as MarketResearch[];
    },
    enabled: !!productId,
  });
}

export function useRunMarketResearch() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      product_id: string;
      workspace_id: string;
      product_name: string;
      sku?: string;
      category?: string;
      barcode?: string;
      cost_price?: number;
    }) => {
      const { data, error } = await supabase.functions.invoke("ai-market-price-research", {
        body: params,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as MarketResearchResult;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["market-research", vars.product_id] });
      toast.success("Análise de mercado concluída");
    },
    onError: (e: Error) => {
      toast.error(e.message || "Erro na análise de mercado");
    },
  });
}

// ---- Helpers ----

/**
 * Calcula o estado da margem.
 * IMPORTANTE: `price` deve ser o preço **líquido (sem IVA)** — usar `getNetPrice()` antes.
 * `currentMargin` é a margem comercial (% sobre o preço de venda), consistente com a coluna "Margem".
 */
export function getMarginStatus(
  price: number | null | undefined,
  cost: number | null | undefined,
  rules: PricingRule[],
  category?: string | null
): { status: "healthy" | "warning" | "danger" | "unknown"; minMargin: number; currentMargin: number | null } {
  if (!price || !cost || cost <= 0 || price <= 0) return { status: "unknown", minMargin: 0, currentMargin: null };

  // Margem comercial sobre preço líquido (consistente em todo o sistema)
  const currentMargin = ((price - cost) / price) * 100;

  // Find applicable rule
  const productRule = rules.find((r) => r.applies_to === "all");
  const categoryRule = category
    ? rules.find((r) => r.applies_to === "category" && r.category === category)
    : null;

  const rule = categoryRule || productRule;
  const minMargin = rule?.min_margin_pct ?? 10;

  if (currentMargin < 0) return { status: "danger", minMargin, currentMargin };
  if (currentMargin < minMargin) return { status: "warning", minMargin, currentMargin };
  return { status: "healthy", minMargin, currentMargin };
}

export function calculateMinPrice(cost: number, minMarginPct: number): number {
  return Math.ceil(cost * (1 + minMarginPct / 100) * 100) / 100;
}
