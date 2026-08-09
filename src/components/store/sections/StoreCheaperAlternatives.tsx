import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Package } from "lucide-react";
import { StoreVatLabel } from "@/components/store/StoreVatLabel";

interface StoreCheaperAlternativesProps {
  productId: string;
  categoryId: string | null;
  workspaceId: string;
  workspaceSlug: string;
  currentPrice: number;
}

/**
 * Alternativas mais baratas da mesma categoria (down-sell).
 * Evita perder a venda quando o preço é o obstáculo.
 */
export function StoreCheaperAlternatives({
  productId,
  categoryId,
  workspaceId,
  workspaceSlug,
  currentPrice,
}: StoreCheaperAlternativesProps) {
  const { data: items = [] } = useQuery({
    queryKey: ["store-cheaper-alternatives", productId, categoryId, currentPrice],
    enabled: !!categoryId && !!workspaceId && currentPrice > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("products")
        .select("id, name, base_price, currency, images, primary_image_index")
        .eq("workspace_id", workspaceId)
        .eq("store_category_id", categoryId)
        .eq("store_published", true)
        .eq("status", "active")
        .neq("id", productId)
        .neq("stock_status", "out_of_stock")
        .lt("base_price", currentPrice)
        .order("base_price", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data || [];
    },
  });

  if (!items.length) return null;

  return (
    <section className="mt-12" aria-labelledby="alternatives-heading">
      <h2 id="alternatives-heading" className="mb-2 text-xl font-semibold">
        Alternativas mais acessíveis
      </h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Opções da mesma categoria com preço mais baixo.
      </p>
      <div className="grid gap-4 sm:grid-cols-3">
        {items.map((p: any) => {
          const idx = p.primary_image_index ?? 0;
          const img = p.images?.[idx] || p.images?.[0];
          const saving = currentPrice - p.base_price;
          return (
            <Link
              key={p.id}
              to={`/store/${workspaceSlug}/product/${p.id}`}
              className="group rounded-2xl border p-3 transition-colors hover:bg-muted/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
            >
              <div className="mb-3 aspect-square overflow-hidden rounded-xl bg-muted">
                {img ? (
                  <img
                    src={img}
                    alt={p.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Package className="h-8 w-8 text-muted-foreground/30" aria-hidden="true" />
                  </div>
                )}
              </div>
              <p className="line-clamp-2 text-sm font-medium">{p.name}</p>
              <p className="mt-1 text-sm font-semibold text-primary">
                €{Number(p.base_price).toFixed(2)} <StoreVatLabel />
              </p>
              <p className="text-xs text-muted-foreground">Menos €{saving.toFixed(2)}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
