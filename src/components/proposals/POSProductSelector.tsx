import { useState, useMemo } from "react";
import { Search, Package, Grid3X3, Loader2 } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "./ProductCard";
import { useProducts, useProductCategories } from "@/hooks/useProducts";
import { useProductTypes } from "@/hooks/useProductSettings";
import type { Product } from "@/types/product";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/contexts/WorkspaceContext";

interface POSProductSelectorProps {
  selectedProductIds: string[];
  onAddProduct: (product: Product) => void;
  onRemoveProduct: (productId: string) => void;
}

// Icon mapping for dynamic resolution
const iconMap: Record<string, React.ElementType> = {
  Package: LucideIcons.Package,
  Repeat: LucideIcons.Repeat,
  Clock: LucideIcons.Clock,
  Layers: LucideIcons.Layers,
  GraduationCap: LucideIcons.GraduationCap,
  Boxes: LucideIcons.Boxes,
  Box: LucideIcons.Box,
  Briefcase: LucideIcons.Briefcase,
  Cloud: LucideIcons.Cloud,
  FileText: LucideIcons.FileText,
  RefreshCw: LucideIcons.RefreshCw,
  Key: LucideIcons.Key,
  Users: LucideIcons.Users,
  Wrench: LucideIcons.Wrench,
  BookOpen: LucideIcons.BookOpen,
  Building2: LucideIcons.Building2,
  Zap: LucideIcons.Zap,
  Settings: LucideIcons.Settings,
  Star: LucideIcons.Star,
  Tag: LucideIcons.Tag,
};

function getIcon(iconName: string): React.ElementType {
  return iconMap[iconName] || LucideIcons.Package;
}

export function POSProductSelector({
  selectedProductIds,
  onAddProduct,
  onRemoveProduct,
}: POSProductSelectorProps) {
  const { currentWorkspace } = useWorkspace();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Dynamic product types from database
  const { data: productTypesConfig, isLoading: isLoadingTypes } = useProductTypes();

  const { data: products, isLoading: isLoadingProducts } = useProducts({
    status: "active",
    productType: typeFilter !== "all" ? typeFilter : undefined,
    search: search || undefined,
  });

  const { data: categories, isLoading: isLoadingCategories } = useProductCategories();

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    
    let filtered = products;
    
    if (categoryFilter !== "all") {
      filtered = filtered.filter(p => p.category === categoryFilter);
    }
    
    return filtered;
  }, [products, categoryFilter]);

  // Verificar se workspace está disponível
  if (!currentWorkspace?.id) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-3" />
        <p className="text-muted-foreground">A carregar produtos...</p>
      </div>
    );
  }

  const handleProductClick = (product: Product) => {
    if (selectedProductIds.includes(product.id)) {
      onRemoveProduct(product.id);
    } else {
      onAddProduct(product);
    }
  };

  // Get active product types sorted by position
  const activeTypes = useMemo(() => {
    if (!productTypesConfig) return [];
    return productTypesConfig
      .filter(t => t.is_active)
      .sort((a, b) => a.position - b.position);
  }, [productTypesConfig]);

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

      {/* Type Filters - Dynamic from database */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        <Button
          variant={typeFilter === "all" ? "default" : "outline"}
          size="sm"
          className="h-7 text-xs gap-1.5"
          onClick={() => setTypeFilter("all")}
        >
          <Grid3X3 className="h-3 w-3" />
          Todos
        </Button>
        
        {isLoadingTypes ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-md" />
          ))
        ) : (
          activeTypes.map((type) => {
            const Icon = getIcon(type.icon);
            return (
              <Button
                key={type.id}
                variant={typeFilter === type.code ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => setTypeFilter(type.code)}
              >
                <Icon className="h-3 w-3" />
                {type.label}
              </Button>
            );
          })
        )}
      </div>

      {/* Category Filters */}
      {isLoadingCategories ? (
        <div className="flex gap-1.5 mb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-20 rounded-full" />
          ))}
        </div>
      ) : categories && categories.length > 0 ? (
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
      ) : null}

      {/* Products Grid */}
      <ScrollArea className="flex-1">
        {isLoadingProducts ? (
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
