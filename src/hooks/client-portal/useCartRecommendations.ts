import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const sb = supabase as any;

export interface CartRecommendationProduct {
  id: string;
  name: string;
  sku: string | null;
  base_price: number;
  compare_at_price: number | null;
  promo_label: string | null;
  category: string | null;
  images: string[] | null;
  primary_image_index: number | null;
  vat_rate?: number;
}

export interface CartKit {
  id: string;
  name: string;
  description: string | null;
  discount_pct: number;
  products: CartRecommendationProduct[];
}

interface Params {
  workspaceId: string | undefined;
  cartProductIds: string[];
  cartCategories: string[];
  enabled?: boolean;
}

interface Settings {
  show_related: boolean;
  show_kit: boolean;
  show_promotions: boolean;
  show_best_sellers: boolean;
  free_shipping_threshold: number;
  related_mode: "category" | "manual" | "manual_first";
  kit_mode: "manual" | "auto" | "both";
  auto_kit_discount_pct: number;
}

const DEFAULT_SETTINGS: Settings = {
  show_related: true,
  show_kit: true,
  show_promotions: true,
  show_best_sellers: true,
  free_shipping_threshold: 150,
  related_mode: "manual_first",
  kit_mode: "manual",
  auto_kit_discount_pct: 5,
};

const SELECT =
  "id, name, sku, base_price, compare_at_price, promo_label, category, images, primary_image_index";

export interface CartRecommendationsResult {
  bestSellers: CartRecommendationProduct[];
  related: CartRecommendationProduct[];
  promotions: CartRecommendationProduct[];
  kits: CartKit[];
  settings: Settings;
}

export function useCartRecommendations({
  workspaceId,
  cartProductIds,
  cartCategories,
  enabled = true,
}: Params) {
  const idsKey = [...cartProductIds].sort().join(",");
  const catsKey = [...cartCategories].sort().join(",");

  return useQuery({
    queryKey: ["cart-recommendations", workspaceId, idsKey, catsKey],
    enabled: enabled && !!workspaceId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<CartRecommendationsResult> => {
      const empty: CartRecommendationsResult = {
        bestSellers: [],
        related: [],
        promotions: [],
        kits: [],
        settings: DEFAULT_SETTINGS,
      };
      if (!workspaceId) return empty;

      // 0. Carregar settings + manual rules + manual kits em paralelo --------
      const [settingsRes, manualRulesRes, manualKitsRes] = await Promise.all([
        sb.from("b2b_checkout_settings").select("*").eq("workspace_id", workspaceId).maybeSingle(),
        cartProductIds.length > 0
          ? sb
              .from("b2b_checkout_related_rules")
              .select("source_product_id, related_product_ids")
              .eq("workspace_id", workspaceId)
              .eq("is_active", true)
              .is("deleted_at", null)
              .in("source_product_id", cartProductIds)
          : Promise.resolve({ data: [] }),
        sb
          .from("b2b_checkout_kits")
          .select("*")
          .eq("workspace_id", workspaceId)
          .eq("is_active", true)
          .is("deleted_at", null)
          .order("display_order", { ascending: true }),
      ]);

      const settings: Settings = settingsRes?.data
        ? { ...DEFAULT_SETTINGS, ...settingsRes.data }
        : DEFAULT_SETTINGS;

      const excludeIds = cartProductIds.length > 0 ? cartProductIds : ["00000000-0000-0000-0000-000000000000"];

      // ---------------------------------------------------------------------
      // 1. RELATED: manual_first → manual + fallback categoria
      // ---------------------------------------------------------------------
      let manualRelatedIds: string[] = [];
      if (settings.show_related && settings.related_mode !== "category") {
        const ruleRows = (manualRulesRes?.data ?? []) as any[];
        const set = new Set<string>();
        for (const row of ruleRows) {
          for (const id of row.related_product_ids ?? []) {
            if (!cartProductIds.includes(id)) set.add(id);
          }
        }
        manualRelatedIds = [...set];
      }

      const useCategoryFallback =
        settings.show_related &&
        (settings.related_mode === "category" ||
          (settings.related_mode === "manual_first" && manualRelatedIds.length === 0));

      // 2. BEST SELLERS source
      let topSellerIds: string[] = [];
      if (settings.show_best_sellers) {
        const since = new Date();
        since.setDate(since.getDate() - 90);
        const { data: orderRows } = await sb
          .from("order_notes")
          .select("id")
          .eq("workspace_id", workspaceId)
          .gte("created_at", since.toISOString())
          .limit(500);
        const orderIds = (orderRows || []).map((o: any) => o.id);
        const sellerCounts = new Map<string, number>();
        if (orderIds.length > 0) {
          const { data: items } = await sb
            .from("order_note_items")
            .select("product_id, quantity")
            .in("order_note_id", orderIds);
          for (const it of (items || []) as any[]) {
            if (!it.product_id || cartProductIds.includes(it.product_id)) continue;
            sellerCounts.set(
              it.product_id,
              (sellerCounts.get(it.product_id) || 0) + (Number(it.quantity) || 0),
            );
          }
        }
        topSellerIds = [...sellerCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([id]) => id);
      }

      // 3. Manual kits products to fetch
      const allKits = (manualKitsRes?.data ?? []) as any[];
      const manualKits = allKits.filter((k) => {
        if (settings.kit_mode === "auto") return false;
        const trig = k.trigger_product_ids ?? [];
        if (trig.length === 0) return true;
        return trig.some((id: string) => cartProductIds.includes(id));
      });
      const kitProductIds = new Set<string>();
      manualKits.forEach((k) => (k.product_ids ?? []).forEach((id: string) => kitProductIds.add(id)));

      // ---------------------------------------------------------------------
      // 4. Fetch all product details em paralelo ----------------------------
      // ---------------------------------------------------------------------
      const [bestSellersQ, relatedManualQ, relatedCategoryQ, promosQ, kitProductsQ] = await Promise.all([
        topSellerIds.length > 0
          ? sb.from("products").select(SELECT).eq("workspace_id", workspaceId).eq("status", "active").eq("b2b_published", true).in("id", topSellerIds)
          : Promise.resolve({ data: [] }),
        manualRelatedIds.length > 0
          ? sb.from("products").select(SELECT).eq("workspace_id", workspaceId).eq("status", "active").eq("b2b_published", true).in("id", manualRelatedIds)
          : Promise.resolve({ data: [] }),
        useCategoryFallback && cartCategories.length > 0
          ? sb
              .from("products")
              .select(SELECT)
              .eq("workspace_id", workspaceId)
              .eq("status", "active")
              .eq("b2b_published", true)
              .in("category", cartCategories)
              .not("id", "in", `(${excludeIds.join(",")})`)
              .limit(8)
          : Promise.resolve({ data: [] }),
        settings.show_promotions
          ? sb
              .from("products")
              .select(SELECT)
              .eq("workspace_id", workspaceId)
              .eq("status", "active")
              .eq("b2b_published", true)
              .or("compare_at_price.gt.0,promo_label.not.is.null")
              .not("id", "in", `(${excludeIds.join(",")})`)
              .limit(12)
          : Promise.resolve({ data: [] }),
        kitProductIds.size > 0
          ? sb.from("products").select(SELECT).eq("workspace_id", workspaceId).in("id", [...kitProductIds])
          : Promise.resolve({ data: [] }),
      ]);

      const normalize = (rows: any[]): CartRecommendationProduct[] =>
        (rows || []).map((p) => ({
          ...p,
          images: Array.isArray(p.images) ? p.images : null,
        }));

      // Best sellers reorder by volume
      const sellersById = new Map<string, CartRecommendationProduct>();
      normalize(bestSellersQ.data || []).forEach((p) => sellersById.set(p.id, p));
      const bestSellers = topSellerIds
        .map((id) => sellersById.get(id))
        .filter(Boolean) as CartRecommendationProduct[];

      // Promotions
      const promotions = normalize(promosQ.data || [])
        .filter((p) => {
          const hasPriceCut =
            p.compare_at_price != null && Number(p.compare_at_price) > Number(p.base_price);
          const hasLabel = !!(p.promo_label && p.promo_label.trim());
          return hasPriceCut || hasLabel;
        })
        .slice(0, 6);

      // Related: combinar manual + categoria (manual primeiro), dedupe
      const relatedManual = normalize(relatedManualQ.data || []);
      const relatedCategory = normalize(relatedCategoryQ.data || []);
      const seenRelated = new Set<string>();
      const related: CartRecommendationProduct[] = [];
      for (const p of [...relatedManual, ...relatedCategory]) {
        if (seenRelated.has(p.id) || cartProductIds.includes(p.id)) continue;
        seenRelated.add(p.id);
        related.push(p);
        if (related.length >= 6) break;
      }

      // Kits: manuais + (opcional) auto fallback a partir de related
      const kitProductsById = new Map<string, CartRecommendationProduct>();
      normalize(kitProductsQ.data || []).forEach((p) => kitProductsById.set(p.id, p));

      const kits: CartKit[] = [];
      if (settings.show_kit) {
        for (const k of manualKits) {
          const products = (k.product_ids ?? [])
            .map((id: string) => kitProductsById.get(id))
            .filter(Boolean) as CartRecommendationProduct[];
          if (products.length >= 2) {
            kits.push({
              id: k.id,
              name: k.name,
              description: k.description,
              discount_pct: Number(k.discount_pct) || 0,
              products,
            });
          }
        }
        const allowAuto =
          settings.kit_mode === "auto" ||
          (settings.kit_mode === "both" && kits.length === 0);
        if (allowAuto && related.length >= 3) {
          kits.push({
            id: "auto-kit",
            name: "Kit poupança",
            description: null,
            discount_pct: settings.auto_kit_discount_pct,
            products: related.slice(0, 3),
          });
        }
      }

      return {
        bestSellers,
        related,
        promotions,
        kits,
        settings,
      };
    },
  });
}
