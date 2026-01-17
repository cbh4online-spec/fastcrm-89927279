import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Check, RefreshCw, Tag } from "lucide-react";
import { useProductAIAssistant } from "@/hooks/useProductAIAssistant";
import { useDebounce } from "@/hooks/useDebounce";
import type { ProductType } from "@/types/product";
import type { ProductCategory } from "@/hooks/useProductCategories";

interface AIProductAssistantProps {
  productName: string;
  currentCategory?: string;
  currentProductType?: ProductType;
  existingCategories?: ProductCategory[];
  onApplyCategory: (category: string) => void;
  onApplyExistingCategory?: (category: ProductCategory) => void;
  onApplyPrice: (price: number) => void;
  onApplyDescription: (description: string) => void;
  onApplyProductType: (type: ProductType) => void;
}

const productTypeLabels: Record<string, string> = {
  simple: "Simples",
  formacao: "Formação",
  sessions: "Sessões",
  physical: "Físico",
  programa: "Programa",
  recurring: "Recorrente",
  composite: "Bundle",
};

export function AIProductAssistant({
  productName,
  currentCategory,
  currentProductType,
  existingCategories,
  onApplyCategory,
  onApplyExistingCategory,
  onApplyPrice,
  onApplyDescription,
  onApplyProductType,
}: AIProductAssistantProps) {
  const [isActive, setIsActive] = useState(true);
  const [appliedItems, setAppliedItems] = useState<Set<string>>(new Set());
  const debouncedName = useDebounce(productName, 600);
  const { suggestFromName } = useProductAIAssistant();

  useEffect(() => {
    if (debouncedName && debouncedName.length >= 3 && isActive) {
      const categoryNames = existingCategories?.map(c => c.name) || [];
      suggestFromName.mutate({
        productName: debouncedName,
        category: currentCategory,
        productType: currentProductType,
        existingCategories: categoryNames,
      });
      setAppliedItems(new Set());
    }
  }, [debouncedName, isActive]);

  const handleApplyCategory = (cat: string) => {
    onApplyCategory(cat);
    setAppliedItems((prev) => new Set(prev).add(`category-${cat}`));
  };

  const handleApplyExistingCategory = (matchedName: string) => {
    const matchedCategory = existingCategories?.find(
      c => c.name.toLowerCase() === matchedName.toLowerCase()
    );
    if (matchedCategory && onApplyExistingCategory) {
      onApplyExistingCategory(matchedCategory);
      setAppliedItems((prev) => new Set(prev).add("existingCategory"));
    } else {
      // Fallback to just setting the name
      onApplyCategory(matchedName);
      setAppliedItems((prev) => new Set(prev).add(`category-${matchedName}`));
    }
  };

  const handleApplyPrice = () => {
    if (suggestFromName.data?.suggestedPrice) {
      onApplyPrice(suggestFromName.data.suggestedPrice);
      setAppliedItems((prev) => new Set(prev).add("price"));
    }
  };

  const handleApplyDescription = () => {
    if (suggestFromName.data?.description) {
      onApplyDescription(suggestFromName.data.description);
      setAppliedItems((prev) => new Set(prev).add("description"));
    }
  };

  const handleApplyProductType = () => {
    if (suggestFromName.data?.productType) {
      onApplyProductType(suggestFromName.data.productType as ProductType);
      setAppliedItems((prev) => new Set(prev).add("productType"));
    }
  };

  const handleRefresh = () => {
    if (productName && productName.length >= 3) {
      const categoryNames = existingCategories?.map(c => c.name) || [];
      suggestFromName.mutate({
        productName,
        category: currentCategory,
        productType: currentProductType,
        existingCategories: categoryNames,
      });
      setAppliedItems(new Set());
    }
  };

  if (!productName || productName.length < 3) {
    return (
      <Card className="p-4 bg-muted/30 border-dashed">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          <span className="text-sm">
            Escreva o nome do produto para receber sugestões IA
          </span>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Assistente IA</span>
          <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
            {isActive ? "Ativo" : "Inativo"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleRefresh}
            disabled={suggestFromName.isPending}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${suggestFromName.isPending ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {suggestFromName.isPending ? (
        <div className="flex items-center gap-2 text-muted-foreground py-4 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">A analisar "{productName}"...</span>
        </div>
      ) : suggestFromName.data ? (
        <div className="space-y-4">
          {/* Matched Existing Category - Priority */}
          {suggestFromName.data.matchedCategoryName && (
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Tag className="h-3 w-3" />
                Categoria existente sugerida:
              </span>
              <Button
                type="button"
                variant={appliedItems.has("existingCategory") ? "secondary" : "default"}
                size="sm"
                className="h-8 text-sm"
                onClick={() => handleApplyExistingCategory(suggestFromName.data!.matchedCategoryName!)}
              >
                {appliedItems.has("existingCategory") ? (
                  <>
                    <Check className="h-3 w-3 mr-1" /> Aplicado
                  </>
                ) : (
                  <>
                    <Tag className="h-3 w-3 mr-1" />
                    Usar "{suggestFromName.data.matchedCategoryName}"
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Suggested New Categories */}
          {suggestFromName.data.categories && suggestFromName.data.categories.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">
                {suggestFromName.data.matchedCategoryName 
                  ? "Ou criar nova categoria:" 
                  : "Categorias sugeridas:"}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {suggestFromName.data.categories.map((cat) => (
                  <Badge
                    key={cat}
                    variant={appliedItems.has(`category-${cat}`) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/10 transition-colors"
                    onClick={() => handleApplyCategory(cat)}
                  >
                    {appliedItems.has(`category-${cat}`) && <Check className="h-3 w-3 mr-1" />}
                    {cat}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Price suggestion */}
          {suggestFromName.data.priceRange && (
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Preço sugerido:</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  €{suggestFromName.data.priceRange.min} - €{suggestFromName.data.priceRange.max}
                </span>
                <Button
                  type="button"
                  variant={appliedItems.has("price") ? "secondary" : "outline"}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleApplyPrice}
                >
                  {appliedItems.has("price") ? (
                    <>
                      <Check className="h-3 w-3 mr-1" /> Aplicado
                    </>
                  ) : (
                    `Usar €${suggestFromName.data.suggestedPrice}`
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Description */}
          {suggestFromName.data.description && (
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Descrição sugerida:</span>
              <div className="flex flex-col gap-2">
                <p className="text-sm text-muted-foreground bg-muted/50 rounded p-2">
                  "{suggestFromName.data.description}"
                </p>
                <Button
                  type="button"
                  variant={appliedItems.has("description") ? "secondary" : "outline"}
                  size="sm"
                  className="h-7 text-xs w-fit"
                  onClick={handleApplyDescription}
                >
                  {appliedItems.has("description") ? (
                    <>
                      <Check className="h-3 w-3 mr-1" /> Aplicada
                    </>
                  ) : (
                    "Usar descrição"
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Product Type */}
          {suggestFromName.data.productType && suggestFromName.data.productType !== currentProductType && (
            <div className="space-y-2">
              <span className="text-xs text-muted-foreground">Tipo sugerido:</span>
              <Button
                type="button"
                variant={appliedItems.has("productType") ? "secondary" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={handleApplyProductType}
              >
                {appliedItems.has("productType") ? (
                  <>
                    <Check className="h-3 w-3 mr-1" /> Aplicado
                  </>
                ) : (
                  `Usar "${productTypeLabels[suggestFromName.data.productType] || suggestFromName.data.productType}"`
                )}
              </Button>
            </div>
          )}
        </div>
      ) : suggestFromName.isError ? (
        <div className="text-sm text-destructive py-2">
          Erro ao obter sugestões. Tente novamente.
        </div>
      ) : null}
    </Card>
  );
}
