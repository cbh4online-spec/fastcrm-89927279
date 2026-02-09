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
  store_featured: boolean | null;
  store_sort_order: number | null;
  specifications: Record<string, string> | null;
  demo_video_url: string | null;
}

interface UseStoreProductsOptions {
  workspaceId: string;
  category?: string;
  search?: string;
  featured?: boolean;
}

export function useStoreProducts({ workspaceId, category, search, featured }: UseStoreProductsOptions) {
  return useQuery({
    queryKey: ["store-products", workspaceId, category, search, featured],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id, name, product_type, category, base_price, currency, billing_type, short_description, commercial_description, images, primary_image_index, benefits, sku, stock_status, store_featured, store_sort_order, specifications, demo_video_url")
        .eq("workspace_id", workspaceId)
        .eq("store_published", true)
        .eq("status", "active")
        .order("store_sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (category) {
        query = query.eq("category", category);
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,short_description.ilike.%${search}%,sku.ilike.%${search}%`);
      }

      if (featured) {
        query = query.eq("store_featured", true);
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
        .select("id, name, product_type, category, base_price, currency, billing_type, short_description, commercial_description, images, primary_image_index, benefits, sku, stock_status, store_featured, store_sort_order, specifications, demo_video_url")
        .eq("id", productId)
        .eq("store_published", true)
        .single();

      if (error) throw error;
      return data as StoreProduct;
    },
    enabled: !!productId,
  });
}

export function useStoreCategories(workspaceId: string) {
  return useQuery({
    queryKey: ["store-categories", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("category")
        .eq("workspace_id", workspaceId)
        .eq("store_published", true)
        .eq("status", "active")
        .not("category", "is", null);

      if (error) throw error;
      const categories = [...new Set((data || []).map(p => p.category).filter(Boolean))] as string[];
      return categories.sort();
    },
    enabled: !!workspaceId,
  });
}
