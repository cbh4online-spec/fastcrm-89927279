import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TrendingDown, TrendingUp, Minus, History, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface ProductPriceHistoryTabProps {
  productId: string;
  currentPrice: number;
  costPrice?: number | null;
  currency?: string;
}

function useFullPriceHistory(productId: string) {
  return useQuery({
    queryKey: ["product-price-history-full", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_price_history")
        .select("*")
        .eq("product_id", productId)
        .order("recorded_at", { ascending: true })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!productId,
  });
}

export function ProductPriceHistoryTab({
  productId, currentPrice, costPrice, currency = "EUR",
}: ProductPriceHistoryTabProps) {
  const { data: history = [], isLoading } = useFullPriceHistory(productId);

  const fmt = (v: number) =>
    new Intl.NumberFormat("pt-PT", { style: "currency", currency }).format(v);

  const chartData = useMemo(() =>
    history.map((h: any) => ({
      date: format(new Date(h.recorded_at), "d MMM", { locale: pt }),
      fullDate: format(new Date(h.recorded_at), "d MMM yyyy HH:mm", { locale: pt }),
      price: Number(h.price),
      cost: costPrice ?? undefined,
    })),
  [history, costPrice]);

  const stats = useMemo(() => {
    if (!history.length) return null;
    const prices = history.map((h: any) => Number(h.price));
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const last = prices[prices.length - 1];
    const prev = prices.length > 1 ? prices[prices.length - 2] : last;
    const trend = last < prev ? "down" : last > prev ? "up" : "stable";
    const changeCount = history.filter((h: any) => h.old_price != null).length;
    return { min, max, trend, changeCount };
  }, [history]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const margin = costPrice ? ((currentPrice - costPrice) / currentPrice * 100) : null;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <p className="text-xs text-muted-foreground">Preço Atual</p>
          <p className="text-lg font-bold">{fmt(currentPrice)}</p>
          {stats && (
            <div className="flex items-center gap-1 mt-1">
              {stats.trend === "down" && <TrendingDown className="h-3 w-3 text-primary" />}
              {stats.trend === "up" && <TrendingUp className="h-3 w-3 text-destructive" />}
              {stats.trend === "stable" && <Minus className="h-3 w-3 text-muted-foreground" />}
              <span className="text-[10px] text-muted-foreground">
                {stats.trend === "down" ? "Em baixa" : stats.trend === "up" ? "Em alta" : "Estável"}
              </span>
            </div>
          )}
        </Card>

        {costPrice != null && (
          <Card className="p-3">
            <p className="text-xs text-muted-foreground">Custo Fornecedor</p>
            <p className="text-lg font-bold">{fmt(costPrice)}</p>
            {margin != null && (
              <p className="text-[10px] text-muted-foreground mt-1">
                Margem: <span className={margin > 0 ? "text-primary font-medium" : "text-destructive font-medium"}>
                  {margin.toFixed(1)}%
                </span>
              </p>
            )}
          </Card>
        )}

        {stats && (
          <>
            <Card className="p-3">
              <p className="text-xs text-muted-foreground">Mínimo Histórico</p>
              <p className="text-lg font-bold">{fmt(stats.min)}</p>
              {currentPrice <= stats.min && (
                <Badge variant="default" className="text-[10px] mt-1">Preço mais baixo!</Badge>
              )}
            </Card>
            <Card className="p-3">
              <p className="text-xs text-muted-foreground">Máximo Histórico</p>
              <p className="text-lg font-bold">{fmt(stats.max)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {stats.changeCount} alterações
              </p>
            </Card>
          </>
        )}
      </div>

      {/* Chart */}
      {chartData.length >= 2 ? (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Evolução do Preço
          </h3>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="priceHistGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis hide domain={["auto", "auto"]} />
                {costPrice != null && (
                  <ReferenceLine
                    y={costPrice}
                    stroke="hsl(var(--destructive))"
                    strokeDasharray="4 4"
                    strokeOpacity={0.5}
                    label={{ value: "Custo", fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  />
                )}
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-popover border rounded-lg px-3 py-2 shadow-md text-xs">
                        <p className="text-muted-foreground">{d.fullDate}</p>
                        <p className="font-bold text-foreground">{fmt(d.price)}</p>
                        {costPrice != null && (
                          <p className="text-muted-foreground">Custo: {fmt(costPrice)}</p>
                        )}
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#priceHistGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      ) : (
        <Card className="p-6 text-center">
          <History className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Sem histórico de preços suficiente para gráfico.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            O registo começa automaticamente quando o preço é alterado.
          </p>
        </Card>
      )}

      {/* Changelog */}
      {history.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <History className="h-4 w-4" />
            Registo de Alterações
          </h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {[...history].reverse().map((entry: any, i: number) => (
              <div key={entry.id ?? i} className="flex items-center gap-3 text-sm py-2 border-b border-border last:border-0">
                <span className="text-xs text-muted-foreground min-w-[100px]">
                  {format(new Date(entry.recorded_at), "dd/MM/yyyy HH:mm", { locale: pt })}
                </span>
                {entry.old_price != null && entry.new_price != null ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground line-through">{fmt(entry.old_price)}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{fmt(entry.new_price)}</span>
                    {entry.new_price < entry.old_price ? (
                      <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                        -{((1 - entry.new_price / entry.old_price) * 100).toFixed(1)}%
                      </Badge>
                    ) : entry.new_price > entry.old_price ? (
                      <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">
                        +{((entry.new_price / entry.old_price - 1) * 100).toFixed(1)}%
                      </Badge>
                    ) : null}
                  </div>
                ) : (
                  <span className="font-medium">{fmt(entry.price)}</span>
                )}
                {entry.reason && (
                  <span className="text-xs text-muted-foreground ml-auto truncate max-w-[150px]">
                    {entry.reason}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
