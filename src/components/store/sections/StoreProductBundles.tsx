import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStoreCart } from "@/contexts/StoreCartContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { StoreVatLabel } from "@/components/store/StoreVatLabel";

interface StoreProductBundlesProps {
  productId: string;
  workspaceId: string;
}

interface BundleProduct {
  id: string;
  name: string;
  base_price: number;
  currency: string;
  images: string[] | null;
  primary_image_index: number | null;
  sku: string | null;
  quantity: number;
}

/**
 * Packs configurados no backoffice (product_bundles) que incluem este produto.
 * A poupança apresentada vem do desconto real do pack — nunca é estimada.
 */
export function StoreProductBundles({ productId, workspaceId }: StoreProductBundlesProps) {
  const { addItem } = useStoreCart();

  const { data: bundles = [] } = useQuery({
    queryKey: ["store-product-bundles", productId],
    enabled: !!productId && !!workspaceId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data: memberships, error: mErr } = await (supabase as any)
        .from("product_bundle_items")
        .select("bundle_id")
        .eq("product_id", productId);
      if (mErr) throw mErr;
      const bundleIds = [...new Set((memberships || []).map((m: any) => m.bundle_id))];
      if (bundleIds.length === 0) return [];

      const { data: bundleRows, error: bErr } = await (supabase as any)
        .from("product_bundles")
        .select("id, name, description, discount_type, discount_value")
        .in("id", bundleIds)
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .limit(3);
      if (bErr) throw bErr;
      if (!bundleRows?.length) return [];

      const { data: items, error: iErr } = await (supabase as any)
        .from("product_bundle_items")
        .select("bundle_id, product_id, quantity")
        .in("bundle_id", bundleRows.map((b: any) => b.id));
      if (iErr) throw iErr;

      const productIds = [...new Set((items || []).map((i: any) => i.product_id))];
      const { data: products, error: pErr } = await (supabase as any)
        .from("products")
        .select("id, name, base_price, currency, images, primary_image_index, sku, stock_status")
        .in("id", productIds)
        .eq("store_published", true)
        .eq("status", "active");
      if (pErr) throw pErr;

      return bundleRows
        .map((b: any) => {
          const bundleItems = (items || []).filter((i: any) => i.bundle_id === b.id);
          const resolved: BundleProduct[] = bundleItems
            .map((i: any) => {
              const p = (products || []).find((pr: any) => pr.id === i.product_id);
              return p ? { ...p, quantity: i.quantity || 1 } : null;
            })
            .filter(Boolean) as BundleProduct[];
          if (resolved.length !== bundleItems.length || resolved.length < 2) return null;
          const subtotal = resolved.reduce((s, p) => s + p.base_price * p.quantity, 0);
          const discount =
            b.discount_type === "percentage"
              ? (subtotal * Number(b.discount_value || 0)) / 100
              : Number(b.discount_value || 0);
          const total = Math.max(0, subtotal - discount);
          return { ...b, products: resolved, subtotal, discount, total };
        })
        .filter(Boolean);
    },
  });

  if (!bundles.length) return null;

  const addBundle = (bundle: any) => {
    bundle.products.forEach((p: BundleProduct) => {
      const idx = p.primary_image_index ?? 0;
      addItem(
        {
          productId: p.id,
          name: p.name,
          price: p.base_price,
          currency: p.currency,
          image: p.images?.[idx] || p.images?.[0],
          sku: p.sku || undefined,
        },
        p.quantity,
      );
    });
    toast.success(`Pack "${bundle.name}" adicionado ao carrinho`);
  };

  return (
    <section className="mt-12" aria-labelledby="bundles-heading">
      <h2 id="bundles-heading" className="mb-6 text-xl font-semibold">
        Packs com este produto
      </h2>
      <div className="grid gap-4 md:grid-cols-2">
        {bundles.map((b: any) => (
          <div key={b.id} className="rounded-2xl border p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{b.name}</p>
                {b.description && <p className="text-xs text-muted-foreground">{b.description}</p>}
              </div>
              {b.discount > 0 && (
                <Badge className="border-0 bg-destructive/10 text-destructive">
                  Poupa €{b.discount.toFixed(2)}
                </Badge>
              )}
            </div>

            <ul className="mb-4 space-y-2">
              {b.products.map((p: BundleProduct) => {
                const idx = p.primary_image_index ?? 0;
                const img = p.images?.[idx] || p.images?.[0];
                return (
                  <li key={p.id} className="flex items-center gap-3 text-sm">
                    <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border bg-muted">
                      {img ? (
                        <img src={img} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <Package className="m-2 h-6 w-6 text-muted-foreground/40" aria-hidden="true" />
                      )}
                    </div>
                    <span className="min-w-0 flex-1 truncate">
                      {p.quantity > 1 ? `${p.quantity}× ` : ""}
                      {p.name}
                    </span>
                    <span className="text-muted-foreground">€{(p.base_price * p.quantity).toFixed(2)}</span>
                  </li>
                );
              })}
            </ul>

            <div className="flex items-center justify-between gap-3 border-t pt-3">
              <div>
                {b.discount > 0 && (
                  <span className="mr-2 text-sm text-muted-foreground line-through">
                    €{b.subtotal.toFixed(2)}
                  </span>
                )}
                <span className="text-lg font-bold text-primary">€{b.total.toFixed(2)}</span>{" "}
                <StoreVatLabel />
              </div>
              <Button size="sm" className="gap-2" onClick={() => addBundle(b)}>
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                Comprar pack
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
