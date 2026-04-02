import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ComputedPartnerPrice } from "@/types/partner";

export interface PartnerCatalogProduct {
  id: string;
  name: string;
  sku: string | null;
  base_price: number;
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
      // Use a simpler select to avoid type issues with newly added columns
      let query = (supabase
        .from("products")
        .select("*")
        .eq("workspace_id", workspaceId!)
        .eq("b2b_published", true)
        .order("name")) as any;

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

      const rawProducts = (data || []) as any[];

      // Compute prices via RPC
      const productsWithPricing = await Promise.all(
        rawProducts.map(async (product) => {
          let pricing: ComputedPartnerPrice | undefined;
          try {
            const { data: priceData } = await supabase.rpc("compute_partner_price", {
              p_workspace_id: workspaceId!,
              p_product_id: product.id,
              p_partner_account_id: partnerAccountId!,
              p_quantity: 1,
            });
            pricing = priceData?.[0] as ComputedPartnerPrice | undefined;
          } catch { /* ignore pricing errors */ }

          return {
            id: product.id,
            name: product.name,
            sku: product.sku,
            base_price: product.base_price ?? 0,
            image_url: product.image_url ?? null,
            category: product.category ?? null,
            brand: product.brand ?? null,
            description: product.description ?? null,
            b2b_published: product.b2b_published ?? false,
            b2b_visible: product.b2b_visible ?? false,
            b2b_sellable: product.b2b_sellable ?? true,
            moq: product.moq ?? 1,
            pack_size: product.pack_size ?? 1,
            pvp_recommended: product.pvp_recommended ?? null,
            allow_backorder: product.allow_backorder ?? false,
            partner_notes: product.partner_notes ?? null,
            stock_status: product.stock_status ?? null,
            pricing,
          } as PartnerCatalogProduct;
        })
      );

      return productsWithPricing;
    },
  });

  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))] as string[];
  const brands = [...new Set(products.map((p) => p.brand).filter(Boolean))] as string[];

  return { products, isLoading, categories, brands };
}
