import { useState, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  ImageIcon,
  Tag,
  Loader2,
} from "lucide-react";
import { ProductCategory } from "@/hooks/useProductCategories";
import { useProducts } from "@/hooks/useProducts";
import { productTypeLabels, billingTypeLabels, type Product } from "@/types/product";

interface CategoryProductsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: ProductCategory | null;
  categories: ProductCategory[];
  onCategoryChange: (category: ProductCategory) => void;
  onViewProduct?: (product: Product) => void;
  onEditProduct?: (product: Product) => void;
}

export function CategoryProductsSheet({
  open,
  onOpenChange,
  category,
  categories,
  onCategoryChange,
  onViewProduct,
  onEditProduct,
}: CategoryProductsSheetProps) {
  const [searchValue, setSearchValue] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "price" | "updated">("name");

  const { data: products, isLoading } = useProducts({
    status: "active",
    category: category?.name || "",
  });

  // Filter products by category name and search
  const filteredProducts = useMemo(() => {
    if (!products || !category) return [];
    
    let filtered = products.filter(
      (p) => p.category?.toLowerCase() === category.name.toLowerCase()
    );

    if (searchValue) {
      const lower = searchValue.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(lower) ||
          p.sku?.toLowerCase().includes(lower) ||
          p.short_description?.toLowerCase().includes(lower)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "price":
          return (b.base_price || 0) - (a.base_price || 0);
        case "updated":
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [products, category, searchValue, sortBy]);

  const currentIndex = categories.findIndex((c) => c.id === category?.id);

  const handlePrevCategory = () => {
    if (currentIndex > 0) {
      onCategoryChange(categories[currentIndex - 1]);
    }
  };

  const handleNextCategory = () => {
    if (currentIndex < categories.length - 1) {
      onCategoryChange(categories[currentIndex + 1]);
    }
  };

  const formatCurrency = (value: number, currency = "EUR") => {
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency,
    }).format(value);
  };

  if (!category) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader className="space-y-4">
          {/* Category Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevCategory}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex-1 flex items-center gap-3">
              {category.image_url ? (
                <img
                  src={category.image_url}
                  alt={category.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: category.color || "#3B82F6" }}
                >
                  <Tag className="h-6 w-6 text-white" />
                </div>
              )}
              <div>
                <SheetTitle className="flex items-center gap-2">
                  {category.name}
                  <Badge variant={category.is_active ? "default" : "secondary"}>
                    {category.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </SheetTitle>
                {category.description && (
                  <p className="text-sm text-muted-foreground">
                    {category.description}
                  </p>
                )}
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextCategory}
              disabled={currentIndex === categories.length - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={cat.id === category.id ? "secondary" : "ghost"}
                size="sm"
                onClick={() => onCategoryChange(cat)}
                className="shrink-0"
              >
                <div
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: cat.color || "#3B82F6" }}
                />
                {cat.name}
              </Button>
            ))}
          </div>

          {/* Search and Sort */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Pesquisar nesta categoria..."
                className="pl-9"
              />
            </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Nome</SelectItem>
                <SelectItem value="price">Preço</SelectItem>
                <SelectItem value="updated">Recentes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-280px)] mt-4 -mx-6 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-1">Nenhum produto encontrado</h3>
              <p className="text-sm text-muted-foreground">
                {searchValue
                  ? "Tente ajustar a pesquisa"
                  : "Esta categoria ainda não tem produtos"}
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => onViewProduct?.(product)}
                >
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <div className="shrink-0">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-medium truncate">{product.name}</h4>
                          {product.sku && (
                            <p className="text-xs text-muted-foreground">
                              SKU: {product.sku}
                            </p>
                          )}
                        </div>
                        <span className="font-semibold shrink-0">
                          {formatCurrency(product.base_price, product.currency)}
                        </span>
                      </div>

                      {product.short_description && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                          {product.short_description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {productTypeLabels[product.product_type]}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {billingTypeLabels[product.billing_type]}
                        </Badge>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewProduct?.(product);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditProduct?.(product);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer Stats */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t">
          <span className="text-sm text-muted-foreground">
            {filteredProducts.length} produto(s) nesta categoria
          </span>
        </div>
      </SheetContent>
    </Sheet>
  );
}
