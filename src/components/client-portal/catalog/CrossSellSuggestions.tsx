import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCrossSells } from "@/hooks/useProtocols";
import { Plus, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CrossSellSuggestionsProps {
  productId: string;
  onAddProduct?: (product: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
  }) => void;
  className?: string;
  compact?: boolean;
}

export function CrossSellSuggestions({
  productId,
  onAddProduct,
  className,
  compact = false,
}: CrossSellSuggestionsProps) {
  const { data: crossSells = [], isLoading } = useCrossSells(productId);

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center py-4", className)}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (crossSells.length === 0) {
    return null;
  }

  // Helper to get first image from images array
  const getImageUrl = (images: string[] | null): string | null => {
    return images && images.length > 0 ? images[0] : null;
  };

  if (compact) {
    return (
      <div className={cn("space-y-2", className)}>
        <p className="text-sm font-medium flex items-center gap-1.5 text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          Frequentemente comprados juntos
        </p>
        <div className="flex flex-wrap gap-2">
          {crossSells.map((cs: any) => {
            const imageUrl = getImageUrl(cs.target_product?.images);
            return (
              <Button
                key={cs.id}
                variant="outline"
                size="sm"
                className="h-auto py-1.5 px-2 gap-2"
                onClick={() => onAddProduct?.({
                  id: cs.target_product.id,
                  name: cs.target_product.name,
                  price: cs.target_product.base_price,
                  image_url: imageUrl,
                })}
              >
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt=""
                    className="w-6 h-6 rounded object-cover"
                  />
                )}
                <span className="text-xs truncate max-w-[120px]">
                  {cs.target_product.name}
                </span>
                <Plus className="h-3 w-3" />
              </Button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          Produtos Recomendados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {crossSells.map((cs: any) => {
          const imageUrl = getImageUrl(cs.target_product?.images);
          return (
            <div
              key={cs.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={cs.target_product.name}
                  className="w-12 h-12 rounded-md object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {cs.target_product.name}
                </p>
                {cs.reason && (
                  <p className="text-xs text-muted-foreground truncate">
                    {cs.reason}
                  </p>
                )}
                <p className="text-sm font-semibold text-primary">
                  {cs.target_product.base_price.toLocaleString("pt-PT", {
                    style: "currency",
                    currency: "EUR",
                  })}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0"
                onClick={() => onAddProduct?.({
                  id: cs.target_product.id,
                  name: cs.target_product.name,
                  price: cs.target_product.base_price,
                  image_url: imageUrl,
                })}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
