import { useState, useMemo } from "react";
import { Search, Package, BookOpen, Users, Briefcase, Wrench, Layers, Grid3X3, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "./ProductCard";
import { useProducts, useProductCategories } from "@/hooks/useProducts";
import type { Product } from "@/types/product";
import { cn } from "@/lib/utils";

interface POSProductSelectorProps {
  selectedProductIds: string[];
  onAddProduct: (product: Product) => void;
  onRemoveProduct: (productId: string) => void;
}

const productTypeFilters = [
  { value: "all", label: "Todos", icon: Grid3X3 },
  { value: "service", label: "Serviços", icon: Briefcase },
  { value: "training", label: "Formações", icon: BookOpen },
  { value: "program", label: "Programas", icon: Users },
  { value: "consulting", label: "Consultoria", icon: Wrench },
  { value: "physical", label: "Físicos", icon: Package },
  { value: "digital", label: "Digitais", icon: Layers },
];

export function POSProductSelector({
  selectedProductIds,
  onAddProduct,
  onRemoveProduct,
}: POSProductSelectorProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const { data: products, isLoading } = useProducts({
    status: "active",
    productType: typeFilter !== "all" ? typeFilter : undefined,
    search: search || undefined,
  });

  const { data: categories } = useProductCategories();

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    
    let filtered = products;
    
    if (categoryFilter !== "all") {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }
    
    return filtered;
  }, [products, categoryFilter]);

  const handleProductClick = (product: Product) => {
    if (selectedProductIds.includes(product.id)) {
      onRemoveProduct(product.id);
    } else {
      onAddProduct(product);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Pesquisar produtos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Type Filters */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {productTypeFilters.map((filter) => {
          const Icon = filter.icon;
          return (
            <Button
              key={filter.value}
              variant={typeFilter === filter.value ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={() => setTypeFilter(filter.value)}
            >
              <Icon className="h-3 w-3" />
              {filter.label}
            </Button>
          );
        })}
      </div>

      {/* Category Filters */}
      {categories && categories.length > 0 && (
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
          <Button
            variant={categoryFilter === "all" ? "secondary" : "ghost"}
            size="sm"
            className="h-6 text-xs shrink-0"
            onClick={() => setCategoryFilter("all")}
          >
            Todas Categorias
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={categoryFilter === cat ? "secondary" : "ghost"}
              size="sm"
              className="h-6 text-xs shrink-0"
              onClick={() => setCategoryFilter(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      )}

      {/* Products Grid */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">Nenhum produto encontrado</p>
            <p className="text-sm text-muted-foreground/70">
              Tente ajustar os filtros de pesquisa
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pr-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isSelected={selectedProductIds.includes(product.id)}
                onClick={() => handleProductClick(product)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Selection summary */}
      {selectedProductIds.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{selectedProductIds.length}</span>{" "}
            produto{selectedProductIds.length !== 1 ? "s" : ""} selecionado{selectedProductIds.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </div>
  );
}
