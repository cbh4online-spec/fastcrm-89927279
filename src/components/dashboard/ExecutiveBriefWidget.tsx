import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, TrendingUp, AlertTriangle, RefreshCw, ArrowRight } from "lucide-react";
import { useStrategicBriefs } from "@/hooks/useStrategicBriefs";
import { formatRelativeTime } from "@/lib/formatters";

export function ExecutiveBriefWidget() {
  const navigate = useNavigate();
  const { latestBrief, isLoading, isGenerating, generateBrief } = useStrategicBriefs();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Brain className="h-4 w-4 text-primary" />
            Brief Executivo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (!latestBrief) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Brain className="h-4 w-4 text-primary" />
            Brief Executivo
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-6 text-center">
          <p className="text-xs text-muted-foreground mb-3">
            Ainda não existe nenhum brief gerado.
          </p>
          <Button size="sm" onClick={generateBrief} disabled={isGenerating}>
            {isGenerating ? (
              <><RefreshCw className="h-3 w-3 mr-1.5 animate-spin" /> A gerar...</>
            ) : (
              "Gerar Brief"
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Brain className="h-4 w-4 text-primary" />
            Brief Executivo
          </CardTitle>
          <span className="text-[10px] text-muted-foreground">
            {formatRelativeTime(latestBrief.created_at)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {latestBrief.summary && (
          <p className="text-xs text-muted-foreground line-clamp-3">
            {latestBrief.summary}
          </p>
        )}

        {latestBrief.opportunity && (
          <div className="flex items-start gap-1.5">
            <TrendingUp className="h-3 w-3 mt-0.5 text-emerald-500 shrink-0" />
            <p className="text-xs text-muted-foreground line-clamp-2">
              {latestBrief.opportunity}
            </p>
          </div>
        )}

        {latestBrief.risk && (
          <div className="flex items-start gap-1.5">
            <AlertTriangle className="h-3 w-3 mt-0.5 text-destructive shrink-0" />
            <p className="text-xs text-muted-foreground line-clamp-2">
              {latestBrief.risk}
            </p>
          </div>
        )}

        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs flex-1"
            onClick={() => navigate("/dashboard/strategy")}
          >
            Ver completo <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={generateBrief}
            disabled={isGenerating}
          >
            <RefreshCw className={`h-3 w-3 ${isGenerating ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
