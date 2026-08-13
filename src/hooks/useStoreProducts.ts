import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StoreProduct {
  id: string;
  /** Slug público usado no URL da loja (SEO). */
  store_slug?: string | null;
  workspace_id: string;
  name: string;
  product_type: string;
  category: string | null;
  base_price: number;
  currency: string;
  billing_type: string;
  short_description: string | null;
  commercial_description: string | null;
  images: string[];
  primary_image_index: number | null;
  benefits: string[] | null;
  sku: string | null;
  stock_status: string | null;
  stock_quantity: number | null;
  track_stock: boolean | null;
  store_featured: boolean | null;
  created_at?: string;
  store_sort_order: number | null;
  store_category_id: string | null;
  specifications: Record<string, string> | null;
  demo_video_url: string | null;
  price_on_request?: boolean;
  // Promotion fields (Omnibus Directive)
  compare_at_price?: number | null;
  promo_start_at?: string | null;
  promo_end_at?: string | null;
  promo_label?: string | null;
  lowest_price_30d?: number | null;
}

export interface StoreCategory {
  id: string;
  workspace_id: string;
  name: string;
  slug: string | null;
  description: string | null;
  position: number;
  is_active: boolean;
  image_url: string | null;
  color: string | null;
  icon: string | null;
  store_visible: boolean;
  product_count?: number;
}

interface UseStoreProductsOptions {
  workspaceId: string;
  categoryId?: string;
  category?: string;
  search?: string;
  featured?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: "price_asc" | "price_desc" | "name" | "newest";
}

export function useStoreProducts({ workspaceId, categoryId, category, search, featured, minPrice, maxPrice, sortBy }: UseStoreProductsOptions) {
  return useQuery({
    queryKey: ["store-products", workspaceId, categoryId, category, search, featured, minPrice, maxPrice, sortBy],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id, store_slug, name, product_type, category, base_price, currency, billing_type, short_description, commercial_description, images, primary_image_index, benefits, sku, stock_status, stock_quantity, track_stock, store_featured, store_sort_order, store_category_id, specifications, demo_video_url, created_at, workspace_id, product_condition, price_on_request, compare_at_price, promo_start_at, promo_end_at, promo_label, lowest_price_30d")
        .eq("workspace_id", workspaceId)
        .eq("store_published", true)
        .eq("status", "active");

      if (categoryId) {
        query = query.eq("store_category_id", categoryId);
      } else if (category) {
        query = query.eq("category", category);
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,short_description.ilike.%${search}%,sku.ilike.%${search}%`);
      }

      if (featured) {
        query = query.eq("store_featured", true);
      }

      if (minPrice !== undefined) {
        query = query.gte("base_price", minPrice);
      }
      if (maxPrice !== undefined) {
        query = query.lte("base_price", maxPrice);
      }

      // Sorting
      if (sortBy === "price_asc") {
        query = query.order("base_price", { ascending: true });
      } else if (sortBy === "price_desc") {
        query = query.order("base_price", { ascending: false });
      } else if (sortBy === "newest") {
        query = query.order("created_at", { ascending: false });
      } else {
        query = query.order("store_sort_order", { ascending: true }).order("name", { ascending: true });
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as StoreProduct[];
    },
    enabled: !!workspaceId,
  });
}

const PAGE_SIZE = 12;

export function useInfiniteStoreProducts({ workspaceId, categoryId, category, search, featured, minPrice, maxPrice, sortBy }: UseStoreProductsOptions) {
  return useInfiniteQuery({
    queryKey: ["store-products-infinite", workspaceId, categoryId, category, search, featured, minPrice, maxPrice, sortBy],
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from("products")
        .select("id, store_slug, name, product_type, category, base_price, currency, billing_type, short_description, commercial_description, images, primary_image_index, benefits, sku, stock_status, stock_quantity, track_stock, store_featured, store_sort_order, store_category_id, specifications, demo_video_url, created_at, workspace_id, product_condition, price_on_request, compare_at_price, promo_start_at, promo_end_at, promo_label, lowest_price_30d")
        .eq("workspace_id", workspaceId)
        .eq("store_published", true)
        .eq("status", "active");

      if (categoryId) {
        query = query.eq("store_category_id", categoryId);
      } else if (category) {
        query = query.eq("category", category);
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,short_description.ilike.%${search}%,sku.ilike.%${search}%`);
      }

      if (featured) {
        query = query.eq("store_featured", true);
      }

      if (minPrice !== undefined) {
        query = query.gte("base_price", minPrice);
      }
      if (maxPrice !== undefined) {
        query = query.lte("base_price", maxPrice);
      }

      if (sortBy === "price_asc") {
        query = query.order("base_price", { ascending: true });
      } else if (sortBy === "price_desc") {
        query = query.order("base_price", { ascending: false });
      } else if (sortBy === "newest") {
        query = query.order("created_at", { ascending: false });
      } else {
        query = query.order("store_sort_order", { ascending: true }).order("name", { ascending: true });
      }

      const from = pageParam * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as StoreProduct[];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length;
    },
    enabled: !!workspaceId,
  });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Aceita o UUID do produto (legado) ou o slug público (store_slug). */
export function useStoreProduct(productIdOrSlug: string | undefined, workspaceId?: string) {
  return useQuery({
    queryKey: ["store-product", productIdOrSlug, workspaceId || ""],
    queryFn: async () => {
      if (!productIdOrSlug || !workspaceId) return null;

      let query = supabase
        .from("products")
        .select("id, store_slug, name, product_type, category, base_price, currency, billing_type, short_description, commercial_description, images, primary_image_index, benefits, sku, stock_status, stock_quantity, track_stock, store_featured, store_sort_order, store_category_id, specifications, demo_video_url, workspace_id, created_at, product_condition, price_on_request, compare_at_price, promo_start_at, promo_end_at, promo_label, lowest_price_30d, metadata")
        .eq("store_published", true)
        .eq("status", "active");

      query = UUID_RE.test(productIdOrSlug)
        ? query.eq("id", productIdOrSlug)
        : query.eq("store_slug", productIdOrSlug);

      query = query.eq("workspace_id", workspaceId);


      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      if (data) return data as StoreProduct & { workspace_id: string };

      // Fallback: links antigos/truncados — resolve por prefixo do slug
      if (!UUID_RE.test(productIdOrSlug) && productIdOrSlug.length >= 8) {
        let fallback = supabase
          .from("products")
          .select("id, store_slug, name, product_type, category, base_price, currency, billing_type, short_description, commercial_description, images, primary_image_index, benefits, sku, stock_status, stock_quantity, track_stock, store_featured, store_sort_order, store_category_id, specifications, demo_video_url, workspace_id, created_at, product_condition, price_on_request, compare_at_price, promo_start_at, promo_end_at, promo_label, lowest_price_30d, metadata")
          .eq("store_published", true)
          .eq("status", "active")
          .like("store_slug", `${productIdOrSlug}%`)
          .limit(2);

        fallback = fallback.eq("workspace_id", workspaceId);

        const { data: matches, error: fbError } = await fallback;
        if (fbError) throw fbError;
        if (matches && matches.length === 1) {
          return matches[0] as StoreProduct & { workspace_id: string };
        }
      }

      return null;
    },

    enabled: !!productIdOrSlug && !!workspaceId,
  });
}

export function useStoreCategories(workspaceId: string) {
  return useQuery({
    queryKey: ["store-categories-unified", workspaceId],
    queryFn: async () => {
      // Fetch active + store_visible categories from product_categories
      const { data: cats, error } = await (supabase as any)
        .from("product_categories")
        .select("id, workspace_id, name, slug, description, position, is_active, image_url, color, icon, store_visible")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .eq("store_visible", true)
        .order("position", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;

      // Fetch product counts per category (only published + active)
      const { data: products, error: pErr } = await supabase
        .from("products")
        .select("store_category_id")
        .eq("workspace_id", workspaceId)
        .eq("store_published", true)
        .eq("status", "active")
        .not("store_category_id", "is", null);

      if (pErr) throw pErr;

      const counts: Record<string, number> = {};
      (products || []).forEach((p: any) => {
        if (p.store_category_id) {
          counts[p.store_category_id] = (counts[p.store_category_id] || 0) + 1;
        }
      });

      // Only return categories with at least 1 published product
      return ((cats || []) as StoreCategory[])
        .map((c) => ({ ...c, product_count: counts[c.id] || 0 }))
        .filter((c) => c.product_count > 0);
    },
    enabled: !!workspaceId,
  });
}
