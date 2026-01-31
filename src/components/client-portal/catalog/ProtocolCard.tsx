import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, ShoppingCart, Percent, ChevronRight } from "lucide-react";
import type { ProductProtocol } from "@/types/protocol";
import { calculateProtocolTotal } from "@/types/protocol";
import { cn } from "@/lib/utils";

interface ProtocolCardProps {
  protocol: ProductProtocol;
  onAddToCart?: () => void;
  onViewDetails?: () => void;
  compact?: boolean;
  className?: string;
}

export function ProtocolCard({
  protocol,
  onAddToCart,
  onViewDetails,
  compact = false,
  className,
}: ProtocolCardProps) {
  const products = protocol.products || [];
  const { subtotal, discount, total } = calculateProtocolTotal(
    products,
    protocol.discount_percentage
  );
  const productCount = products.reduce((sum, p) => sum + p.quantity, 0);

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer",
          className
        )}
        onClick={onViewDetails}
      >
        {protocol.image_url ? (
          <img
            src={protocol.image_url}
            alt={protocol.name}
            className="w-12 h-12 rounded-md object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center">
            <Package className="h-6 w-6 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{protocol.name}</p>
          <p className="text-xs text-muted-foreground">
            {productCount} produto{productCount !== 1 && "s"}
          </p>
        </div>
        {protocol.discount_percentage > 0 && (
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            -{protocol.discount_percentage}%
          </Badge>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Image / Header */}
      <div className="relative aspect-[16/9] bg-gradient-to-br from-primary/10 to-primary/5">
        {protocol.image_url ? (
          <img
            src={protocol.image_url}
            alt={protocol.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-16 w-16 text-primary/40" />
          </div>
        )}
        {protocol.discount_percentage > 0 && (
          <Badge 
            className="absolute top-3 right-3 bg-green-500 text-white"
          >
            <Percent className="h-3 w-3 mr-1" />
            {protocol.discount_percentage}% desconto
          </Badge>
        )}
        {protocol.category && (
          <Badge 
            variant="secondary" 
            className="absolute top-3 left-3"
          >
            {protocol.category}
          </Badge>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Title & Description */}
        <div>
          <h3 className="font-semibold text-lg">{protocol.name}</h3>
          {protocol.short_description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {protocol.short_description}
            </p>
          )}
        </div>

        {/* Product count */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Package className="h-4 w-4" />
          <span>
            {productCount} produto{productCount !== 1 && "s"} incluído{productCount !== 1 && "s"}
          </span>
        </div>

        {/* Price */}
        <div className="flex items-end justify-between">
          <div>
            {discount > 0 && (
              <p className="text-sm text-muted-foreground line-through">
                {subtotal.toLocaleString("pt-PT", {
                  style: "currency",
                  currency: "EUR",
                })}
              </p>
            )}
            <p className="text-xl font-bold text-primary">
              {total.toLocaleString("pt-PT", {
                style: "currency",
                currency: "EUR",
              })}
            </p>
          </div>
          
          <div className="flex gap-2">
            {onViewDetails && (
              <Button variant="outline" size="sm" onClick={onViewDetails}>
                Ver detalhes
              </Button>
            )}
            {onAddToCart && (
              <Button size="sm" onClick={onAddToCart} className="gap-1">
                <ShoppingCart className="h-4 w-4" />
                Adicionar
              </Button>
            )}
          </div>
        </div>

        {/* Tags */}
        {protocol.tags && protocol.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2 border-t">
            {protocol.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {protocol.tags.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{protocol.tags.length - 4}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
