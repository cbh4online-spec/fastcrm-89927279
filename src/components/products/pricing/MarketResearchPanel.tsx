import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Clock,
  Sparkles,
  ShieldAlert,
  Coins,
  Check,
} from "lucide-react";
import {
  useRunMarketResearch,
  useMarketResearchHistory,
  usePricingRules,
  getMarginStatus,
  type MarketResearchResult,
} from "@/hooks/useProductPricingIntelligence";
import { formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";

interface MarketResearchPanelProps {
  productId: string;
  workspaceId: string;
  productName: string;
  sku?: string;
  brand?: string;
  category?: string;
  barcode?: string;
  currentPrice?: number;
  costPrice?: number;
  /** Quando fornecido, permite adotar o preço sugerido com 1 clique. */
  onApplyPrice?: (price: number) => void;
}

function hostOf(url?: string) {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function MarketResearchPanel({
  productId,
  workspaceId,
  productName,
  sku,
  brand,
  category,
  barcode,
  currentPrice,
  costPrice,
  onApplyPrice,
}: MarketResearchPanelProps) {
  const [liveResult, setLiveResult] = useState<MarketResearchResult | null>(null);
  const { data: history = [] } = useMarketResearchHistory(productId);
  const { data: rules = [] } = usePricingRules();
  const runResearch = useRunMarketResearch();

  const minMarginPct = getMarginStatus(currentPrice, costPrice, rules, category).minMargin || 15;

  const handleAnalyze = async () => {
    const result = await runResearch.mutateAsync({
      product_id: productId,
      workspace_id: workspaceId,
      product_name: productName,
      sku,
      brand,
      category,
      barcode,
      cost_price: costPrice,
      min_margin_pct: minMarginPct,
    });
    setLiveResult(result);
  };

  const latestResearch: MarketResearchResult | null =
    liveResult ||
    (history.length > 0
      ? {
          success: true,
          grounded: (history[0].competitors_json || []).length > 0,
          market_avg_price: history[0].market_avg_price ?? undefined,
          market_min_price: history[0].market_min_price ?? undefined,
          market_max_price: history[0].market_max_price ?? undefined,
          suggested_price: history[0].suggested_price ?? undefined,
          suggested_margin_pct: history[0].suggested_margin_pct ?? undefined,
          competitors: history[0].competitors_json,
        }
      : null);

  const hasPrices = !!latestResearch?.competitors?.length;

  const positionIcon = () => {
    if (!currentPrice || !latestResearch?.market_avg_price) return null;
    const diff = ((currentPrice - latestResearch.market_avg_price) / latestResearch.market_avg_price) * 100;
    if (diff < -5) return <TrendingDown className="h-4 w-4 text-green-500" />;
    if (diff > 5) return <TrendingUp className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-amber-500" />;
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Preços de concorrentes reais
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <Coins className="h-3 w-3" />
              Procura pelo código do artigo. 1 crédito por pesquisa. Nunca estima preços.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              void handleAnalyze();
            }}
            disabled={runResearch.isPending}
          >
            <Search className="h-3.5 w-3.5 mr-1" />
            {runResearch.isPending ? "A pesquisar..." : "Pesquisar preços"}
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

        {/* Sem resultados verificáveis — nunca inventar */}
        {!runResearch.isPending && latestResearch && !hasPrices && (
          <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
            {latestResearch.market_summary ||
              "Nenhuma loja encontrada com esta referência. Não foi estimado nenhum preço."}
          </div>
        )}

        {hasPrices && !runResearch.isPending && (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Mín</p>
                <p className="text-sm font-semibold">
                  {latestResearch.market_min_price ? `${latestResearch.market_min_price.toFixed(2)} €` : "—"}
                </p>
              </div>
              <div className="rounded-lg bg-primary/10 p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Média</p>
                <p className="text-sm font-bold text-primary flex items-center justify-center gap-1">
                  {latestResearch.market_avg_price ? `${latestResearch.market_avg_price.toFixed(2)} €` : "—"}
                  {positionIcon()}
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 p-2.5 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Máx</p>
                <p className="text-sm font-semibold">
                  {latestResearch.market_max_price ? `${latestResearch.market_max_price.toFixed(2)} €` : "—"}
                </p>
              </div>
            </div>

            {latestResearch.suggested_price && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Preço sugerido</p>
                    <p className="text-lg font-bold text-primary">
                      {latestResearch.suggested_price.toFixed(2)} €
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {latestResearch.suggested_margin_pct != null && (
                      <Badge variant="secondary" className="text-xs">
                        Margem {latestResearch.suggested_margin_pct.toFixed(1)}%
                      </Badge>
                    )}
                    {onApplyPrice && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          onApplyPrice(latestResearch.suggested_price!);
                        }}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Adotar
                      </Button>
                    )}
                  </div>
                </div>
                {latestResearch.margin_blocked && (
                  <p className="text-[11px] text-amber-600 flex items-start gap-1.5">
                    <ShieldAlert className="h-3.5 w-3.5 shrink-0 mt-[1px]" />
                    Acompanhar o concorrente mais barato ficaria abaixo da margem mínima de{" "}
                    {latestResearch.min_margin_pct ?? minMarginPct}%. O valor foi travado.
                  </p>
                )}
              </div>
            )}

            {latestResearch.market_summary && (
              <p className="text-xs text-muted-foreground leading-relaxed">{latestResearch.market_summary}</p>
            )}

            <div>
              <p className="text-xs font-medium mb-2">
                Lojas encontradas ({latestResearch.competitors!.length})
              </p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {latestResearch.competitors!.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1.5"
                  >
                    <div className="min-w-0 mr-2">
                      <p className="truncate font-medium">{c.name}</p>
                      {hostOf(c.url) && (
                        <p className="truncate text-[10px] text-muted-foreground">{hostOf(c.url)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {c.vat_included === false && (
                        <Badge variant="outline" className="text-[9px] px-1">
                          s/ IVA
                        </Badge>
                      )}
                      <span className="font-medium">{c.price?.toFixed(2)} €</span>
                      {c.url && (
                        <a href={c.url} target="_blank" rel="noopener noreferrer" aria-label="Abrir página da loja">
                          <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Cada preço vem de uma página real. Confirme no link antes de alterar o seu preço.
              </p>
            </div>

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
            Clique em "Pesquisar preços" para ver as lojas que vendem este artigo e a que preço.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
