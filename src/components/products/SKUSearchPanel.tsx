import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Check, ExternalLink, Package } from "lucide-react";
import { useProductAIAssistant } from "@/hooks/useProductAIAssistant";

interface SKUSearchPanelProps {
  sku: string;
  onApplyName: (name: string) => void;
  onApplyPrice: (price: number) => void;
  onApplyDescription: (description: string) => void;
  onApplyCategory: (category: string) => void;
  onApplyAll: (data: {
    name?: string;
    price?: number;
    description?: string;
    category?: string;
  }) => void;
}

export function SKUSearchPanel({
  sku,
  onApplyName,
  onApplyPrice,
  onApplyDescription,
  onApplyCategory,
  onApplyAll,
}: SKUSearchPanelProps) {
  const [appliedItems, setAppliedItems] = useState<Set<string>>(new Set());
  const { searchBySKU } = useProductAIAssistant();

  const handleSearch = () => {
    if (sku && sku.length >= 3) {
      searchBySKU.mutate(sku);
      setAppliedItems(new Set());
    }
  };

  const handleApplyName = () => {
    if (searchBySKU.data?.name) {
      onApplyName(searchBySKU.data.name);
      setAppliedItems((prev) => new Set(prev).add("name"));
    }
  };

  const handleApplyPrice = () => {
    if (searchBySKU.data?.suggestedPrice) {
      onApplyPrice(searchBySKU.data.suggestedPrice);
      setAppliedItems((prev) => new Set(prev).add("price"));
    }
  };

  const handleApplyDescription = () => {
    if (searchBySKU.data?.description) {
      onApplyDescription(searchBySKU.data.description);
      setAppliedItems((prev) => new Set(prev).add("description"));
    }
  };

  const handleApplyCategory = () => {
    if (searchBySKU.data?.category) {
      onApplyCategory(searchBySKU.data.category);
      setAppliedItems((prev) => new Set(prev).add("category"));
    }
  };

  const handleApplyAll = () => {
    if (searchBySKU.data) {
      onApplyAll({
        name: searchBySKU.data.name,
        price: searchBySKU.data.suggestedPrice,
        description: searchBySKU.data.description,
        category: searchBySKU.data.category,
      });
      setAppliedItems(new Set(["name", "price", "description", "category"]));
    }
  };

  if (!sku || sku.length < 3) {
    return (
      <Card className="p-4 bg-muted/30 border-dashed">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Search className="h-4 w-4" />
          <span className="text-sm">
            Insira um SKU/código para pesquisar na internet
          </span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Pesquisa SKU</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={handleSearch}
          disabled={searchBySKU.isPending}
        >
          {searchBySKU.isPending ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              A pesquisar...
            </>
          ) : (
            <>
              <Search className="h-3 w-3 mr-1" />
              Pesquisar
            </>
          )}
        </Button>
      </div>

      {searchBySKU.isPending ? (
        <div className="flex items-center gap-2 text-muted-foreground py-4 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">A pesquisar "{sku}"...</span>
        </div>
      ) : searchBySKU.data ? (
        searchBySKU.data.found ? (
          <div className="space-y-4">
            {/* Product Found */}
            <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="p-2 bg-primary/10 rounded">
                <Package className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="text-xs">
                    Encontrado
                  </Badge>
                </div>
                {searchBySKU.data.name && (
                  <h4 className="font-medium text-sm truncate">{searchBySKU.data.name}</h4>
                )}
                {searchBySKU.data.priceRange && (
                  <p className="text-sm text-muted-foreground">
                    €{searchBySKU.data.priceRange.min} - €{searchBySKU.data.priceRange.max}
                  </p>
                )}
                {searchBySKU.data.category && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Categoria: {searchBySKU.data.category}
                  </p>
                )}
                {searchBySKU.data.source && (
                  <a
                    href={searchBySKU.data.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-1"
                  >
                    Ver fonte <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Description */}
            {searchBySKU.data.description && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Descrição:</span>
                <p className="text-sm text-muted-foreground bg-muted/50 rounded p-2 line-clamp-3">
                  {searchBySKU.data.description}
                </p>
              </div>
            )}

            {/* Apply buttons */}
            <div className="flex flex-wrap gap-2">
              {searchBySKU.data.name && (
                <Button
                  type="button"
                  variant={appliedItems.has("name") ? "secondary" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleApplyName}
                >
                  {appliedItems.has("name") ? <Check className="h-3 w-3 mr-1" /> : null}
                  Usar Nome
                </Button>
              )}
              {searchBySKU.data.suggestedPrice && (
                <Button
                  type="button"
                  variant={appliedItems.has("price") ? "secondary" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleApplyPrice}
                >
                  {appliedItems.has("price") ? <Check className="h-3 w-3 mr-1" /> : null}
                  Usar Preço
                </Button>
              )}
              {searchBySKU.data.description && (
                <Button
                  type="button"
                  variant={appliedItems.has("description") ? "secondary" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleApplyDescription}
                >
                  {appliedItems.has("description") ? <Check className="h-3 w-3 mr-1" /> : null}
                  Usar Descrição
                </Button>
              )}
              {searchBySKU.data.category && (
                <Button
                  type="button"
                  variant={appliedItems.has("category") ? "secondary" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleApplyCategory}
                >
                  {appliedItems.has("category") ? <Check className="h-3 w-3 mr-1" /> : null}
                  Usar Categoria
                </Button>
              )}
              <Button
                type="button"
                variant="default"
                size="sm"
                className="h-7 text-xs"
                onClick={handleApplyAll}
              >
                Usar Tudo
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground py-4 text-center">
            Nenhum resultado encontrado para "{sku}"
          </div>
        )
      ) : searchBySKU.isError ? (
        <div className="text-sm text-destructive py-2">
          Erro na pesquisa. Tente novamente.
        </div>
      ) : null}
    </Card>
  );
}
