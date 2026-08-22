import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Package, ShoppingBag, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStoreCart } from "@/contexts/StoreCartContext";
import { getStorePrice } from "@/hooks/useStoreTierPricing";
import { getStorefrontItemPath } from "@/utils/getStorefrontItemPath";
import { StoreVatLabel } from "@/components/store/StoreVatLabel";

interface StoreProductListRowProps {
  product: any;
  workspaceSlug: string;
  tierPricing?: any;
  reviewStats?: Map<string, { sum: number; count: number }>;
  salesCounts?: Map<string, number>;
  index?: number;
}

const eur = (v: number) => new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(v || 0);

export function StoreProductListRow({
  product,
  workspaceSlug,
  tierPricing,
  reviewStats,
  salesCounts,
  index = 0,
}: StoreProductListRowProps) {
  const { addItem } = useStoreCart();
  const href = getStorefrontItemPath(workspaceSlug, product);
  const imageUrl = product.images?.[product.primary_image_index ?? 0] || product.images?.[0];
  const isOutOfStock = product.stock_status === "out_of_stock";
  const isPriceOnRequest = !!product.price_on_request;
  const { price, isDiscounted } = getStorePrice(product.base_price, product.id, tierPricing, product);
  const stats = reviewStats?.get(product.id);
  const rating = stats && stats.count > 0 ? stats.sum / stats.count : null;
  const sold = salesCounts?.get(product.id) || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.2) }}
      className="flex gap-4 rounded-2xl border bg-card p-3 sm:p-4 transition-colors hover:border-foreground/20"
    >
      <Link to={href} className="shrink-0">
        <div className="h-24 w-24 sm:h-32 sm:w-32 overflow-hidden rounded-xl bg-muted flex items-center justify-center">
          {imageUrl ? (
            <img src={imageUrl} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <Package className="h-8 w-8 text-muted-foreground/40" />
          )}
        </div>
      </Link>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
        <div className="min-w-0">
          <Link to={href} className="block">
            <h3 className="truncate text-sm sm:text-base font-medium text-foreground hover:text-primary transition-colors">
              {product.name}
            </h3>
          </Link>
          {product.short_description && (
            <p className="mt-1 line-clamp-2 text-xs sm:text-sm text-muted-foreground">{product.short_description}</p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            {product.sku && <span className="font-mono">{product.sku}</span>}
            {rating !== null && (
              <span className="inline-flex items-center gap-0.5">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {rating.toFixed(1)}
              </span>
            )}
            {sold > 0 && <span>{sold} vendidos</span>}
            {isOutOfStock && <Badge variant="secondary" className="text-[10px]">Esgotado</Badge>}
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            {isPriceOnRequest ? (
              <span className="text-sm font-semibold text-foreground">Preço sob consulta</span>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-foreground">{eur(price)}</span>
                  {isDiscounted && product.compare_at_price && (
                    <span className="text-xs text-muted-foreground line-through">{eur(product.compare_at_price)}</span>
                  )}
                </div>
                <StoreVatLabel />
              </>
            )}
          </div>

          {!isPriceOnRequest && !isOutOfStock && (
            <Button
              size="sm"
              className="gap-1.5 rounded-full"
              onClick={() =>
                addItem({
                  productId: product.id,
                  name: product.name,
                  price,
                  image: imageUrl,
                } as any)
              }
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Adicionar
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
