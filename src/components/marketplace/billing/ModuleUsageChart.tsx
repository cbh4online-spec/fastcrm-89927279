import { BarChart3, TrendingUp, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ModuleUsageStats } from "@/hooks/useModuleBilling";

interface ModuleUsageChartProps {
  stats: ModuleUsageStats | null;
  isLoading?: boolean;
  className?: string;
}

export function ModuleUsageChart({ stats, isLoading, className }: ModuleUsageChartProps) {
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card className={className}>
        <CardContent className="py-8 text-center text-muted-foreground">
          <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Sem dados de utilização</p>
          <p className="text-xs mt-1">Os dados aparecerão após o primeiro uso</p>
        </CardContent>
      </Card>
    );
  }

  const actionEntries = Object.entries(stats.actions_breakdown || {});
  const maxCredits = Math.max(...actionEntries.map(([, v]) => v.credits), 1);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Estatísticas de Uso
          </CardTitle>
          <Badge variant="secondary" className="font-mono">
            {stats.period}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold text-primary">
              {stats.total_credits_used.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Créditos usados</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">
              {stats.total_actions.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">Total de ações</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">
              {stats.average_daily_usage.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground">Média diária</p>
          </div>
        </div>

        {/* Actions breakdown */}
        {actionEntries.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Consumo por Ação
            </h4>
            <div className="space-y-2">
              {actionEntries.map(([action, data]) => (
                <div key={action} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground capitalize">
                      {action.replace(/_/g, " ")}
                    </span>
                    <span className="font-medium">
                      {data.credits} créditos ({data.count}x)
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${(data.credits / maxCredits) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Projection */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <TrendingUp className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium">Projeção mensal</p>
            <p className="text-xs text-muted-foreground">
              Baseado no uso atual: ~{stats.projected_monthly_usage.toLocaleString()} créditos
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
