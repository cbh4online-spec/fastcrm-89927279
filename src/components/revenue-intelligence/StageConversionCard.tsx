import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { GitBranch } from "lucide-react";
import { useStageConversion } from "@/hooks/useRevenueIntelligenceDashboard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `€${(value / 1_000).toFixed(1)}K`;
  return `€${value.toFixed(0)}`;
}

export function StageConversionCard() {
  const { data: stages, isLoading } = useStageConversion();

  return (
    <Card className="col-span-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-primary" />
          Pipeline por Etapa
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[220px] w-full" />
        ) : !stages?.length ? (
          <p className="text-xs text-muted-foreground text-center py-8">Sem dados de pipeline.</p>
        ) : (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stages} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip
                  formatter={(v: number, name: string) => [
                    name === "value" ? formatCurrency(v) : v,
                    name === "value" ? "Valor" : "Deals",
                  ]}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            {/* Stage details */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {stages.map((s) => (
                <div key={s.stage} className="rounded-lg border border-border/60 p-2.5">
                  <p className="text-xs font-medium text-foreground truncate">{s.stage}</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">{s.count} deals</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">{formatCurrency(s.value)}</span>
                    <span className={cn(
                      "text-[10px] font-medium",
                      s.avg_days > 30 ? "text-destructive" : s.avg_days > 14 ? "text-amber-600" : "text-emerald-600"
                    )}>
                      ~{s.avg_days}d
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
