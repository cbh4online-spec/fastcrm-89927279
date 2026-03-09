import { useEffect, useRef } from "react";
import { useDailyBrief } from "@/hooks/useDailyBrief";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, TrendingUp, Users, AlertTriangle, CheckCircle, Flame, Target, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

export function CEODailyBriefTab() {
  const { todaysBrief, isLoading, isGenerating, generateDailyBrief } = useDailyBrief();
  const autoGenRef = useRef(false);

  // Auto-generate on mount if no brief exists for today
  useEffect(() => {
    if (!isLoading && !todaysBrief && !autoGenRef.current) {
      autoGenRef.current = true;
      generateDailyBrief();
    }
  }, [isLoading, todaysBrief]);

  const metrics = todaysBrief?.key_metrics;

  if (isLoading || isGenerating) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (!todaysBrief) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <p className="text-muted-foreground">Nenhum brief disponível</p>
          <Button onClick={generateDailyBrief} disabled={isGenerating}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Gerar Daily Brief
          </Button>
        </CardContent>
      </Card>
    );
  }

  const kpis = [
    { label: "Leads Hoje", value: metrics?.leads_today ?? 0, icon: Users, color: "text-blue-500" },
    { label: "Receita Hoje", value: `€${(metrics?.revenue_today ?? 0).toLocaleString("pt-PT")}`, icon: TrendingUp, color: "text-emerald-500" },
    { label: "Deals Estagnados", value: metrics?.deals_stalled ?? 0, icon: AlertTriangle, color: "text-amber-500" },
    { label: "Tarefas Pendentes", value: metrics?.tasks_pending ?? 0, icon: CheckCircle, color: "text-violet-500" },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <div className={cn("p-2 rounded-lg bg-muted/50", kpi.color)}>
                <kpi.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary */}
      {todaysBrief.summary && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Resumo Executivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground leading-relaxed">{todaysBrief.summary}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Hot Leads */}
        {todaysBrief.hot_leads && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Flame className="h-4 w-4 text-orange-500" />
                Hot Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground whitespace-pre-line">{todaysBrief.hot_leads}</p>
            </CardContent>
          </Card>
        )}

        {/* Stuck Deals */}
        {todaysBrief.stuck_deals && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Deals Estagnados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground whitespace-pre-line">{todaysBrief.stuck_deals}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Revenue Highlight */}
      {todaysBrief.revenue_highlight && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Target className="h-4 w-4 text-emerald-500" />
              Destaque de Receita
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground">{todaysBrief.revenue_highlight}</p>
          </CardContent>
        </Card>
      )}

      {/* Action Suggestions */}
      {todaysBrief.action_suggestions && todaysBrief.action_suggestions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              Ações Prioritárias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {todaysBrief.action_suggestions.map((action, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <Badge variant="outline" className="text-[10px] mt-0.5 shrink-0">{i + 1}</Badge>
                  <span className="text-foreground">{action}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Regenerate */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={generateDailyBrief} disabled={isGenerating} size="sm">
          <RefreshCw className={cn("h-4 w-4 mr-2", isGenerating && "animate-spin")} />
          Regenerar Brief
        </Button>
      </div>
    </div>
  );
}
