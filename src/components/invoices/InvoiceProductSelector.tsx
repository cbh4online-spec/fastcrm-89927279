import { useState, useMemo } from "react";
import { Search, Package, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useProducts } from "@/hooks/useProducts";
import { useProductCategoriesList } from "@/hooks/useProductCategories";
import type { Product } from "@/types/product";

interface InvoiceProductSelectorProps {
  selectedProductIds: string[];
  onAddProduct: (product: Product) => void;
  onRemoveProduct: (productId: string) => void;
}

export function InvoiceProductSelector({
  selectedProductIds,
  onAddProduct,
  onRemoveProduct,
}: InvoiceProductSelectorProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const { data: products, isLoading } = useProducts({
    status: "active",
    search: search || undefined,
  });
  const { data: categories } = useProductCategoriesList();

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!categoryFilter) return products;
    return products.filter((p) => p.category === categoryFilter);
  }, [products, categoryFilter]);

  const handleProductClick = (product: Product) => {
    if (selectedProductIds.includes(product.id)) {
      onRemoveProduct(product.id);
    } else {
      onAddProduct(product);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency: "EUR",
    }).format(price);
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar produtos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Category Filter */}
      {categories && categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <Button
            variant={categoryFilter === null ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setCategoryFilter(null)}
          >
            Todos
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={categoryFilter === cat.name ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setCategoryFilter(cat.name)}
            >
              {cat.name}
            </Button>
          ))}
        </div>
      )}

      {/* Products Grid */}
      <ScrollArea className="h-[200px]">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[150px] text-center">
            <Package className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">Sem produtos encontrados</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filteredProducts.map((product) => {
              const isSelected = selectedProductIds.includes(product.id);
              return (
                <Card
                  key={product.id}
                  className={`p-2 cursor-pointer transition-all hover:shadow-md ${
                    isSelected
                      ? "ring-2 ring-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => handleProductClick(product)}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{product.name}</p>
                      <p className="text-xs text-primary font-semibold">
                        {formatPrice(product.base_price || 0)}
                      </p>
                    </div>
                    {isSelected && (
                      <Badge variant="default" className="h-5 w-5 p-0 flex items-center justify-center shrink-0">
                        <Check className="h-3 w-3" />
                      </Badge>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Selection Count */}
      <div className="text-xs text-muted-foreground text-center pt-2 border-t">
        {selectedProductIds.length} produto(s) selecionado(s)
      </div>
    </div>
  );
}
