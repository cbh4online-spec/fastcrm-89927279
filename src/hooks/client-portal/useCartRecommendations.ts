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

      // 0. Settings + manual cross-sells + kits B2B em paralelo --------------
      const [settingsRes, crossSellsRes, kitsRes] = await Promise.all([
        sb.from("b2b_checkout_settings").select("*").eq("workspace_id", workspaceId).maybeSingle(),
        cartProductIds.length > 0
          ? sb
              .from("product_cross_sells")
              .select("source_product_id, target_product_id, weight")
              .eq("workspace_id", workspaceId)
              .eq("is_active", true)
              .in("source_product_id", cartProductIds)
          : Promise.resolve({ data: [] }),
        sb
          .from("product_kits")
          .select("id, name, description, discount_pct, status, visibility_b2b")
          .eq("workspace_id", workspaceId)
          .eq("visibility_b2b", true)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      const settings: Settings = settingsRes?.data
        ? { ...DEFAULT_SETTINGS, ...settingsRes.data }
        : DEFAULT_SETTINGS;

      const excludeIds = cartProductIds.length > 0 ? cartProductIds : ["00000000-0000-0000-0000-000000000000"];

      // 1. RELATED — manuais (cross-sells) ordenados por weight desc
      let manualRelatedIds: string[] = [];
      if (settings.show_related && settings.related_mode !== "category") {
        const rows = ((crossSellsRes?.data ?? []) as any[])
          .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));
        const seen = new Set<string>();
        for (const r of rows) {
          if (!cartProductIds.includes(r.target_product_id) && !seen.has(r.target_product_id)) {
            seen.add(r.target_product_id);
            manualRelatedIds.push(r.target_product_id);
          }
        }
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

      // 3. KITS — carregar items dos kits B2B activos e filtrar por intersecção com carrinho
      const allKits = (kitsRes?.data ?? []) as any[];
      const kitIds = allKits.map((k) => k.id);
      let kitItemsByKit = new Map<string, { product_id: string; quantity: number }[]>();
      if (kitIds.length > 0) {
        const { data: items } = await sb
          .from("product_kit_items")
          .select("kit_id, product_id, quantity")
          .in("kit_id", kitIds);
        for (const it of (items ?? []) as any[]) {
          if (!it.product_id) continue;
          const arr = kitItemsByKit.get(it.kit_id) ?? [];
          arr.push({ product_id: it.product_id, quantity: Number(it.quantity) || 1 });
          kitItemsByKit.set(it.kit_id, arr);
        }
      }
      // Filtro: se kit_mode === "auto", ignorar manuais; caso contrário considerar todos os kits visíveis B2B
      const manualKits =
        settings.kit_mode === "auto"
          ? []
          : allKits.filter((k) => (kitItemsByKit.get(k.id) ?? []).length >= 2);

      const kitProductIds = new Set<string>();
      manualKits.forEach((k) =>
        (kitItemsByKit.get(k.id) ?? []).forEach((it) => kitProductIds.add(it.product_id)),
      );

      // 4. Fetch product details
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

      const sellersById = new Map<string, CartRecommendationProduct>();
      normalize(bestSellersQ.data || []).forEach((p) => sellersById.set(p.id, p));
      const bestSellers = topSellerIds
        .map((id) => sellersById.get(id))
        .filter(Boolean) as CartRecommendationProduct[];

      const promotions = normalize(promosQ.data || [])
        .filter((p) => {
          const hasPriceCut =
            p.compare_at_price != null && Number(p.compare_at_price) > Number(p.base_price);
          const hasLabel = !!(p.promo_label && p.promo_label.trim());
          return hasPriceCut || hasLabel;
        })
        .slice(0, 6);

      const relatedManual = normalize(relatedManualQ.data || []);
      const relatedCategory = normalize(relatedCategoryQ.data || []);
      const seenRelated = new Set<string>();
      const related: CartRecommendationProduct[] = [];
      // manter ordem dos manualRelatedIds (já ordenados por weight)
      const manualById = new Map(relatedManual.map((p) => [p.id, p]));
      for (const id of manualRelatedIds) {
        const p = manualById.get(id);
        if (p && !seenRelated.has(p.id)) { seenRelated.add(p.id); related.push(p); }
        if (related.length >= 6) break;
      }
      for (const p of relatedCategory) {
        if (related.length >= 6) break;
        if (seenRelated.has(p.id) || cartProductIds.includes(p.id)) continue;
        seenRelated.add(p.id);
        related.push(p);
      }

      // KITS — apenas mostrar se tem intersecção com o carrinho OU se carrinho vazio (showcase)
      const kitProductsById = new Map<string, CartRecommendationProduct>();
      normalize(kitProductsQ.data || []).forEach((p) => kitProductsById.set(p.id, p));

      const kits: CartKit[] = [];
      if (settings.show_kit) {
        for (const k of manualKits) {
          const items = kitItemsByKit.get(k.id) ?? [];
          // Mostrar se carrinho contém pelo menos 1 produto do kit, OU se carrinho vazio
          const hasIntersection =
            cartProductIds.length === 0 ||
            items.some((it) => cartProductIds.includes(it.product_id));
          if (!hasIntersection) continue;

          const products = items
            .map((it) => kitProductsById.get(it.product_id))
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
