import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { ProductUsageStats, ProductAlert, Product } from "@/types/product";

export function useProductStats(productId: string | undefined) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["product-stats", productId],
    queryFn: async () => {
      if (!productId || !currentWorkspace?.id) return null;

      const { data, error } = await supabase
        .from("product_usage_stats")
        .select("*")
        .eq("product_id", productId)
        .eq("workspace_id", currentWorkspace.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as ProductUsageStats | null;
    },
    enabled: !!productId && !!currentWorkspace?.id,
  });
}

export function useProductProposals(productId: string | undefined) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["product-proposals", productId],
    queryFn: async () => {
      if (!productId || !currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from("proposal_items")
        .select(`
          id,
          unit_price,
          quantity,
          total_price,
          cost_snapshot,
          commission_pct_snapshot,
          created_at,
          proposal:proposals(
            id,
            title,
            status,
            views_count,
            created_at,
            opportunity:opportunities(
              id,
              title,
              lead:leads(id, name, company_name)
            )
          )
        `)
        .eq("product_id", productId)
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!productId && !!currentWorkspace?.id,
  });
}

export function useProductOpportunities(productId: string | undefined) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["product-opportunities", productId],
    queryFn: async () => {
      if (!productId || !currentWorkspace?.id) return [];

      // Get opportunities through proposal_items -> proposals -> opportunities
      const { data, error } = await supabase
        .from("proposal_items")
        .select(`
          proposal:proposals!inner(
            opportunity:opportunities(
              id,
              title,
              value,
              probability,
              stage,
              created_at,
              lead:leads(id, name, company_name),
              assigned_to
            )
          )
        `)
        .eq("product_id", productId)
        .eq("workspace_id", currentWorkspace.id);

      if (error) throw error;

      // Extract unique opportunities
      const opportunities = data
        ?.map((item: any) => item.proposal?.opportunity)
        .filter(Boolean)
        .filter(
          (opp: any, index: number, self: any[]) =>
            self.findIndex((o) => o.id === opp.id) === index
        );

      return opportunities || [];
    },
    enabled: !!productId && !!currentWorkspace?.id,
  });
}

export function generateProductAlerts(
  product: Product,
  stats?: ProductUsageStats | null
): ProductAlert[] {
  const alerts: ProductAlert[] = [];
  const directCost = product.direct_cost ?? 0;
  const operationalCost = product.operational_cost ?? 0;
  const basePrice = product.base_price;

  const grossMarginPct =
    basePrice > 0 ? ((basePrice - directCost) / basePrice) * 100 : 0;
  const targetMargin = product.target_margin_pct;

  // Margem negativa
  if (grossMarginPct < 0) {
    alerts.push({
      type: "negative_margin",
      severity: "error",
      title: "Margem negativa",
      message: `Este produto tem margem negativa (${grossMarginPct.toFixed(1)}%). Revê o preço ou custo.`,
      productId: product.id,
    });
  }
  // Margem abaixo da meta
  else if (targetMargin && grossMarginPct < targetMargin) {
    alerts.push({
      type: "below_target",
      severity: "warning",
      title: "Margem abaixo da meta",
      message: `A margem atual (${grossMarginPct.toFixed(1)}%) está abaixo da meta definida (${targetMargin}%).`,
      productId: product.id,
    });
  }

  // Produto parado (sem vendas há mais de 60 dias)
  if (stats) {
    const lastSale = stats.last_sale_at ? new Date(stats.last_sale_at) : null;
    const daysSinceLastSale = lastSale
      ? Math.floor((Date.now() - lastSale.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    if (stats.total_sales > 0 && daysSinceLastSale && daysSinceLastSale > 60) {
      alerts.push({
        type: "no_sales",
        severity: "info",
        title: "Produto parado",
        message: `Sem vendas há ${daysSinceLastSale} dias. Considera reativar campanhas ou rever o produto.`,
        productId: product.id,
      });
    }

    // Alto volume mas baixa margem
    if (stats.sales_30d >= 5 && grossMarginPct > 0 && grossMarginPct < 15) {
      alerts.push({
        type: "high_volume_low_margin",
        severity: "warning",
        title: "Muito vendido, baixa margem",
        message: `Este produto vende bem (${stats.sales_30d} vendas/30d), mas a margem está baixa. Queres rever o preço ou custo?`,
        productId: product.id,
      });
    }
  }

  return alerts;
}
