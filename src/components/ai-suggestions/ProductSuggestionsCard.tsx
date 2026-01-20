import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Sparkles, 
  Package, 
  Loader2, 
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Lightbulb,
  ShoppingCart,
  Target
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  useEntityProductSuggestions, 
  EntityContext, 
  ProductSuggestion 
} from "@/hooks/useEntityProductSuggestions";

interface ProductSuggestionsCardProps {
  context: EntityContext;
  onAddToOpportunity?: (productId: string) => void;
  compact?: boolean;
  className?: string;
}

export function ProductSuggestionsCard({
  context,
  onAddToOpportunity,
  compact = false,
  className,
}: ProductSuggestionsCardProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [overallInsight, setOverallInsight] = useState<string>("");
  const [hasLoaded, setHasLoaded] = useState(false);

  const suggestionsMutation = useEntityProductSuggestions();

  const handleGenerateSuggestions = async () => {
    try {
      const result = await suggestionsMutation.mutateAsync(context);
      setSuggestions(result.suggestions || []);
      setOverallInsight(result.overallInsight || "");
      setHasLoaded(true);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-orange-500";
  };

  const formatPrice = (price: number | null) => {
    if (!price) return "Sob consulta";
    return `€${price.toLocaleString("pt-PT")}`;
  };

  if (!hasLoaded && suggestions.length === 0) {
    return (
      <Card className={cn("border-dashed", className)}>
        <CardContent className="py-6">
          <div className="text-center">
            <Sparkles className="w-8 h-8 mx-auto text-primary/60 mb-3" />
            <h4 className="font-medium mb-2">Sugestões de Produtos IA</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Com base nos dados recolhidos, a IA pode sugerir os melhores produtos para este perfil.
            </p>
            <Button 
              onClick={handleGenerateSuggestions}
              disabled={suggestionsMutation.isPending}
              className="gap-2"
            >
              {suggestionsMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  A analisar...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Gerar Sugestões
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-4 h-4 text-primary" />
              Produtos Sugeridos pela IA
              {suggestions.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {suggestions.length}
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGenerateSuggestions}
                disabled={suggestionsMutation.isPending}
              >
                {suggestionsMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {/* Overall Insight */}
            {overallInsight && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">{overallInsight}</p>
                </div>
              </div>
            )}

            {/* Suggestions List */}
            {suggestions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma sugestão encontrada para este perfil.
              </p>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-3">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={suggestion.productId}
                      className="border rounded-lg p-3 hover:border-primary/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                            <h5 className="font-medium truncate">
                              {suggestion.product?.name || "Produto"}
                            </h5>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-xs shrink-0",
                                suggestion.matchScore >= 80 && "border-green-500/50 text-green-600",
                                suggestion.matchScore >= 60 && suggestion.matchScore < 80 && "border-yellow-500/50 text-yellow-600",
                                suggestion.matchScore < 60 && "border-orange-500/50 text-orange-600"
                              )}
                            >
                              {suggestion.matchScore}% match
                            </Badge>
                          </div>

                          {/* Product Details */}
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                            {suggestion.product?.category && (
                              <span className="truncate">{suggestion.product.category}</span>
                            )}
                            <span className="font-medium text-foreground">
                              {formatPrice(suggestion.product?.base_price || null)}
                            </span>
                          </div>

                          {/* Reason */}
                          <p className="text-sm text-muted-foreground mb-2">
                            {suggestion.reason}
                          </p>

                          {/* Suggested Approach */}
                          {suggestion.suggestedApproach && (
                            <div className="bg-muted/50 rounded p-2 mt-2">
                              <div className="flex items-start gap-1.5">
                                <Target className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                                <p className="text-xs text-muted-foreground">
                                  {suggestion.suggestedApproach}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action Button */}
                        {onAddToOpportunity && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onAddToOpportunity(suggestion.productId)}
                            className="shrink-0"
                          >
                            <ShoppingCart className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      {/* Match Score Bar */}
                      <div className="mt-3">
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full rounded-full transition-all", getScoreColor(suggestion.matchScore))}
                            style={{ width: `${suggestion.matchScore}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
