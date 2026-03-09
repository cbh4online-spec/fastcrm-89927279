import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Newspaper, RefreshCw, ArrowRight, AlertTriangle, Lightbulb, Zap } from "lucide-react";
import { useDailyBrief } from "@/hooks/useDailyBrief";
import { useWeeklyPerformance } from "@/hooks/useWeeklyPerformance";
import { formatRelativeTime, formatCurrency } from "@/lib/formatters";

export function DailyBriefWidget() {
  const navigate = useNavigate();
  const { todaysBrief, isLoading, isGenerating, generateDailyBrief } = useDailyBrief();
  const { data: weeklyData } = useWeeklyPerformance();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Newspaper className="h-4 w-4 text-primary" /> Executive Daily Brief
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-5/6" />
        </CardContent>
      </Card>
    );
  }

  if (!todaysBrief) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Newspaper className="h-4 w-4 text-primary" /> Executive Daily Brief
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-6 text-center">
          <p className="text-xs text-muted-foreground mb-3">Nenhum brief diário gerado.</p>
          <Button size="sm" onClick={generateDailyBrief} disabled={isGenerating}>
            {isGenerating ? <><RefreshCw className="h-3 w-3 mr-1.5 animate-spin" /> A gerar...</> : "Gerar Brief"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const revenueMetric = weeklyData?.metrics.find((m) => m.key === "revenue");
  const weeklyStatus = revenueMetric
    ? `${formatCurrency(revenueMetric.actual)} de ${formatCurrency(revenueMetric.target)} (${revenueMetric.pct}%)`
    : null;

  const actions = todaysBrief.action_suggestions?.slice(0, 3) ?? [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Newspaper className="h-4 w-4 text-primary" /> Executive Daily Brief
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">
              {formatRelativeTime(todaysBrief.created_at)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={generateDailyBrief}
              disabled={isGenerating}
            >
              <RefreshCw className={`h-3 w-3 ${isGenerating ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Column 1: Summary + Weekly Status */}
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Resumo</p>
              {todaysBrief.summary && (
                <p className="text-xs text-foreground leading-relaxed">{todaysBrief.summary}</p>
              )}
            </div>
            {weeklyStatus && (
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Status Semanal</p>
                <p className="text-xs text-foreground">{weeklyStatus}</p>
              </div>
            )}
          </div>

          {/* Column 2: Risk + Opportunity */}
          <div className="space-y-3">
            {todaysBrief.stuck_deals && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <AlertTriangle className="h-3 w-3 text-destructive" />
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Risco Principal</p>
                </div>
                <p className="text-xs text-foreground leading-relaxed">{todaysBrief.stuck_deals}</p>
              </div>
            )}
            {todaysBrief.revenue_highlight && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Lightbulb className="h-3 w-3 text-warning" />
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Oportunidade</p>
                </div>
                <p className="text-xs text-foreground leading-relaxed">{todaysBrief.revenue_highlight}</p>
              </div>
            )}
          </div>

          {/* Column 3: Today Actions */}
          <div>
            {actions.length > 0 && (
              <div>
                <div className="flex items-center gap-1 mb-1.5">
                  <Zap className="h-3 w-3 text-primary" />
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Ações para Hoje</p>
                </div>
                <ul className="space-y-1.5">
                  {actions.map((a, i) => (
                    <li key={i} className="text-xs text-foreground flex gap-1.5">
                      <span className="text-primary font-medium shrink-0">{i + 1}.</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs w-full mt-3"
              onClick={() => navigate("/dashboard/daily-brief")}
            >
              Ver completo <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
