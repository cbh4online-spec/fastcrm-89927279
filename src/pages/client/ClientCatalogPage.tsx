import { useState } from "react";
import { ClientLayout } from "@/components/client-portal/ClientLayout";
import { EditorialPageHeader } from "@/components/client-portal/EditorialPageHeader";
import { useClientAuth } from "@/hooks/client-portal/useClientAuth";
import { useClientProducts } from "@/hooks/client-portal/useClientProducts";
import { useCart } from "@/contexts/CartContext";
import { ProductDetailModal } from "@/components/client-portal/catalog/ProductDetailModal";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  Package, 
  Plus, 
  ShoppingCart,
  Loader2,
  Filter,
  X
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";

export default function ClientCatalogPage() {
  const { clientUser } = useClientAuth();
  const { 
    products, 
    loading, 
    filters, 
    setFilters, 
    categories,
    functions,
    pathologies,
    lines,
    tier,
    discountPercentage,
  } = useClientProducts(clientUser?.workspace_id, clientUser?.id);
  const { addItem, itemCount } = useCart();
  
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);

  const handleAddToCart = (product: any, qty: number = 1) => {
    const imageUrl = product.images?.length > 0 
      ? product.images[product.primary_image_index || 0] 
      : null;
    
    const unitPrice = product.effective_price ?? product.base_price;
    
    addItem({
      product_id: product.id,
      product_name: product.name,
      product_sku: product.sku,
      product_image_url: imageUrl,
      quantity: qty,
      unit_price_net: unitPrice,
      vat_rate: 23,
    });
    
    toast.success(`${product.name} adicionado ao carrinho`);
    setSelectedProduct(null);
  };

  const clearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = filters.search || filters.category || filters.function || filters.pathology || filters.line || filters.tag;

  const handleTagClick = (tag: string) => {
    setFilters({ ...filters, tag });
  };

  return (
    <ClientLayout>
      <div className="space-y-8">
        <EditorialPageHeader
          eyebrow="Portal Profissional · Catálogo"
          title="Catálogo de Produtos"
          subtitle={
            <>
              {products.length} produtos disponíveis
              {tier && (
                <span className="ml-2 inline-flex items-center">
                  ·{" "}
                  <Badge
                    variant="secondary"
                    className="ml-2 text-xs"
                    style={{
                      backgroundColor: `${tier.color}20`,
                      color: tier.color,
                      borderColor: `${tier.color}40`,
                    }}
                  >
                    {tier.name} ({discountPercentage}% desc.)
                  </Badge>
                </span>
              )}
            </>
          }
          actions={
            <>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="sm:hidden rounded-full border-[hsl(var(--editorial-border))]"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
              {itemCount > 0 && (
                <Button
                  variant="outline"
                  className="rounded-full border-[hsl(var(--editorial-border))] hover:bg-[hsl(var(--editorial-champagne))]/40"
                  asChild
                >
                  <a href="/client/cart">
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    {itemCount} no carrinho
                  </a>
                </Button>
              )}
            </>
          }
        />

        {/* Filters */}
        <Card className={`${showFilters ? "block" : "hidden sm:block"} border-[hsl(var(--editorial-border))]/60`}>
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
              {/* Search */}
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar produtos..."
                  value={filters.search || ""}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-9"
                />
              </div>

              {/* Line Filter */}
              {lines.length > 0 && (
                <Select
                  value={filters.line || "all"}
                  onValueChange={(value) => setFilters({ ...filters, line: value === "all" ? undefined : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Linha" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as linhas</SelectItem>
                    {lines.map((line) => (
                      <SelectItem key={line} value={line}>{line}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Category Filter */}
              <Select
                value={filters.category || "all"}
                onValueChange={(value) => setFilters({ ...filters, category: value === "all" ? undefined : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Function Filter */}
              {functions.length > 0 && (
                <Select
                  value={filters.function || "all"}
                  onValueChange={(value) => setFilters({ ...filters, function: value === "all" ? undefined : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Função" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as funções</SelectItem>
                    {functions.map((func) => (
                      <SelectItem key={func} value={func}>{func}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Pathology Filter */}
              {pathologies.length > 0 && (
                <Select
                  value={filters.pathology || "all"}
                  onValueChange={(value) => setFilters({ ...filters, pathology: value === "all" ? undefined : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Patologia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as patologias</SelectItem>
                    {pathologies.map((path) => (
                      <SelectItem key={path} value={path}>{path}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {hasActiveFilters && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Filtros ativos:</span>
                {filters.tag && (
                  <Badge variant="default" className="gap-1 pl-2 pr-1 py-1">
                    Tag: {filters.tag}
                    <button
                      onClick={() => setFilters({ ...filters, tag: undefined })}
                      className="ml-1 hover:bg-primary-foreground/20 rounded-sm p-0.5"
                      aria-label={`Remover tag ${filters.tag}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Limpar todos
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Products Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">
              {hasActiveFilters 
                ? "Nenhum produto encontrado com os filtros selecionados."
                : "Nenhum produto disponível."
              }
            </p>
            {hasActiveFilters && (
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Limpar filtros
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const imageUrl = product.images?.length > 0 
                ? product.images[product.primary_image_index || 0] 
                : null;

              return (
                <Card 
                  key={product.id} 
                  className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => setSelectedProduct(product)}
                >
                  {/* Product Image */}
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    {imageUrl ? (
                      <img 
                        src={imageUrl} 
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-16 w-16 text-muted-foreground/30" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                      {product.category && (
                        <Badge variant="secondary">
                          {product.category}
                        </Badge>
                      )}
                      {(product as any).line && (
                        <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
                          {(product as any).line}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <CardContent className="p-4">
                    <h3 className="font-semibold line-clamp-2 mb-1">{product.name}</h3>
                    {product.sku && (
                      <p className="text-xs text-muted-foreground mb-2">SKU: {product.sku}</p>
                    )}
                    {product.short_description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {product.short_description}
                      </p>
                    )}
                    <div className="flex items-end justify-between gap-2">
                      <div className="space-y-0.5">
                        {product.compare_at_price != null && product.compare_at_price > 0 && (
                          <p className="text-[11px] text-muted-foreground leading-tight">
                            PVP recomendado{" "}
                            <span className="font-medium text-foreground/70">
                              {formatCurrency(product.compare_at_price)}
                            </span>{" "}
                            <span className="text-[10px]">c/IVA</span>
                          </p>
                        )}
                        <div className="flex items-baseline gap-2">
                          <p className="text-lg font-bold text-primary leading-none">
                            {formatCurrency(product.effective_price ?? product.base_price)}
                          </p>
                          {product.has_discount && (
                            <span className="text-xs text-muted-foreground line-through">
                              {formatCurrency(product.base_price)}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-tight">
                          Preço base s/IVA
                        </p>
                      </div>
                      <Button 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(product);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Premium Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        open={!!selectedProduct}
        onOpenChange={(open) => { if (!open) setSelectedProduct(null); }}
        onAddToCart={handleAddToCart}
        effectivePrice={selectedProduct?.effective_price}
        hasDiscount={selectedProduct?.has_discount}
        onTagClick={handleTagClick}
        activeTag={filters.tag ?? null}
      />
    </ClientLayout>
  );
}
