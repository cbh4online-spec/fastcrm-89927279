/**
 * Copiloto de Conversão — cruza o funil real do AI Commerce com o catálogo.
 *
 * Todos os dados vêm do workspace atual (RLS). Se não houver eventos,
 * o copiloto reporta ausência de dados em vez de inventar métricas.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAICommerceProducts } from "@/hooks/useAICommerce";
import {
  analyzeConversionCopilot,
  type CopilotAnalysis,
  type CopilotFunnelStats,
  type CopilotProductInput,
} from "@/lib/ai-commerce/conversionCopilot";

const PURCHASE_TYPES = new Set([
  "purchase",
  "checkout_completed",
  "subscription_started",
  "subscription_renewed",
]);

export function useConversionCopilot(days = 30, targetMonthlyRevenue = 50000) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const products = useAICommerceProducts();

  const events = useQuery({
    queryKey: ["ai-commerce-copilot-events", workspaceId, days],
    enabled: !!workspaceId,
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const { data, error } = await supabase
        .from("ai_commerce_events")
        .select("event_type, product_id, value, server_verified")
        .eq("workspace_id", workspaceId!)
        .not("product_id", "is", null)
        .gte("created_at", since)
        .limit(20000);
      if (error) throw error;

      const map = new Map<string, CopilotFunnelStats>();
      for (const row of data || []) {
        const productId = row.product_id as string;
        if (!productId) continue;
        if (!map.has(productId)) {
          map.set(productId, { productId, views: 0, carts: 0, checkouts: 0, purchases: 0, revenue: 0 });
        }
        const entry = map.get(productId)!;
        const type = row.event_type as string;
        if (type === "product_view" || type === "product_click") entry.views += 1;
        else if (type === "add_to_cart") entry.carts += 1;
        else if (type === "checkout_start") entry.checkouts += 1;
        else if (PURCHASE_TYPES.has(type)) {
          entry.purchases += 1;
          if (row.server_verified) entry.revenue += Number(row.value || 0);
        }
      }
      return map;
    },
  });

  const relations = useQuery({
    queryKey: ["ai-commerce-copilot-relations", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_relations")
        .select("source_product_id")
        .eq("workspace_id", workspaceId!)
        .eq("is_active", true)
        .limit(10000);
      if (error) throw error;
      return new Set(
        ((data || []) as { source_product_id: string }[]).map((r) => r.source_product_id),
      );
    },
  });

  const analysis = useMemo<CopilotAnalysis>(() => {
    const funnel = events.data ?? new Map<string, CopilotFunnelStats>();
    const withRelations = relations.data ?? new Set<string>();
    const inputs: CopilotProductInput[] = (products.data || []).map((row) => ({
      id: row.product.id,
      name: row.product.name || "Sem nome",
      sku: row.product.sku,
      price: row.product.base_price,
      stockStatus: row.product.stock_status,
      storePublished: row.product.store_published,
      readinessScore: row.readiness.score,
      aiEnabled: !!row.ai?.ai_commerce_enabled,
      hasAccessories: withRelations.has(row.product.id),
    }));
    return analyzeConversionCopilot(inputs, funnel, { days, targetMonthlyRevenue });
  }, [products.data, events.data, relations.data, days, targetMonthlyRevenue]);

  return {
    analysis,
    isLoading: products.isLoading || events.isLoading,
    error: (events.error as Error | null) || (products.error as Error | null),
  };
}
