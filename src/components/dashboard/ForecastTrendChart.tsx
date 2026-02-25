import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { formatCurrency } from "@/hooks/useRevenueForecast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

function useForecastHistory() {
  const { currentWorkspace } = useWorkspace();
  return useQuery({
    queryKey: ["forecast-history", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      const { data, error } = await supabase
        .from("revenue_forecasts")
        .select("generated_at, expected_case, best_case, worst_case, health_adjusted_expected, stage_weighted")
        .eq("workspace_id", currentWorkspace.id)
        .order("generated_at", { ascending: true })
        .limit(12);
      if (error) throw error;
      return (data || []).map((row: any) => ({
        date: format(new Date(row.generated_at), "d MMM", { locale: pt }),
        expected: row.expected_case,
        best: row.best_case,
        worst: row.worst_case,
        riskAdj: row.health_adjusted_expected || null,
        stageWeighted: row.stage_weighted || null,
      }));
    },
    enabled: !!currentWorkspace,
    staleTime: 5 * 60 * 1000,
  });
}

export function ForecastTrendChart() {
  const { data: chartData, isLoading } = useForecastHistory();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!chartData || chartData.length < 2) {
    return null;
  }

  const hasRiskAdj = chartData.some((d) => d.riskAdj != null && d.riskAdj > 0);
  const hasStageWeighted = chartData.some((d) => d.stageWeighted != null && d.stageWeighted > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Forecast Trend
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradExpected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradBest" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(142 76% 36%)" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="hsl(142 76% 36%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" tickLine={false} axisLine={false} tickFormatter={(v) => formatCurrency(v)} width={60} />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === "expected" ? "Expected" : name === "best" ? "Best Case" : name === "worst" ? "Worst Case" : name === "stageWeighted" ? "Stage-Weighted" : "Risk-Adjusted",
                ]}
              />
              <Area type="monotone" dataKey="worst" stroke="hsl(var(--destructive))" strokeWidth={1} strokeDasharray="4 2" fill="none" />
              <Area type="monotone" dataKey="best" stroke="hsl(142 76% 36%)" strokeWidth={1} fill="url(#gradBest)" />
              {hasStageWeighted && (
                <Area type="monotone" dataKey="stageWeighted" stroke="hsl(var(--primary))" strokeWidth={1.5} strokeDasharray="2 2" fill="none" />
              )}
              <Area type="monotone" dataKey="expected" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#gradExpected)" />
              {hasRiskAdj && (
                <Area type="monotone" dataKey="riskAdj" stroke="hsl(var(--primary))" strokeWidth={1.5} strokeDasharray="6 3" fill="none" />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-4 mt-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <div className="w-3 h-0.5 rounded bg-primary" />
            Expected
          </div>
          {hasStageWeighted && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <div className="w-3 h-0.5 rounded bg-primary opacity-60" style={{ borderTop: "1px dashed" }} />
              Stage-Wtd
            </div>
          )}
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <div className="w-3 h-0.5 rounded bg-emerald-600" />
            Best
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <div className="w-3 h-0.5 rounded bg-destructive" />
            Worst
          </div>
          {hasRiskAdj && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <div className="w-3 h-0.5 rounded bg-primary border-dashed" style={{ borderTop: "1px dashed" }} />
              Risk-Adj
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
