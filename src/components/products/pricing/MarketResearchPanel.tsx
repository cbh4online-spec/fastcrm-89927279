import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, TrendingUp, TrendingDown, Minus, ExternalLink, Clock, Sparkles } from "lucide-react";
import {
  useRunMarketResearch,
  useMarketResearchHistory,
  type MarketResearchResult,
} from "@/hooks/useProductPricingIntelligence";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

interface MarketResearchPanelProps {
  productId: string;
  workspaceId: string;
  productName: string;
  sku?: string;
  category?: string;
  barcode?: string;
  currentPrice?: number;
  costPrice?: number;
}

export function MarketResearchPanel({
  productId,
  workspaceId,
  productName,
  sku,
  category,
  barcode,
  currentPrice,
  costPrice,
}: MarketResearchPanelProps) {
  const [liveResult, setLiveResult] = useState<MarketResearchResult | null>(null);
  const { data: history = [], isLoading: historyLoading } = useMarketResearchHistory(productId);
  const runResearch = useRunMarketResearch();

  const handleAnalyze = async () => {
    const result = await runResearch.mutateAsync({
      product_id: productId,
      workspace_id: workspaceId,
      product_name: productName,
      sku,
      category,
      barcode,
      cost_price: costPrice,
    });
    setLiveResult(result);
  };

  const latestResearch = liveResult || (history.length > 0 ? {
    market_avg_price: history[0].market_avg_price ?? undefined,
    market_min_price: history[0].market_min_price ?? undefined,
    market_max_price: history[0].market_max_price ?? undefined,
    suggested_price: history[0].suggested_price ?? undefined,
    suggested_margin_pct: history[0].suggested_margin_pct ?? undefined,
    competitors: history[0].competitors_json,
  } : null);

  const positionIcon = () => {
    if (!currentPrice || !latestResearch?.market_avg_price) return null;
    const diff = ((currentPrice - latestResearch.market_avg_price) / latestResearch.market_avg_price) * 100;
    if (diff < -5) return <TrendingDown className="h-4 w-4 text-green-500" />;
    if (diff > 5) return <TrendingUp className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-amber-500" />;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Inteligência de Preço
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAnalyze}
            disabled={runResearch.isPending}
          >
            <Search className="h-3.5 w-3.5 mr-1" />
            {runResearch.isPending ? "A analisar..." : "Analisar Mercado"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {runResearch.isPending && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-20 w-full" />
          </div>
        )}

        {latestResearch && !runResearch.isPending && (
          <>
            {/* Market Price Summary */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Mín</p>
                <p className="text-sm font-semibold">
                  {latestResearch.market_min_price
                    ? `${latestResearch.market_min_price.toFixed(2)} €`
                    : "—"}
                </p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Média</p>
                <p className="text-sm font-bold text-primary flex items-center justify-center gap-1">
                  {latestResearch.market_avg_price
                    ? `${latestResearch.market_avg_price.toFixed(2)} €`
                    : "—"}
                  {positionIcon()}
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Máx</p>
                <p className="text-sm font-semibold">
                  {latestResearch.market_max_price
                    ? `${latestResearch.market_max_price.toFixed(2)} €`
                    : "—"}
                </p>
              </div>
            </div>

            {/* Suggested Price */}
            {latestResearch.suggested_price && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Preço Sugerido</p>
                    <p className="text-lg font-bold text-primary">
                      {latestResearch.suggested_price.toFixed(2)} €
                    </p>
                  </div>
                  {latestResearch.suggested_margin_pct && (
                    <Badge variant="secondary" className="text-xs">
                      Margem {latestResearch.suggested_margin_pct.toFixed(1)}%
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Summary */}
            {liveResult?.market_summary && (
              <p className="text-xs text-muted-foreground leading-relaxed">
                {liveResult.market_summary}
              </p>
            )}

            {/* Competitors */}
            {latestResearch.competitors && latestResearch.competitors.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2">Concorrentes ({latestResearch.competitors.length})</p>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {latestResearch.competitors.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1.5">
                      <span className="truncate mr-2">{c.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-medium">{c.price?.toFixed(2)} €</span>
                        {c.url && (
                          <a href={c.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* History */}
            {history.length > 1 && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground flex items-center gap-1 mb-1">
                  <Clock className="h-3 w-3" /> Histórico
                </p>
                <div className="space-y-1">
                  {history.slice(0, 3).map((h) => (
                    <div key={h.id} className="flex justify-between text-[10px] text-muted-foreground">
                      <span>
                        {formatDistanceToNow(new Date(h.research_date), { addSuffix: true, locale: pt })}
                      </span>
                      <span>Média: {h.market_avg_price?.toFixed(2) ?? "—"} €</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {!latestResearch && !runResearch.isPending && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Clique em "Analisar Mercado" para pesquisar preços de concorrentes.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
