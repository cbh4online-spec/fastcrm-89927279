import { useMemo } from "react";
import { usePriceHistory, type PriceHistoryPoint } from "@/hooks/usePriceComparison";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

interface PriceHistoryChartProps {
  productId: string;
  currentPrice: number;
  currency?: string;
}

export function PriceHistoryChart({ productId, currentPrice, currency = "EUR" }: PriceHistoryChartProps) {
  const { data: history = [], isLoading } = usePriceHistory(productId);

  const chartData = useMemo(() => {
    return history.map((h) => ({
      date: format(new Date(h.recorded_at), "d MMM", { locale: pt }),
      price: Number(h.price),
      fullDate: format(new Date(h.recorded_at), "d MMM yyyy", { locale: pt }),
    }));
  }, [history]);

  const { lowestPrice, highestPrice, trend } = useMemo(() => {
    if (history.length === 0) return { lowestPrice: currentPrice, highestPrice: currentPrice, trend: "stable" as const };
    const prices = history.map((h) => Number(h.price));
    const lowest = Math.min(...prices);
    const highest = Math.max(...prices);
    const lastPrice = prices[prices.length - 1];
    const prevPrice = prices.length > 1 ? prices[prices.length - 2] : lastPrice;
    const trend = lastPrice < prevPrice ? "down" : lastPrice > prevPrice ? "up" : "stable";
    return { lowestPrice: lowest, highestPrice: highest, trend };
  }, [history, currentPrice]);

  if (isLoading || history.length < 2) return null;

  const isAtLowest = currentPrice <= lowestPrice;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Histórico de Preço</h3>
        <div className="flex items-center gap-2">
          {isAtLowest && (
            <Badge variant="default" className="text-[10px] bg-primary">
              Preço mais baixo!
            </Badge>
          )}
          {trend === "down" && <TrendingDown className="h-4 w-4 text-primary" />}
          {trend === "up" && <TrendingUp className="h-4 w-4 text-destructive" />}
          {trend === "up" && <TrendingUp className="h-4 w-4 text-destructive" />}
          {trend === "stable" && <Minus className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      <div className="h-[120px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis hide domain={["auto", "auto"]} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-popover border rounded-lg px-3 py-2 shadow-md text-xs">
                    <p className="text-muted-foreground">{d.fullDate}</p>
                    <p className="font-bold text-foreground">€{d.price.toFixed(2)}</p>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#priceGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>Mín: €{lowestPrice.toFixed(2)}</span>
        <span>Máx: €{highestPrice.toFixed(2)}</span>
      </div>
    </div>
  );
}
