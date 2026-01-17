import { useState } from "react";
import { Sparkles, Plus, RefreshCw, Loader2, Target, TrendingUp, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";
import { useSuggestProposalProducts } from "@/hooks/useProposalItems";

interface AIProductSuggestionsProps {
  opportunityTitle?: string;
  opportunityValue?: number;
  leadName?: string;
  companyName?: string;
  existingProductIds: string[];
  onAddProduct: (product: Product) => void;
}

export function AIProductSuggestions({
  opportunityTitle,
  opportunityValue,
  leadName,
  companyName,
  existingProductIds,
  onAddProduct,
}: AIProductSuggestionsProps) {
  const [hasGenerated, setHasGenerated] = useState(false);

  const { 
    suggestions, 
    isLoading, 
    generateSuggestions,
    error 
  } = useSuggestProposalProducts();

  const handleGenerate = async () => {
    await generateSuggestions({
      opportunityTitle,
      opportunityValue,
      leadName,
      companyName,
    });
    setHasGenerated(true);
  };

  const formatPrice = (price: number | null, currency = "EUR") => {
    if (!price) return "Sob consulta";
    return new Intl.NumberFormat("pt-PT", {
      style: "currency",
      currency,
    }).format(price);
  };

  const getMatchColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400 bg-green-500/10";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400 bg-yellow-500/10";
    return "text-blue-600 dark:text-blue-400 bg-blue-500/10";
  };

  if (!opportunityTitle && !leadName && !companyName) {
    return (
      <Card className="p-4 bg-muted/30 border-dashed">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Sparkles className="h-4 w-4" />
          <p className="text-sm">
            Selecione uma oportunidade para obter sugestões inteligentes de produtos
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Sugestões IA</h3>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {opportunityTitle || `Para ${leadName || companyName}`}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={isLoading}
          className="h-7 text-xs"
        >
          {isLoading ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : hasGenerated ? (
            <RefreshCw className="h-3 w-3 mr-1" />
          ) : (
            <Sparkles className="h-3 w-3 mr-1" />
          )}
          {hasGenerated ? "Regenerar" : "Gerar"}
        </Button>
      </div>

      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="p-3 bg-muted/30">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="p-4 bg-destructive/10 border-destructive/20">
            <p className="text-sm text-destructive">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              className="mt-2"
            >
              Tentar novamente
            </Button>
          </Card>
        ) : !hasGenerated ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-3 rounded-full bg-primary/10 mb-3">
              <Target className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-medium mb-1">
              Obtenha recomendações inteligentes
            </p>
            <p className="text-xs text-muted-foreground mb-4 max-w-[200px]">
              A IA analisa o contexto da oportunidade para sugerir os melhores produtos
            </p>
            <Button onClick={handleGenerate} size="sm">
              <Sparkles className="h-3 w-3 mr-1" />
              Gerar Sugestões
            </Button>
          </div>
        ) : suggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Não foram encontradas sugestões relevantes
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {suggestions.map((suggestion) => {
              const isAlreadyAdded = existingProductIds.includes(suggestion.product.id);
              
              return (
                <Card 
                  key={suggestion.product.id} 
                  className={cn(
                    "p-3 transition-all",
                    isAlreadyAdded 
                      ? "bg-primary/5 border-primary/30" 
                      : "bg-muted/30 hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    {/* Match Score */}
                    <div className={cn(
                      "flex flex-col items-center justify-center p-2 rounded-lg min-w-[52px]",
                      getMatchColor(suggestion.matchScore)
                    )}>
                      <TrendingUp className="h-3 w-3 mb-0.5" />
                      <span className="text-xs font-bold">{suggestion.matchScore}%</span>
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm truncate">
                          {suggestion.product.name}
                        </h4>
                        {isAlreadyAdded && (
                          <CheckCircle className="h-3 w-3 text-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {suggestion.reason}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm font-semibold text-primary">
                          {formatPrice(suggestion.product.base_price)}
                        </span>
                        {suggestion.suggestedQuantity > 1 && (
                          <Badge variant="secondary" className="text-[10px]">
                            Sugerido: {suggestion.suggestedQuantity}x
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Add Button */}
                    <Button
                      variant={isAlreadyAdded ? "secondary" : "default"}
                      size="sm"
                      className="h-7 shrink-0"
                      onClick={() => onAddProduct(suggestion.product)}
                      disabled={isAlreadyAdded}
                    >
                      {isAlreadyAdded ? (
                        "Adicionado"
                      ) : (
                        <>
                          <Plus className="h-3 w-3 mr-1" />
                          Adicionar
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}
