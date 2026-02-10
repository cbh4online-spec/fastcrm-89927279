import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStoreCompare } from "@/contexts/StoreCompareContext";
import { Star, Check, X, Package, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStoreCart } from "@/contexts/StoreCartContext";
import { Link } from "react-router-dom";

interface StoreCompareModalProps {
  workspaceSlug: string;
  tierPricing?: any;
  reviewStats?: Map<string, { sum: number; count: number }>;
}

export function StoreCompareModal({ workspaceSlug, tierPricing, reviewStats }: StoreCompareModalProps) {
  const { items, removeItem, isOpen, setIsOpen } = useStoreCompare();
  const { addItem: addToCart } = useStoreCart();

  if (items.length < 2) return null;

  // Build comparison rows from specs
  const allSpecKeys = new Set<string>();
  items.forEach((p) => {
    if (p.specifications) {
      Object.keys(p.specifications).forEach((k) => allSpecKeys.add(k));
    }
  });

  const comparisonRows: { label: string; values: (string | null)[] }[] = [
    {
      label: "Preço",
      values: items.map((p) => `€${p.base_price.toFixed(2)}`),
    },
    {
      label: "Categoria",
      values: items.map((p) => p.category || "—"),
    },
    {
      label: "Tipo",
      values: items.map((p) => p.billing_type === "recurring" ? "Subscrição" : "Compra única"),
    },
    {
      label: "Stock",
      values: items.map((p) =>
        p.stock_status === "out_of_stock"
          ? "Esgotado"
          : p.track_stock && p.stock_quantity != null
          ? `${p.stock_quantity} unid.`
          : "Disponível"
      ),
    },
    ...Array.from(allSpecKeys).map((key) => ({
      label: key,
      values: items.map((p) => p.specifications?.[key] || "—"),
    })),
  ];

  // Review data
  const reviewRow = {
    label: "Avaliação",
    values: items.map((p) => {
      const data = reviewStats?.get(p.id);
      if (!data || data.count === 0) return "Sem avaliações";
      const avg = data.sum / data.count;
      return `${avg.toFixed(1)}★ (${data.count})`;
    }),
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Comparar Produtos</DialogTitle>
        </DialogHeader>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            {/* Product headers */}
            <thead>
              <tr>
                <th className="w-[140px] p-3 text-left text-sm font-medium text-muted-foreground align-top" />
                {items.map((product) => {
                  const imageUrl = product.images?.[product.primary_image_index ?? 0] || product.images?.[0];
                  return (
                    <th
                      key={product.id}
                      className="p-3 text-center align-top min-w-[200px]"
                    >
                      <div className="space-y-3">
                        <Link to={`/store/${workspaceSlug}/product/${product.id}`} onClick={() => setIsOpen(false)}>
                          <div className="mx-auto w-32 h-32 rounded-xl overflow-hidden bg-muted">
                            {imageUrl ? (
                              <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="h-10 w-10 text-muted-foreground/30" />
                              </div>
                            )}
                          </div>
                        </Link>
                        <Link
                          to={`/store/${workspaceSlug}/product/${product.id}`}
                          onClick={() => setIsOpen(false)}
                          className="block font-semibold text-sm hover:text-primary transition-colors"
                        >
                          {product.name}
                        </Link>
                        <p className="text-lg font-bold text-primary">
                          €{product.base_price.toFixed(2)}
                        </p>
                        <div className="flex gap-2 justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => {
                              addToCart({
                                productId: product.id,
                                name: product.name,
                                price: product.base_price,
                                currency: product.currency,
                                image: imageUrl,
                                sku: product.sku || undefined,
                              });
                            }}
                            disabled={product.stock_status === "out_of_stock"}
                          >
                            <ShoppingBag className="h-3.5 w-3.5 mr-1" />
                            Adicionar
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-xs text-muted-foreground"
                            onClick={() => removeItem(product.id)}
                          >
                            <X className="h-3.5 w-3.5 mr-1" />
                            Remover
                          </Button>
                        </div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            {/* Comparison rows */}
            <tbody>
              {/* Review row */}
              <tr className="border-t">
                <td className="p-3 text-sm font-medium text-muted-foreground">
                  {reviewRow.label}
                </td>
                {reviewRow.values.map((val, i) => (
                  <td key={i} className="p-3 text-center text-sm">
                    {val}
                  </td>
                ))}
              </tr>

              {comparisonRows.map((row, rowIndex) => {
                // Highlight best price
                const isPriceRow = row.label === "Preço";
                let bestIndex = -1;
                if (isPriceRow) {
                  const prices = items.map((p) => p.base_price);
                  bestIndex = prices.indexOf(Math.min(...prices));
                }

                return (
                  <tr
                    key={row.label}
                    className={cn("border-t", rowIndex % 2 === 0 ? "bg-muted/30" : "")}
                  >
                    <td className="p-3 text-sm font-medium text-muted-foreground">
                      {row.label}
                    </td>
                    {row.values.map((val, i) => (
                      <td
                        key={i}
                        className={cn(
                          "p-3 text-center text-sm",
                          isPriceRow && i === bestIndex && "font-bold text-primary"
                        )}
                      >
                        {val}
                        {isPriceRow && i === bestIndex && items.length > 1 && (
                          <Badge variant="outline" className="ml-2 text-[10px] text-primary border-primary/30">
                            Melhor preço
                          </Badge>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}

              {/* Benefits row */}
              <tr className="border-t">
                <td className="p-3 text-sm font-medium text-muted-foreground align-top">
                  Benefícios
                </td>
                {items.map((product) => (
                  <td key={product.id} className="p-3 align-top">
                    {product.benefits && product.benefits.length > 0 ? (
                      <ul className="space-y-1">
                        {product.benefits.map((b, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                            <Check className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                            {b}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
