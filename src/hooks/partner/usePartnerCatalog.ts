import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ComputedPartnerPrice } from "@/types/partner";

/**
 * Variante (filho) tal como vem agregada na view `partner_b2b_catalog_grouped`
 * dentro do campo jsonb `variants` do produto pai.
 */
export interface PartnerCatalogVariant {
  id: string;
  sku: string | null;
  variant_label: string | null;
  variant_attributes: Record<string, string | number | boolean | null>;
  base_price: number;
  stock_status: string | null;
  stock_quantity: number | null;
  min_order_quantity: number | null;
  pack_size: number | null;
  images: string[] | null;
  /** Preenchido em runtime depois de calcular o preço por variante via RPC. */
  pricing?: ComputedPartnerPrice;
}

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
  /** Identifica se este produto é uma variante de outro (raro neste catálogo agrupado). */
  parent_product_id: string | null;
  /** Modo configurado na categoria: 'grouped' (default) ou 'separate'. */
  variant_display_mode: "grouped" | "separate";
  /** Quando o produto é pai e a categoria está em modo grouped, traz aqui as variantes. */
  variants: PartnerCatalogVariant[];
  pricing?: ComputedPartnerPrice;
}

interface UsePartnerCatalogOptions {
  workspaceId: string | undefined;
  partnerAccountId: string | undefined;
  search?: string;
  category?: string;
  brand?: string;
}

/**
 * Catálogo B2B agrupado por produto pai.
 *
 * Lê da view `partner_b2b_catalog_grouped`, que já filtra por b2b_published+active
 * e respeita o `variant_display_mode` configurado em cada categoria:
 *   - 'grouped'  → o pai aparece com as variantes em `variants[]`
 *   - 'separate' → cada variante é uma linha independente
 *
 * O preço por SKU continua a ser calculado individualmente via `compute_partner_price`,
 * tanto para o produto/pai como para cada variante.
 */
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
      // View ainda não está nos types gerados → cast para any.
      let query = (supabase as any)
        .from("partner_b2b_catalog_grouped")
        .select("*")
        .eq("workspace_id", workspaceId!)
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

      const rawProducts = (data || []) as any[];

      // Helper: calcula preço para um único product_id
      const computePrice = async (productId: string) => {
        try {
          const { data: priceData } = await supabase.rpc("compute_partner_price", {
            p_workspace_id: workspaceId!,
            p_product_id: productId,
            p_partner_account_id: partnerAccountId!,
            p_quantity: 1,
          });
          return (priceData?.[0] as ComputedPartnerPrice | undefined) ?? undefined;
        } catch {
          return undefined;
        }
      };

      const productsWithPricing = await Promise.all(
        rawProducts.map(async (product) => {
          const variantsRaw = (product.variants ?? []) as PartnerCatalogVariant[];

          // Calcula preço do produto principal e de cada variante em paralelo.
          const [parentPricing, variantPricings] = await Promise.all([
            computePrice(product.id),
            Promise.all(variantsRaw.map((v) => computePrice(v.id))),
          ]);

          const variants: PartnerCatalogVariant[] = variantsRaw.map((v, idx) => ({
            ...v,
            variant_attributes: v.variant_attributes ?? {},
            pricing: variantPricings[idx],
          }));

          // Imagem principal: 1ª da array images se existir.
          const images: string[] = Array.isArray(product.images) ? product.images : [];
          const image_url = images.length > 0 ? images[product.primary_image_index ?? 0] ?? images[0] : null;

          return {
            id: product.id,
            name: product.name,
            sku: product.sku,
            base_price: product.base_price ?? 0,
            image_url,
            category: product.category ?? null,
            brand: product.brand ?? null,
            description: product.short_description ?? product.description ?? null,
            b2b_published: product.b2b_published ?? false,
            b2b_visible: product.b2b_visible ?? true,
            b2b_sellable: product.b2b_sellable ?? true,
            moq: product.min_order_quantity ?? product.moq ?? 1,
            pack_size: product.pack_size ?? 1,
            pvp_recommended: product.pvp_recommended ?? null,
            allow_backorder: product.allow_backorder ?? false,
            partner_notes: product.partner_notes ?? null,
            stock_status: product.stock_status ?? null,
            parent_product_id: product.parent_product_id ?? null,
            variant_display_mode: (product.variant_display_mode ?? "grouped") as "grouped" | "separate",
            variants,
            pricing: parentPricing,
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
