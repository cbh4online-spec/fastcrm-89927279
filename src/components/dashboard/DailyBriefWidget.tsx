
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Newspaper, RefreshCw, ArrowRight, Users, DollarSign, AlertTriangle } from "lucide-react";
import { useDailyBrief } from "@/hooks/useDailyBrief";
import { formatRelativeTime, formatCurrency } from "@/lib/formatters";

export function DailyBriefWidget() {
  const navigate = useNavigate();
  const { todaysBrief, isLoading, isGenerating, generateDailyBrief } = useDailyBrief();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Newspaper className="h-4 w-4 text-primary" /> Daily Brief
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (!todaysBrief) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Newspaper className="h-4 w-4 text-primary" /> Daily Brief
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

  const m = todaysBrief.key_metrics;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Newspaper className="h-4 w-4 text-primary" /> Daily Brief
          </CardTitle>
          <span className="text-[10px] text-muted-foreground">
            {formatRelativeTime(todaysBrief.created_at)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {todaysBrief.summary && (
          <p className="text-xs text-muted-foreground line-clamp-2">{todaysBrief.summary}</p>
        )}

        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3 text-blue-400" />
            <span className="font-medium">{m?.leads_today ?? 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3 text-emerald-400" />
            <span className="font-medium">{formatCurrency(m?.revenue_today ?? 0)}</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3 text-amber-400" />
            <span className="font-medium">{m?.deals_stalled ?? 0}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs flex-1"
            onClick={() => navigate("/dashboard/daily-brief")}
          >
            Ver completo <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={generateDailyBrief}
            disabled={isGenerating}
          >
            <RefreshCw className={`h-3 w-3 ${isGenerating ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
