import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TierProduct {
  id: string;
  name: string;
  base_price: number;
  currency: string;
  images: string[] | null;
  primary_image_index: number | null;
  sku: string | null;
  quantity: number;
}

export interface PurchaseTier {
  id: string;
  label: string;
  hint?: string;
  badge?: string;
  products: TierProduct[];
  subtotal: number;
  discount: number;
  itemsTotal: number;
}

/** Portes da loja: método ativo mais barato + limiar de envio grátis. */
export function useStoreShippingBaseline(workspaceId?: string) {
  return useQuery({
    queryKey: ["store-shipping-baseline", workspaceId],
    enabled: !!workspaceId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("shipping_methods")
        .select("base_price, free_shipping_threshold")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .order("base_price", { ascending: true })
        .limit(1);
      if (error) throw error;
      const row = data?.[0];
      if (!row) return null;
      return {
        basePrice: Number(row.base_price || 0),
        freeThreshold:
          row.free_shipping_threshold === null ? null : Number(row.free_shipping_threshold),
      };
    },
  });
}

/**
 * Opções de compra: "só este item" + packs configurados que incluem o produto.
 * Os preços vêm sempre dos dados reais dos produtos/packs — nada é estimado.
 */
export function useStorePurchaseTiers(params: {
  productId: string;
  workspaceId: string;
  currentProduct: TierProduct | null;
  enabled?: boolean;
}) {
  const { productId, workspaceId, currentProduct, enabled = true } = params;

  return useQuery({
    queryKey: ["store-purchase-tiers", productId, workspaceId, currentProduct?.base_price],
    enabled: enabled && !!productId && !!workspaceId && !!currentProduct,
    staleTime: 60_000,
    queryFn: async (): Promise<PurchaseTier[]> => {
      const base = currentProduct as TierProduct;
      const single: PurchaseTier = {
        id: "single",
        label: "Só este item",
        hint: "Compra individual",
        products: [base],
        subtotal: base.base_price * base.quantity,
        discount: 0,
        itemsTotal: base.base_price * base.quantity,
      };

      const { data: memberships, error: mErr } = await (supabase as any)
        .from("product_bundle_items")
        .select("bundle_id")
        .eq("product_id", productId);
      if (mErr) throw mErr;

      const bundleIds = [...new Set((memberships || []).map((m: any) => m.bundle_id))];
      if (bundleIds.length === 0) return [single];

      const { data: bundleRows, error: bErr } = await (supabase as any)
        .from("product_bundles")
        .select("id, name, description, discount_type, discount_value")
        .in("id", bundleIds)
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .limit(3);
      if (bErr) throw bErr;
      if (!bundleRows?.length) return [single];

      const { data: items, error: iErr } = await (supabase as any)
        .from("product_bundle_items")
        .select("bundle_id, product_id, quantity")
        .in(
          "bundle_id",
          bundleRows.map((b: any) => b.id),
        );
      if (iErr) throw iErr;

      const productIds = [...new Set((items || []).map((i: any) => i.product_id))];
      const { data: products, error: pErr } = await (supabase as any)
        .from("products")
        .select("id, name, base_price, currency, images, primary_image_index, sku")
        .in("id", productIds)
        .eq("store_published", true)
        .eq("status", "active");
      if (pErr) throw pErr;

      const tiers: PurchaseTier[] = bundleRows
        .map((b: any) => {
          const bundleItems = (items || []).filter((i: any) => i.bundle_id === b.id);
          const resolved: TierProduct[] = bundleItems
            .map((i: any) => {
              const p = (products || []).find((pr: any) => pr.id === i.product_id);
              return p ? ({ ...p, quantity: i.quantity || 1 } as TierProduct) : null;
            })
            .filter(Boolean) as TierProduct[];
          if (resolved.length !== bundleItems.length || resolved.length < 2) return null;

          const subtotal = resolved.reduce((s, p) => s + p.base_price * p.quantity, 0);
          const discount =
            b.discount_type === "percentage"
              ? (subtotal * Number(b.discount_value || 0)) / 100
              : Number(b.discount_value || 0);
          const extra = resolved.reduce((s, p) => s + p.quantity, 0) - base.quantity;

          return {
            id: b.id,
            label: extra > 0 ? `+ ${extra} do vendedor` : b.name,
            hint: b.name,
            products: resolved,
            subtotal,
            discount: Math.max(0, discount),
            itemsTotal: Math.max(0, subtotal - discount),
          } as PurchaseTier;
        })
        .filter(Boolean) as PurchaseTier[];

      if (!tiers.length) return [single];

      tiers.sort((a, b) => a.itemsTotal - b.itemsTotal);
      const best = tiers.reduce((acc, t) => (t.discount > acc.discount ? t : acc), tiers[0]);
      if (best.discount > 0) best.badge = "Melhor valor";

      return [single, ...tiers];
    },
  });
}
