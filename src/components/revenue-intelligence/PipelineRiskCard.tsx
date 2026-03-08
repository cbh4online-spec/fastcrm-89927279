import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldAlert } from "lucide-react";
import { usePipelineRiskAnalysis } from "@/hooks/useRevenueIntelligenceDashboard";
import { cn } from "@/lib/utils";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `€${(value / 1_000).toFixed(1)}K`;
  return `€${value.toFixed(0)}`;
}

const categoryConfig = {
  hot: { label: "Hot", color: "hsl(0 84% 60%)", bg: "bg-destructive/10", text: "text-destructive" },
  likely: { label: "Likely", color: "hsl(142 76% 36%)", bg: "bg-emerald-500/10", text: "text-emerald-600" },
  uncertain: { label: "Uncertain", color: "hsl(38 92% 50%)", bg: "bg-amber-500/10", text: "text-amber-600" },
  low: { label: "Low", color: "hsl(215 16% 47%)", bg: "bg-muted", text: "text-muted-foreground" },
};

export function PipelineRiskCard() {
  const { buckets, isLoading } = usePipelineRiskAnalysis();

  const totalValue = buckets.reduce((sum, b) => sum + b.total_value, 0);
  const totalDeals = buckets.reduce((sum, b) => sum + b.count, 0);
  const atRiskValue = buckets
    .filter((b) => b.category === "uncertain" || b.category === "low")
    .reduce((sum, b) => sum + b.total_value, 0);
  const atRiskPct = totalValue > 0 ? Math.round((atRiskValue / totalValue) * 100) : 0;

  const chartData = buckets
    .filter((b) => b.count > 0)
    .map((b) => ({
      name: categoryConfig[b.category].label,
      value: b.total_value,
      fill: categoryConfig[b.category].color,
    }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-500" />
          Pipeline Risk Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-[180px] w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : totalDeals === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">
            Sem oportunidades ativas para análise de risco.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Donut chart */}
            <div className="flex items-center gap-4">
              <div className="w-[140px] h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-2xl font-bold text-foreground">{formatCurrency(totalValue)}</p>
                <p className="text-xs text-muted-foreground">{totalDeals} deals ativos</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className={cn("text-xs font-semibold", atRiskPct > 40 ? "text-destructive" : "text-amber-600")}>
                    {atRiskPct}% em risco
                  </span>
                  <span className="text-xs text-muted-foreground">({formatCurrency(atRiskValue)})</span>
                </div>
              </div>
            </div>

            {/* Buckets */}
            <div className="grid grid-cols-2 gap-2">
              {buckets.map((b) => {
                const cfg = categoryConfig[b.category];
                return (
                  <div key={b.category} className={cn("rounded-lg p-2.5", cfg.bg)}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={cn("w-2 h-2 rounded-full")} style={{ backgroundColor: cfg.color }} />
                      <span className={cn("text-xs font-semibold", cfg.text)}>{cfg.label}</span>
                    </div>
                    <p className="text-sm font-bold text-foreground">{formatCurrency(b.total_value)}</p>
                    <p className="text-[10px] text-muted-foreground">{b.count} deals · Avg {b.avg_score} pts</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
