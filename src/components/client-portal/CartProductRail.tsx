import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Plus, Flame, Tag, Sparkles, Layers } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/contexts/CartContext";
import type { CartRecommendationProduct } from "@/hooks/client-portal/useCartRecommendations";

type Variant = "bestSellers" | "related" | "promotions" | "kit";

interface Props {
  variant: Variant;
  products: CartRecommendationProduct[];
  /** Apenas relevante para variant="kit": desconto agregado a sugerir. */
  kitDiscountPct?: number;
}

const META: Record<Variant, { title: string; icon: typeof Flame; tone: string }> = {
  bestSellers: { title: "Mais vendidos", icon: Flame, tone: "text-orange-600" },
  related: { title: "Produtos relacionados", icon: Sparkles, tone: "text-primary" },
  promotions: { title: "Em promoção", icon: Tag, tone: "text-rose-600" },
  kit: { title: "Kit poupança", icon: Layers, tone: "text-emerald-600" },
};

function imgOf(p: CartRecommendationProduct): string | null {
  if (!p.images || p.images.length === 0) return null;
  return p.images[p.primary_image_index ?? 0] ?? p.images[0] ?? null;
}

export function CartProductRail({ variant, products, kitDiscountPct = 5 }: Props) {
  const { addItem } = useCart();
  if (!products || products.length === 0) return null;

  const meta = META[variant];
  const Icon = meta.icon;

  const handleAdd = (p: CartRecommendationProduct) => {
    addItem({
      product_id: p.id,
      product_name: p.name,
      product_sku: p.sku,
      product_image_url: imgOf(p),
      quantity: 1,
      unit_price_net: Number(p.base_price || 0),
      vat_rate: p.vat_rate ?? 23,
    });
    toast.success(`${p.name} adicionado`);
  };

  const handleAddAll = () => {
    products.forEach((p) => {
      addItem({
        product_id: p.id,
        product_name: p.name,
        product_sku: p.sku,
        product_image_url: imgOf(p),
        quantity: 1,
        unit_price_net: Number(p.base_price || 0),
        vat_rate: p.vat_rate ?? 23,
      });
    });
    toast.success(`${products.length} produtos adicionados ao carrinho`);
  };

  return (
    <Card className={variant === "kit" ? "border-emerald-500/30 bg-emerald-500/5" : undefined}>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className={`h-4 w-4 ${meta.tone}`} />
          {meta.title}
          {variant === "kit" && (
            <Badge variant="secondary" className="ml-1 bg-emerald-500/15 text-emerald-700 border-0">
              Sugestão -{kitDiscountPct}%
            </Badge>
          )}
        </CardTitle>
        {variant === "kit" && products.length > 1 && (
          <Button size="sm" variant="default" className="h-8" onClick={handleAddAll}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Adicionar kit
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {products.map((p) => {
            const img = imgOf(p);
            const hasDiscount =
              p.compare_at_price != null && Number(p.compare_at_price) > Number(p.base_price);
            const discountPct = hasDiscount
              ? Math.round(
                  ((Number(p.compare_at_price) - Number(p.base_price)) /
                    Number(p.compare_at_price)) *
                    100,
                )
              : 0;

            return (
              <div
                key={p.id}
                className="border rounded-lg p-2.5 hover:border-primary/50 transition-colors group flex flex-col bg-background"
              >
                <div className="relative aspect-square w-full bg-muted rounded mb-2 overflow-hidden">
                  {img ? (
                    <img
                      src={img}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                  {(hasDiscount || p.promo_label) && (
                    <Badge className="absolute top-1.5 left-1.5 bg-rose-600 text-white border-0 text-[10px] h-5 px-1.5">
                      {hasDiscount ? `-${discountPct}%` : p.promo_label}
                    </Badge>
                  )}
                </div>

                <p className="text-xs font-medium line-clamp-2 mb-1 min-h-[2rem]">{p.name}</p>
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span className="text-sm font-semibold text-primary">
                    {Number(p.base_price || 0).toFixed(2)}€
                  </span>
                  {hasDiscount && (
                    <span className="text-[11px] text-muted-foreground line-through">
                      {Number(p.compare_at_price).toFixed(2)}€
                    </span>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-xs mt-auto"
                  onClick={() => handleAdd(p)}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Adicionar
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
