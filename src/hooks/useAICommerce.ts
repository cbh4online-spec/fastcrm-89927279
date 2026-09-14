/**
 * Hooks da camada AI Commerce — leitura/escrita dos metadados por produto,
 * readiness agregado, feeds e analytics por canal.
 */
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { evaluateReadiness } from "@/lib/ai-commerce/readiness";
import type {
  CommerceFeed,
  CommerceFeedRun,
  CommerceProduct,
  CommerceVariant,
  ProductAICommerce,
  ReadinessConfigOverride,
  ReadinessResult,
} from "@/lib/ai-commerce/types";

const PRODUCT_FIELDS =
  "id, workspace_id, name, sku, brand, manufacturer, gtin, mpn, store_slug, category, subcategory, product_type, schema_type, short_description, commercial_description, base_price, compare_at_price, currency, tax_included, tax_class, activation_fee, setup_fee, recurring_fee, billing_type, billing_frequency, stock_status, status, store_published, images, primary_image_index, seo_title, seo_description, canonical_url, checkout_url, target_audience, problem_solved, use_cases, main_benefits, benefits, features, countries, languages, product_condition, origin_country";

export interface AICommerceProductRow {
  product: CommerceProduct;
  ai: Partial<ProductAICommerce> | null;
  readiness: ReadinessResult;
}

/** Lista de produtos com o respetivo estado de AI Commerce e readiness calculado. */
export function useAICommerceProducts() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  const query = useQuery({
    queryKey: ["ai-commerce-products", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const [productsRes, aiRes, feedsRes, configRes] = await Promise.all([
        supabase
          .from("products")
          .select(PRODUCT_FIELDS)
          .eq("workspace_id", workspaceId!)
          .neq("status", "archived")
          .order("name"),
        supabase.from("product_ai_commerce").select("*").eq("workspace_id", workspaceId!),
        supabase.from("commerce_feeds").select("id").eq("workspace_id", workspaceId!).eq("is_active", true),
        supabase
          .from("ai_commerce_readiness_config")
          .select("code, weight, severity, enabled")
          .eq("workspace_id", workspaceId!),
      ]);

      if (productsRes.error) throw productsRes.error;
      if (aiRes.error) throw aiRes.error;

      const products = (productsRes.data || []) as unknown as CommerceProduct[];

      // Variantes ativas (preço/subscrição) — nunca inventadas.
      let variantsByProduct = new Map<string, CommerceVariant[]>();
      if (products.length) {
        const { data: variants } = await supabase
          .from("product_variants")
          .select("id, product_id, name, sku, price_override, stock_quantity, is_active, attributes")
          .in(
            "product_id",
            products.map((p) => p.id),
          );
        variantsByProduct = ((variants || []) as unknown as (CommerceVariant & { product_id: string })[]).reduce(
          (acc, v) => {
            const list = acc.get(v.product_id) || [];
            list.push(v);
            acc.set(v.product_id, list);
            return acc;
          },
          new Map<string, CommerceVariant[]>(),
        );
      }

      const activeFeeds = feedsRes.data?.length ?? 0;
      const overrides = (configRes.data || []) as unknown as ReadinessConfigOverride[];
      const aiMap = new Map(
        ((aiRes.data || []) as unknown as ProductAICommerce[]).map((r) => [r.product_id, r]),
      );

      return products.map<AICommerceProductRow>((row) => {
        const product = { ...row, variants: variantsByProduct.get(row.id) ?? [] };
        const ai = aiMap.get(product.id) ?? null;
        return {
          product,
          ai,
          readiness: evaluateReadiness(product, ai, { activeFeeds, overrides }),
        };
      });
    },
  });

  return query;
}

/** Configuração de readiness por workspace (pesos, severidade, critérios ativos). */
export function useReadinessConfig() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["ai-commerce-readiness-config", workspaceId],
    enabled: !!workspaceId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_commerce_readiness_config")
        .select("code, weight, severity, enabled")
        .eq("workspace_id", workspaceId!);
      if (error) throw error;
      return (data || []) as unknown as ReadinessConfigOverride[];
    },
  });

  const save = useMutation({
    mutationFn: async (override: ReadinessConfigOverride) => {
      if (!workspaceId) throw new Error("Workspace indisponível");
      const { error } = await supabase
        .from("ai_commerce_readiness_config")
        .upsert({ ...override, workspace_id: workspaceId } as never, { onConflict: "workspace_id,code" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-commerce-readiness-config", workspaceId] });
      qc.invalidateQueries({ queryKey: ["ai-commerce-products"] });
      toast.success("Critério atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { ...query, save };
}

export interface AICommerceOverview {
  totalProducts: number;
  aiEnabled: number;
  aiReady: number;
  withErrors: number;
  incomplete: number;
  activeChannels: number;
  activeFeeds: number;
  avgScore: number;
}

export function useAICommerceOverview() {
  const products = useAICommerceProducts();
  const feeds = useCommerceFeeds();

  const overview = useMemo<AICommerceOverview>(() => {
    const rows = products.data || [];
    const enabled = rows.filter((r) => r.ai?.ai_commerce_enabled);
    const ready = enabled.filter((r) => r.readiness.isReady);
    const withErrors = enabled.filter((r) => r.readiness.issues.some((i) => i.severity === "error"));
    const incomplete = enabled.filter(
      (r) => !r.readiness.isReady || r.readiness.issues.some((i) => i.severity === "warning"),
    );
    const activeFeeds = (feeds.data || []).filter((f) => f.is_active);
    const avgScore = enabled.length
      ? Math.round(enabled.reduce((s, r) => s + r.readiness.score, 0) / enabled.length)
      : 0;

    return {
      totalProducts: rows.length,
      aiEnabled: enabled.length,
      aiReady: ready.length,
      withErrors: withErrors.length,
      incomplete: incomplete.length,
      activeChannels: new Set(activeFeeds.map((f) => f.channel)).size,
      activeFeeds: activeFeeds.length,
      avgScore,
    };
  }, [products.data, feeds.data]);

  return { overview, isLoading: products.isLoading || feeds.isLoading };
}

/** Metadados AI Commerce de um produto específico. */
export function useProductAICommerce(productId: string | undefined) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["product-ai-commerce", currentWorkspace?.id, productId],
    enabled: !!productId && !!currentWorkspace?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_ai_commerce")
        .select("*")
        .eq("product_id", productId!)
        .eq("workspace_id", currentWorkspace!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as ProductAICommerce) ?? null;
    },
  });
}

export function useSaveProductAICommerce(productId: string | undefined) {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (patch: Partial<ProductAICommerce> & { readiness?: ReadinessResult }) => {
      if (!productId || !currentWorkspace?.id) throw new Error("Produto ou workspace indisponível");
      const { readiness, ...fields } = patch;
      const payload: Record<string, unknown> = {
        workspace_id: currentWorkspace.id,
        product_id: productId,
        ...fields,
      };
      if (readiness) {
        payload.ai_readiness_score = readiness.score;
        payload.ai_readiness_issues = readiness.issues;
        payload.ai_last_validation = new Date().toISOString();
      }
      const { data, error } = await supabase
        .from("product_ai_commerce")
        .upsert(payload as never, { onConflict: "product_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-ai-commerce", currentWorkspace?.id, productId] });
      qc.invalidateQueries({ queryKey: ["ai-commerce-products"] });
      toast.success("AI Commerce atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Atualiza campos comerciais do produto (usado pelos CTA "Corrigir"). */
export function useUpdateCommerceProduct(productId: string | undefined) {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (patch: Partial<CommerceProduct>) => {
      if (!productId) throw new Error("Produto indisponível");
      if (!currentWorkspace?.id) throw new Error("Workspace indisponível");
      const { error } = await supabase
        .from("products")
        .update(patch as never)
        .eq("id", productId)
        .eq("workspace_id", currentWorkspace.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-commerce-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produto atualizado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ---------------------------------------------------------------- Feeds

export function useCommerceFeeds() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["commerce-feeds", currentWorkspace?.id],
    enabled: !!currentWorkspace?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commerce_feeds")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as CommerceFeed[];
    },
  });
}

export function useCreateCommerceFeed() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (feed: Pick<CommerceFeed, "name" | "channel" | "format"> & Partial<CommerceFeed>) => {
      if (!currentWorkspace?.id) throw new Error("Workspace indisponível");
      const { data, error } = await supabase
        .from("commerce_feeds")
        .insert({ ...feed, workspace_id: currentWorkspace.id } as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commerce-feeds"] });
      toast.success("Feed criado");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateCommerceFeed() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<CommerceFeed> & { id: string }) => {
      if (!currentWorkspace?.id) throw new Error("Workspace indisponível");
      const { error } = await supabase
        .from("commerce_feeds")
        .update(patch as never)
        .eq("id", id)
        .eq("workspace_id", currentWorkspace.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commerce-feeds"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteCommerceFeed() {
  const qc = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!currentWorkspace?.id) throw new Error("Workspace indisponível");
      const { error } = await supabase
        .from("commerce_feeds")
        .delete()
        .eq("id", id)
        .eq("workspace_id", currentWorkspace.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["commerce-feeds"] });
      toast.success("Feed removido");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCommerceFeedRuns(feedId?: string) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["commerce-feed-runs", currentWorkspace?.id, feedId ?? "all"],
    enabled: !!currentWorkspace?.id,
    queryFn: async () => {
      let q = supabase
        .from("commerce_feed_runs")
        .select("*")
        .eq("workspace_id", currentWorkspace!.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (feedId) q = q.eq("feed_id", feedId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as CommerceFeedRun[];
    },
  });
}

/** URL pública do feed (Commerce API). */
export function feedPublicUrl(token: string): string {
  const base = import.meta.env.VITE_SUPABASE_URL;
  return `${base}/functions/v1/commerce-api/feed?token=${token}`;
}

export function commerceApiBaseUrl(): string {
  return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/commerce-api`;
}

// ---------------------------------------------------------------- Analytics

export interface ChannelPerformanceRow {
  channel: string;
  isAi: boolean;
  visits: number;
  productViews: number;
  leads: number;
  carts: number;
  checkouts: number;
  purchases: number;
  revenue: number;
  conversionRate: number;
}

export interface AICommerceAnalyticsFilters {
  days: number;
  productId?: string | null;
  country?: string | null;
  channel?: string | null;
  campaign?: string | null;
}

export function useAICommerceAnalytics(filters: AICommerceAnalyticsFilters) {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["ai-commerce-analytics", currentWorkspace?.id, filters],
    enabled: !!currentWorkspace?.id,
    queryFn: async () => {
      const since = new Date(Date.now() - filters.days * 86400000).toISOString();
      let q = supabase
        .from("ai_commerce_events")
        .select("event_type, channel, is_ai_channel, value, currency, product_id, country, campaign")
        .eq("workspace_id", currentWorkspace!.id)
        .gte("created_at", since)
        .limit(10000);
      if (filters.productId) q = q.eq("product_id", filters.productId);
      if (filters.country) q = q.eq("country", filters.country);
      if (filters.channel) q = q.eq("channel", filters.channel);
      if (filters.campaign) q = q.eq("campaign", filters.campaign);

      const { data, error } = await q;
      if (error) throw error;

      const map = new Map<string, ChannelPerformanceRow>();
      for (const row of data || []) {
        const channel = (row.channel as string) || "direct";
        if (!map.has(channel)) {
          map.set(channel, {
            channel,
            isAi: !!row.is_ai_channel,
            visits: 0,
            productViews: 0,
            leads: 0,
            carts: 0,
            checkouts: 0,
            purchases: 0,
            revenue: 0,
            conversionRate: 0,
          });
        }
        const entry = map.get(channel)!;
        entry.isAi = entry.isAi || !!row.is_ai_channel;
        switch (row.event_type) {
          case "visit":
            entry.visits += 1;
            break;
          case "product_view":
            entry.productViews += 1;
            break;
          case "lead":
            entry.leads += 1;
            break;
          case "add_to_cart":
            entry.carts += 1;
            break;
          case "checkout_start":
            entry.checkouts += 1;
            break;
          case "purchase":
            entry.purchases += 1;
            entry.revenue += Number(row.value || 0);
            break;
        }
      }

      const rows = Array.from(map.values()).map((r) => ({
        ...r,
        conversionRate: r.visits > 0 ? (r.purchases / r.visits) * 100 : 0,
      }));
      rows.sort((a, b) => b.revenue - a.revenue || b.visits - a.visits);
      return rows;
    },
  });
}
