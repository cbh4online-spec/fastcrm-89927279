import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";

interface PostPurchaseCrossSellProps {
  products: { id: string; name: string; price: number; image_url?: string }[];
  currency?: string;
  onAddToCart?: (productId: string) => void;
}

export function PostPurchaseCrossSell({ products, currency = "EUR", onAddToCart }: PostPurchaseCrossSellProps) {
  if (!products.length) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-center">Clientes que compraram isto também compraram...</h3>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {products.map((p) => (
          <Card key={p.id} className="overflow-hidden">
            {p.image_url && <img src={p.image_url} alt={p.name} className="h-32 w-full object-cover" />}
            <CardContent className="p-3 space-y-2">
              <p className="text-sm font-medium">{p.name}</p>
              <div className="flex items-center justify-between">
                <span className="font-bold text-primary">{p.price.toFixed(2)} {currency}</span>
                {onAddToCart && (
                  <Button size="sm" variant="outline" onClick={() => onAddToCart(p.id)}>
                    <ShoppingCart className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
