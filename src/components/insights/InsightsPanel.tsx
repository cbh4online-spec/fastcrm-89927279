import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sparkles,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  TrendingUp,
  Zap,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  X,
  Loader2,
  Settings2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AIInsight,
  InsightCategory,
  INSIGHT_CATEGORY_CONFIG,
  CONFIDENCE_CONFIG,
} from '@/types/aiInsights';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface InsightsPanelProps {
  entityType: 'lead' | 'contact' | 'company';
  entityId: string;
  insights: AIInsight[];
  summary?: string | null;
  isLoading?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onDismiss?: (insightId: string) => void;
  onFeedback?: (insightId: string, feedback: 'useful' | 'not_useful') => void;
  onExecuteAction?: (insight: AIInsight) => Promise<void>;
  onSettingsClick?: () => void;
  compact?: boolean;
}

const CATEGORY_ICONS: Record<InsightCategory, React.ElementType> = {
  priority: AlertCircle,
  risk: AlertTriangle,
  opportunity: TrendingUp,
  efficiency: Zap,
};

export function InsightsPanel({
  entityType,
  entityId,
  insights,
  summary,
  isLoading,
  isRefreshing,
  onRefresh,
  onDismiss,
  onFeedback,
  onExecuteAction,
  onSettingsClick,
  compact = false,
}: InsightsPanelProps) {
  const navigate = useNavigate();
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleExecuteAction = async (insight: AIInsight) => {
    setExecutingId(insight.id);
    try {
      if (onExecuteAction) {
        await onExecuteAction(insight);
      } else {
        // Default action handlers
        switch (insight.action.type) {
          case 'reply_now':
            navigate(`/dashboard/inbox?${entityType}=${entityId}`);
            break;
          case 'create_task':
            toast.info('Criar tarefa - funcionalidade em desenvolvimento');
            break;
          case 'convert_opportunity':
            navigate(`/dashboard/opportunities?create=true&${entityType}Id=${entityId}`);
            break;
          case 'apply_template':
            toast.info('Templates disponíveis na sidebar');
            break;
          case 'schedule_followup':
            toast.info('Agendar follow-up - funcionalidade em desenvolvimento');
            break;
          case 'convert_contact':
            toast.info('Converter em contacto - funcionalidade em desenvolvimento');
            break;
          case 'send_proposal':
            navigate(`/dashboard/proposals?create=true&${entityType}Id=${entityId}`);
            break;
          case 'mark_priority':
            toast.success('Marcado como prioritário');
            break;
          default:
            toast.success('Ação executada');
        }
      }
    } finally {
      setExecutingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className={cn("pb-3", compact && "py-3")}>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <CardTitle className="text-base">Insights IA</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (insights.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Sparkles className="h-8 w-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm font-medium">Sem insights no momento</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
            A IA precisa de mais dados para gerar recomendações acionáveis.
          </p>
          {onRefresh && (
            <Button variant="outline" size="sm" onClick={onRefresh} className="mt-4" disabled={isRefreshing}>
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Analisar agora
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className={cn("pb-3", compact && "py-3")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Insights IA</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {insights.length}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            {onSettingsClick && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSettingsClick}>
                <Settings2 className="h-4 w-4" />
              </Button>
            )}
            {onRefresh && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={onRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </Button>
            )}
          </div>
        </div>
        {summary && (
          <CardDescription className="mt-1">{summary}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className={cn("max-h-[400px]", compact && "max-h-[250px]")}>
          <div className="space-y-1 p-4 pt-0">
            {insights.map((insight) => {
              const config = INSIGHT_CATEGORY_CONFIG[insight.category];
              const CategoryIcon = CATEGORY_ICONS[insight.category];
              const isExpanded = expandedId === insight.id;
              const isExecuting = executingId === insight.id;

              return (
                <div
                  key={insight.id}
                  className={cn(
                    "rounded-lg border bg-card transition-all group",
                    isExpanded && "ring-1 ring-primary/20"
                  )}
                >
                  {/* Main Row */}
                  <div
                    className="flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedId(isExpanded ? null : insight.id)}
                  >
                    <div className={cn("rounded-full p-2 flex-shrink-0", config.bgColor)}>
                      <CategoryIcon className={cn("h-4 w-4", config.color)} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{insight.title}</span>
                        <Badge variant="outline" className={cn("text-[10px] px-1.5", config.bgColor, config.color)}>
                          {config.label}
                        </Badge>
                        <span className={cn("text-[10px]", CONFIDENCE_CONFIG[insight.confidence].color)}>
                          {CONFIDENCE_CONFIG[insight.confidence].label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {insight.reason}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExecuteAction(insight);
                      }}
                      disabled={isExecuting}
                    >
                      {isExecuting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <span className="mr-1 text-xs">{insight.action.label}</span>
                          <ChevronRight className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-0 border-t bg-muted/30">
                      <div className="flex items-center justify-between pt-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Foi útil?</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onFeedback?.(insight.id, 'useful')}
                          >
                            <ThumbsUp className={cn(
                              "h-3.5 w-3.5",
                              insight.feedback === 'useful' && "text-green-500 fill-green-500"
                            )} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onFeedback?.(insight.id, 'not_useful')}
                          >
                            <ThumbsDown className={cn(
                              "h-3.5 w-3.5",
                              insight.feedback === 'not_useful' && "text-red-500 fill-red-500"
                            )} />
                          </Button>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground"
                          onClick={() => onDismiss?.(insight.id)}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Ignorar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
