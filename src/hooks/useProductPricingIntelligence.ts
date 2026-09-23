import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { triggerNoCreditsDialog } from "@/hooks/useNoCreditsDialog";


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
  /** Custo operacional sugerido (% do preço líquido) — usado como pré-preenchimento ao criar produtos */
  default_operational_cost_pct: number | null;
  is_active: boolean;
}

/**
 * Resolve o custo operacional sugerido a partir das regras (categoria > global).
 * Devolve null se não houver nenhuma regra com valor definido.
 */
export function resolveSuggestedOperationalCostPct(
  rules: PricingRule[],
  category?: string | null
): number | null {
  const categoryRule = category
    ? rules.find((r) => r.applies_to === "category" && r.category === category && r.is_active)
    : null;
  if (categoryRule?.default_operational_cost_pct != null) return categoryRule.default_operational_cost_pct;
  const globalRule = rules.find((r) => r.applies_to === "all" && r.is_active);
  if (globalRule?.default_operational_cost_pct != null) return globalRule.default_operational_cost_pct;
  return null;
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

export interface MarketCompetitor {
  name: string;
  price: number;
  url?: string;
  vat_included?: boolean | null;
  collected_at?: string;
}

export interface MarketResearchResult {
  success: boolean;
  /** true apenas quando existem preços reais extraídos de fontes verificáveis */
  grounded?: boolean;
  market_avg_price?: number;
  market_min_price?: number;
  market_max_price?: number;
  suggested_price?: number;
  suggested_margin_pct?: number;
  /** true quando acompanhar o concorrente mais barato violaria a margem mínima */
  margin_blocked?: boolean;
  min_margin_pct?: number;
  competitors?: MarketCompetitor[];
  sources?: string[];
  market_summary?: string;
  price_position?: "below_market" | "at_market" | "above_market";
  credits_consumed?: number;
  credits_balance?: number;
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
      brand?: string;
      category?: string;
      barcode?: string;
      cost_price?: number;
      min_margin_pct?: number;
    }) => {
      const { data, error } = await supabase.functions.invoke("ai-market-price-research", {
        body: params,
      });
      if (error) {
        // Créditos insuficientes chegam como erro HTTP 402 com corpo próprio
        const ctx = (error as any)?.context;
        const body = typeof ctx?.body === "string" ? safeParse(ctx.body) : ctx?.body;
        if (body?.code === "insufficient_credits") {
          triggerNoCreditsDialog({ actionLabel: "Pesquisa de preços de mercado", creditsNeeded: 1 });
          throw new Error(body.error || "Créditos insuficientes.");
        }
        throw error;
      }
      if (data?.code === "insufficient_credits") {
        triggerNoCreditsDialog({ actionLabel: "Pesquisa de preços de mercado", creditsNeeded: 1 });
        throw new Error(data.error || "Créditos insuficientes.");
      }
      if (data?.error) throw new Error(data.error);
      return data as MarketResearchResult;
    },
    onSuccess: (result, vars) => {
      qc.invalidateQueries({ queryKey: ["market-research", vars.product_id] });
      qc.invalidateQueries({ queryKey: ["credit-wallet"] });
      qc.invalidateQueries({ queryKey: ["credit-ledger"] });
      if (result?.grounded === false) {
        toast.info("Nenhum concorrente encontrado com esta referência. Nada foi estimado.");
      } else {
        toast.success("Preços de concorrentes reais recolhidos");
      }
    },
    onError: (e: Error) => {
      toast.error(e.message || "Erro na pesquisa de preços");
    },
  });
}

function safeParse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
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
