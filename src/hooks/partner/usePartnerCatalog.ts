import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ComputedPartnerPrice } from "@/types/partner";

export interface PartnerCatalogProduct {
  id: string;
  name: string;
  sku: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  brand: string | null;
  description: string | null;
  b2b_published: boolean;
  b2b_visible: boolean;
  b2b_sellable: boolean;
  moq: number;
  pack_size: number;
  pvp_recommended: number | null;
  allow_backorder: boolean;
  partner_notes: string | null;
  stock_status: string | null;
  // Computed pricing
  pricing?: ComputedPartnerPrice;
}

interface UsePartnerCatalogOptions {
  workspaceId: string | undefined;
  partnerAccountId: string | undefined;
  search?: string;
  category?: string;
  brand?: string;
}

export function usePartnerCatalog({
  workspaceId,
  partnerAccountId,
  search,
  category,
  brand,
}: UsePartnerCatalogOptions) {
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["partner-catalog", workspaceId, partnerAccountId, search, category, brand],
    enabled: !!workspaceId && !!partnerAccountId,
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id, name, sku, base_price, image_url, category, brand, description, b2b_published, b2b_visible, b2b_sellable, moq, pack_size, pvp_recommended, allow_backorder, partner_notes, stock_status")
        .eq("workspace_id", workspaceId!)
        .eq("b2b_published", true)
        .order("name");

      if (search) {
        query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
      }
      if (category) {
        query = query.eq("category", category);
      }
      if (brand) {
        query = query.eq("brand", brand);
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;

      // Compute prices for all products via RPC
      const productsWithPricing = await Promise.all(
        (data || []).map(async (product) => {
          try {
            const { data: priceData } = await supabase.rpc("compute_partner_price", {
              p_workspace_id: workspaceId!,
              p_product_id: product.id,
              p_partner_account_id: partnerAccountId!,
              p_quantity: 1,
            });

            return {
              ...product,
              moq: product.moq ?? 1,
              pack_size: product.pack_size ?? 1,
              b2b_visible: product.b2b_visible ?? false,
              b2b_sellable: product.b2b_sellable ?? true,
              allow_backorder: product.allow_backorder ?? false,
              pricing: priceData?.[0] as ComputedPartnerPrice | undefined,
            } as PartnerCatalogProduct;
          } catch {
            return {
              ...product,
              moq: product.moq ?? 1,
              pack_size: product.pack_size ?? 1,
              b2b_visible: product.b2b_visible ?? false,
              b2b_sellable: product.b2b_sellable ?? true,
              allow_backorder: product.allow_backorder ?? false,
            } as PartnerCatalogProduct;
          }
        })
      );

      return productsWithPricing;
    },
  });

  // Extract unique categories and brands for filters
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))] as string[];
  const brands = [...new Set(products.map((p) => p.brand).filter(Boolean))] as string[];

  return { products, isLoading, categories, brands };
}
