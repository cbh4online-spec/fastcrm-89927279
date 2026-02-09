import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StoreProduct {
  id: string;
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
  store_sort_order: number | null;
  store_category_id: string | null;
  specifications: Record<string, string> | null;
  demo_video_url: string | null;
}

export interface StoreCategory {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  description: string | null;
  position: number;
  is_active: boolean;
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
        .select("id, name, product_type, category, base_price, currency, billing_type, short_description, commercial_description, images, primary_image_index, benefits, sku, stock_status, stock_quantity, track_stock, store_featured, store_sort_order, store_category_id, specifications, demo_video_url")
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

export function useStoreProduct(productId: string | undefined) {
  return useQuery({
    queryKey: ["store-product", productId],
    queryFn: async () => {
      if (!productId) return null;

      const { data, error } = await supabase
        .from("products")
        .select("id, name, product_type, category, base_price, currency, billing_type, short_description, commercial_description, images, primary_image_index, benefits, sku, stock_status, stock_quantity, track_stock, store_featured, store_sort_order, store_category_id, specifications, demo_video_url, workspace_id")
        .eq("id", productId)
        .eq("store_published", true)
        .single();

      if (error) throw error;
      return data as StoreProduct & { workspace_id: string };
    },
    enabled: !!productId,
  });
}

export function useStoreCategories(workspaceId: string) {
  return useQuery({
    queryKey: ["store-categories-db", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_categories")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("position", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      return (data || []) as StoreCategory[];
    },
    enabled: !!workspaceId,
  });
}
