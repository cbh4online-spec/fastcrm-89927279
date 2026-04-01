import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingDown, TrendingUp, Check, X } from "lucide-react";
import type { ProductStoreData, PriceSuggestion } from "./useStoreAdminProducts";

interface PricingSuggestionsPanelProps {
  suggestions: PriceSuggestion[];
  products: ProductStoreData[];
  onApply: (suggestion: PriceSuggestion) => void;
  onDismiss: (id: string) => void;
}

export function PricingSuggestionsPanel({ suggestions, products, onApply, onDismiss }: PricingSuggestionsPanelProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="border rounded-lg border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-amber-500" />
        <h3 className="font-semibold text-sm">Sugestões de Preço ({suggestions.length})</h3>
        <Badge variant="outline" className="text-xs">Análise automática</Badge>
      </div>
      <div className="space-y-2">
        {suggestions.slice(0, 5).map((s) => {
          const product = products.find((p) => p.id === s.product_id);
          const isDecrease = s.suggested_price < s.original_price;
          const changePercent = ((s.suggested_price - s.original_price) / s.original_price) * 100;
          return (
            <div key={s.id} className="flex items-center gap-3 p-3 bg-background rounded-lg border">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{product?.name || "Produto"}</p>
                <p className="text-xs text-muted-foreground">{s.reasoning}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground line-through">€{s.original_price.toFixed(2)}</p>
                  <p className="text-sm font-bold flex items-center gap-1">
                    {isDecrease ? <TrendingDown className="h-3 w-3 text-green-500" /> : <TrendingUp className="h-3 w-3 text-blue-500" />}
                    €{s.suggested_price.toFixed(2)}
                  </p>
                </div>
                <Badge variant={isDecrease ? "default" : "secondary"} className="text-xs">
                  {changePercent > 0 ? "+" : ""}{changePercent.toFixed(1)}%
                </Badge>
                <div className="flex gap-1">
                  <Button size="icon" variant="outline" className="h-7 w-7 text-green-600 hover:bg-green-50" onClick={() => onApply(s)} title="Aplicar sugestão"><Check className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => onDismiss(s.id)} title="Descartar"><X className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </div>
          );
        })}
        {suggestions.length > 5 && (
          <p className="text-xs text-muted-foreground text-center">+{suggestions.length - 5} mais sugestões</p>
        )}
      </div>
    </div>
  );
}
