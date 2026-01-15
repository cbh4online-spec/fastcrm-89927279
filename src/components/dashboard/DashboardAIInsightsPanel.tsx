import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Sparkles, 
  AlertTriangle, 
  TrendingUp, 
  Clock,
  Zap,
  ArrowRight,
  RefreshCw,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { AIInsight, DashboardAIResponse } from "@/hooks/useOperationalDashboard";

interface DashboardAIInsightsPanelProps {
  data: DashboardAIResponse | undefined;
  isLoading: boolean;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

const insightIcons: Record<AIInsight["type"], React.ElementType> = {
  urgent: AlertTriangle,
  opportunity: TrendingUp,
  efficiency: Zap,
  warning: Clock,
};

const priorityStyles: Record<AIInsight["priority"], string> = {
  high: "border-l-red-500 bg-red-50/50 dark:bg-red-950/20",
  medium: "border-l-amber-500 bg-amber-50/50 dark:bg-amber-950/20",
  low: "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
};

const priorityLabels: Record<AIInsight["priority"], string> = {
  high: "Urgente",
  medium: "Importante",
  low: "Sugestão",
};

function InsightCard({ insight, onAction }: { insight: AIInsight; onAction: () => void }) {
  const Icon = insightIcons[insight.type] || Sparkles;
  
  return (
    <div className={cn(
      "p-3 rounded-lg border-l-4 transition-all hover:shadow-sm",
      priorityStyles[insight.priority]
    )}>
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded bg-background/80">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm truncate">{insight.title}</h4>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
              {priorityLabels[insight.priority]}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {insight.description}
          </p>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2 text-xs"
            onClick={onAction}
          >
            {insight.actionLabel}
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DashboardAIInsightsPanel({ data, isLoading, onRefresh, isRefreshing }: DashboardAIInsightsPanelProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500/20 to-primary/20">
              <Sparkles className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-3 w-48 mt-1" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const insights = data?.insights || [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500/20 to-primary/20">
              <Sparkles className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-base">Insights da IA</CardTitle>
              <CardDescription className="text-xs">
                Resumo inteligente para decidir mais rápido
              </CardDescription>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">Tudo em ordem!</p>
            <p className="text-xs mt-1">Não há ações urgentes neste momento.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {insights.map((insight) => (
              <InsightCard
                key={insight.id}
                insight={insight}
                onAction={() => navigate(insight.actionRoute)}
              />
            ))}
            
            <div className="pt-2 text-center">
              <p className="text-[10px] text-muted-foreground/60">
                A IA apenas sugere • Todas as ações requerem confirmação
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
