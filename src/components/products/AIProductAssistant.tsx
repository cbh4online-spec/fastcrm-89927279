import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Sparkles, Check, RefreshCw, Tag, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useProductAIAssistant } from "@/hooks/useProductAIAssistant";
import { useDebounce } from "@/hooks/useDebounce";
import type { ProductType } from "@/types/product";
import type { ProductCategory } from "@/hooks/useProductCategories";

interface AIProductAssistantProps {
  productName: string;
  currentCategory?: string;
  currentProductType?: ProductType;
  currentBillingType?: string;
  existingCategories?: ProductCategory[];
  onApplyCategory: (category: string) => void;
  onApplyExistingCategory?: (category: ProductCategory) => void;
  onApplyPrice: (price: number) => void;
  onApplyDescription: (description: string) => void;
  onApplyProductType: (type: ProductType) => void;
  onApplyBillingType?: (type: string) => void;
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

const billingTypeLabels: Record<string, string> = {
  "one-off": "Único",
  "monthly": "Mensal",
  "quarterly": "Trimestral",
  "yearly": "Anual",
  "per-session": "Por Sessão",
};

export function AIProductAssistant({
  productName,
  currentCategory,
  currentProductType,
  currentBillingType,
  existingCategories,
  onApplyCategory,
  onApplyExistingCategory,
  onApplyPrice,
  onApplyDescription,
  onApplyProductType,
  onApplyBillingType,
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

  const safeApply = (key: string, label: string, fn: () => void) => {
    try {
      fn();
      setAppliedItems((prev) => new Set(prev).add(key));
      toast.success(`${label} aplicado`);
    } catch (err) {
      console.error(`[AIProductAssistant] apply ${key} failed`, err);
      toast.error(`Não foi possível aplicar ${label.toLowerCase()}`);
    }
  };

  const handleApplyCategory = (cat: string) => {
    safeApply(`category-${cat}`, "Categoria", () => onApplyCategory(cat));
  };

  const handleApplyExistingCategory = (matchedName: string) => {
    const matchedCategory = existingCategories?.find(
      c => c.name.toLowerCase() === matchedName.toLowerCase()
    );
    if (matchedCategory && onApplyExistingCategory) {
      safeApply("existingCategory", "Categoria", () => onApplyExistingCategory(matchedCategory));
    } else {
      safeApply(`category-${matchedName}`, "Categoria", () => onApplyCategory(matchedName));
    }
  };

  const handleApplyPrice = () => {
    if (suggestFromName.data?.suggestedPrice) {
      safeApply("price", "Preço", () => onApplyPrice(suggestFromName.data!.suggestedPrice!));
    }
  };

  const handleApplyDescription = () => {
    if (suggestFromName.data?.description) {
      safeApply("description", "Descrição", () => onApplyDescription(suggestFromName.data!.description!));
    }
  };

  const handleApplyProductType = () => {
    if (suggestFromName.data?.productType) {
      safeApply("productType", "Tipo de produto", () =>
        onApplyProductType(suggestFromName.data!.productType as ProductType)
      );
    }
  };

  const handleApplyBillingType = () => {
    if (suggestFromName.data?.billingType && onApplyBillingType) {
      safeApply("billingType", "Cobrança", () => onApplyBillingType(suggestFromName.data!.billingType!));
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
      <Card className="p-4 rounded-2xl border border-dashed border-border bg-card">
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
    <Card className="p-4 space-y-4 rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Assistente IA</span>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
            {isActive ? "Ativo" : "Inativo"}
          </Badge>
        </div>
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

      {suggestFromName.isPending ? (
        <div className="space-y-4" aria-busy="true" aria-live="polite">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>A analisar "{productName}"...</span>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-8 w-48 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-40" />
            <div className="flex flex-wrap gap-1.5">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-16 w-full rounded-md" />
          </div>
        </div>
      ) : suggestFromName.data ? (
        <div className="space-y-4">
          {/* Matched Existing Category - Priority */}
          {suggestFromName.data.matchedCategoryName && (
            <div className="space-y-2">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Tag className="h-3 w-3" />
                Categoria existente sugerida
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={`h-8 text-sm rounded-full ${appliedItems.has("existingCategory") ? "border-primary text-primary" : ""}`}
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
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {suggestFromName.data.matchedCategoryName
                  ? "Ou criar nova categoria"
                  : "Categorias sugeridas"}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {suggestFromName.data.categories.map((cat) => {
                  const applied = appliedItems.has(`category-${cat}`);
                  return (
                    <Badge
                      key={cat}
                      variant="outline"
                      className={`cursor-pointer rounded-full transition-colors ${applied ? "border-primary text-primary" : "hover:border-primary/40"}`}
                      onClick={() => handleApplyCategory(cat)}
                    >
                      {applied && <Check className="h-3 w-3 mr-1" />}
                      {cat}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}


          {/* Price suggestion */}
          {suggestFromName.data.priceRange && (
            <div className="space-y-2">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Preço sugerido</span>
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
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Descrição sugerida</span>
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
          {suggestFromName.data.productType && (
            <div className="space-y-2">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Tipo sugerido</span>
              <Button
                type="button"
                variant={appliedItems.has("productType") || suggestFromName.data.productType === currentProductType ? "secondary" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={handleApplyProductType}
                disabled={suggestFromName.data.productType === currentProductType}
              >
                {appliedItems.has("productType") || suggestFromName.data.productType === currentProductType ? (
                  <>
                    <Check className="h-3 w-3 mr-1" /> {productTypeLabels[suggestFromName.data.productType] || suggestFromName.data.productType}
                  </>
                ) : (
                  `Usar "${productTypeLabels[suggestFromName.data.productType] || suggestFromName.data.productType}"`
                )}
              </Button>
            </div>
          )}

          {/* Billing Type */}
          {suggestFromName.data.billingType && onApplyBillingType && (
            <div className="space-y-2">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Cobrança sugerida</span>
              <Button
                type="button"
                variant={appliedItems.has("billingType") || suggestFromName.data.billingType === currentBillingType ? "secondary" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={handleApplyBillingType}
                disabled={suggestFromName.data.billingType === currentBillingType}
              >
                {appliedItems.has("billingType") || suggestFromName.data.billingType === currentBillingType ? (
                  <>
                    <Check className="h-3 w-3 mr-1" /> {billingTypeLabels[suggestFromName.data.billingType] || suggestFromName.data.billingType}
                  </>
                ) : (
                  `Usar "${billingTypeLabels[suggestFromName.data.billingType] || suggestFromName.data.billingType}"`
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
