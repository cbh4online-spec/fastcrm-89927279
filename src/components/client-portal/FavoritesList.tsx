import { Package, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useClientFavorites } from "@/hooks/client-portal/useClientFavorites";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface FavoritesListProps {
  onProductClick?: (productId: string) => void;
}

export function FavoritesList({ onProductClick }: FavoritesListProps) {
  const { favorites, loading, removeFavorite } = useClientFavorites();
  const { addItem } = useCart();

  const handleAddToCart = (favorite: typeof favorites[0]) => {
    const product = favorite.product;
    if (!product || product.status !== "active") {
      toast.error("Produto indisponível");
      return;
    }

    const primaryIndex = product.primary_image_index ?? 0;
    const imageUrl = product.images?.[primaryIndex] || null;

    addItem({
      product_id: product.id,
      product_name: product.name,
      product_sku: product.sku,
      product_image_url: imageUrl,
      quantity: 1,
      unit_price_net: product.base_price,
      vat_rate: 23,
    });

    toast.success("Adicionado ao carrinho");
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <Skeleton className="w-20 h-20 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <Package className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Sem favoritos</h3>
        <p className="text-muted-foreground mb-4">
          Adicione produtos aos favoritos para acesso rápido
        </p>
        <Button variant="outline" asChild>
          <a href="/client/catalog">Ver catálogo</a>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {favorites.map((favorite) => {
        const product = favorite.product;
        if (!product) return null;

        const primaryIndex = product.primary_image_index ?? 0;
        const imageUrl = product.images?.[primaryIndex] || null;
        const isAvailable = product.status === "active";

        return (
          <Card
            key={favorite.id}
            className="hover:border-primary/50 transition-colors cursor-pointer group"
            onClick={() => onProductClick?.(product.id)}
          >
            <CardContent className="p-4">
              <div className="flex gap-4">
                {/* Product Image */}
                <div className="w-20 h-20 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
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
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{product.name}</h3>
                  {product.sku && (
                    <p className="text-xs text-muted-foreground font-mono">
                      {product.sku}
                    </p>
                  )}
                  <p className="text-lg font-bold text-primary mt-1">
                    {product.base_price.toFixed(2)}€
                  </p>

                  {/* Actions */}
                  <div className="flex gap-2 mt-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(favorite);
                      }}
                      disabled={!isAvailable}
                      className="flex-1 gap-1"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      {isAvailable ? "Adicionar" : "Indisponível"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFavorite(product.id);
                      }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
