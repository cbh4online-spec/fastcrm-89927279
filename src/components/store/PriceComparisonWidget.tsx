import { Link } from "react-router-dom";
import { usePriceComparison, useExternalPrices } from "@/hooks/usePriceComparison";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, BarChart3 } from "lucide-react";

interface PriceComparisonWidgetProps {
  productId: string;
  productName: string;
  currentPrice: number;
  category: string | undefined;
  workspaceId: string;
  workspaceSlug: string;
  currency?: string;
}

export function PriceComparisonWidget({
  productId,
  productName,
  currentPrice,
  category,
  workspaceId,
  workspaceSlug,
  currency = "EUR",
}: PriceComparisonWidgetProps) {
  const { data: internalProducts = [] } = usePriceComparison(productId, category, workspaceId);
  const { data: externalPrices = [] } = useExternalPrices(productId);

  if (internalProducts.length === 0 && externalPrices.length === 0) return null;

  const cheaperInternal = internalProducts.filter((p) => p.base_price < currentPrice);
  const cheaperExternal = externalPrices.filter((p) => p.price < currentPrice);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Comparar Preços</h3>
      </div>

      {/* Internal comparison */}
      {internalProducts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Na nossa loja</p>
          <div className="space-y-1.5">
            {internalProducts.slice(0, 4).map((p) => {
              const isCheaper = p.base_price < currentPrice;
              const primaryIdx = 0;
              return (
                <Link
                  key={p.id}
                  to={`/store/${workspaceSlug}/product/${p.id}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {p.images?.[primaryIdx] ? (
                      <img src={p.images[primaryIdx]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate">{p.name}</p>
                  </div>
                  <span className={`text-sm font-bold ${isCheaper ? "text-green-600" : "text-foreground"}`}>
                    €{p.base_price.toFixed(2)}
                  </span>
                  {isCheaper && (
                    <Badge variant="secondary" className="text-[10px] px-1 py-0">
                      -{Math.round(((currentPrice - p.base_price) / currentPrice) * 100)}%
                    </Badge>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* External prices */}
      {externalPrices.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Noutras lojas</p>
          <div className="space-y-1.5">
            {externalPrices.slice(0, 4).map((ep) => {
              const isCheaper = ep.price < currentPrice;
              return (
                <a
                  key={ep.id}
                  href={ep.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium">{ep.source_name}</p>
                  </div>
                  <span className={`text-sm font-bold ${isCheaper ? "text-green-600" : "text-foreground"}`}>
                    €{ep.price.toFixed(2)}
                  </span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
