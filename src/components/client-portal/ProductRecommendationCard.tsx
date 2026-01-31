import { Package, ShoppingCart, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ProductRecommendationCardProps {
  product: {
    id: string;
    name: string;
    sku: string | null;
    price: number;
    category: string | null;
    description: string | null;
    imageUrl: string | null;
    similarity: number;
  };
  onViewDetails?: (productId: string) => void;
}

export function ProductRecommendationCard({
  product,
  onViewDetails,
}: ProductRecommendationCardProps) {
  const { addItem } = useCart();
  const relevance = Math.round(product.similarity * 100);

  const handleAddToCart = () => {
    addItem({
      product_id: product.id,
      product_name: product.name,
      product_sku: product.sku,
      product_image_url: product.imageUrl,
      quantity: 1,
      unit_price_net: product.price,
      vat_rate: 23,
    });
    toast.success("Adicionado ao carrinho");
  };

  return (
    <Card className="overflow-hidden hover:border-primary/50 transition-colors">
      <CardContent className="p-0">
        <div className="flex">
          {/* Product Image */}
          <div className="w-24 h-24 bg-muted flex-shrink-0">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-8 w-8 text-muted-foreground/50" />
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex-1 p-3 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 className="font-medium truncate">{product.name}</h4>
                {product.sku && (
                  <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                )}
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "flex-shrink-0 gap-1",
                  relevance >= 70 ? "bg-green-50 text-green-700 border-green-200" :
                  relevance >= 50 ? "bg-amber-50 text-amber-700 border-amber-200" :
                  "bg-muted"
                )}
              >
                <Percent className="h-3 w-3" />
                {relevance}
              </Badge>
            </div>

            {product.description && (
              <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                {product.description}
              </p>
            )}

            <div className="flex items-center justify-between mt-2">
              <span className="text-lg font-bold text-primary">
                {product.price.toFixed(2)}€
              </span>
              <div className="flex gap-1">
                {onViewDetails && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetails(product.id)}
                  >
                    Ver
                  </Button>
                )}
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleAddToCart}
                  className="gap-1"
                >
                  <ShoppingCart className="h-4 w-4" />
                  <span className="hidden sm:inline">Adicionar</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
