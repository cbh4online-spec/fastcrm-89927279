import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Sparkles, 
  AlertTriangle, 
  Eye, 
  TrendingUp, 
  Clock, 
  ArrowRight,
  RefreshCw,
  Loader2,
  MessageSquare,
  Target
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface AIInsight {
  id: string;
  type: "urgent" | "opportunity" | "follow_up" | "warning";
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  action: {
    label: string;
    route: string;
    entityId?: string;
  };
  metadata?: Record<string, unknown>;
}

const insightIcons: Record<AIInsight["type"], React.ElementType> = {
  urgent: AlertTriangle,
  opportunity: TrendingUp,
  follow_up: Eye,
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
  const Icon = insightIcons[insight.type];
  
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
            {insight.action.label}
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}

interface DashboardAIInsightsProps {
  leadsWithoutResponse: number;
  proposalsViewed: number;
  highProbabilityOpportunities: number;
  overdueFollowUps: number;
  unansweredMessages: number;
}

export function DashboardAIInsights({
  leadsWithoutResponse,
  proposalsViewed,
  highProbabilityOpportunities,
  overdueFollowUps,
  unansweredMessages,
}: DashboardAIInsightsProps) {
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Generate insights from actual data
  const insights: AIInsight[] = [];

  if (leadsWithoutResponse > 0) {
    insights.push({
      id: "leads-no-response",
      type: "urgent",
      title: `${leadsWithoutResponse} lead${leadsWithoutResponse > 1 ? 's' : ''} sem resposta`,
      description: "Leads aguardam contacto há mais de 24 horas. Responder rapidamente aumenta a taxa de conversão.",
      priority: leadsWithoutResponse > 3 ? "high" : "medium",
      action: {
        label: "Ver leads",
        route: "/dashboard/leads?filter=no_response",
      },
    });
  }

  if (proposalsViewed > 0) {
    insights.push({
      id: "proposals-viewed",
      type: "follow_up",
      title: `${proposalsViewed} proposta${proposalsViewed > 1 ? 's' : ''} visualizada${proposalsViewed > 1 ? 's' : ''}`,
      description: "Propostas foram vistas pelo cliente mas ainda não houve follow-up. É o momento ideal para fazer contacto.",
      priority: "high",
      action: {
        label: "Ver propostas",
        route: "/dashboard/proposals?filter=viewed",
      },
    });
  }

  if (highProbabilityOpportunities > 0) {
    insights.push({
      id: "high-probability",
      type: "opportunity",
      title: `${highProbabilityOpportunities} oportunidade${highProbabilityOpportunities > 1 ? 's' : ''} com alta probabilidade`,
      description: "Oportunidades com alta chance de fecho. Priorize estas para maximizar a receita.",
      priority: "medium",
      action: {
        label: "Ver oportunidades",
        route: "/dashboard/opportunities",
      },
    });
  }

  if (unansweredMessages > 0) {
    insights.push({
      id: "unanswered-messages",
      type: "urgent",
      title: `${unansweredMessages} mensagen${unansweredMessages > 1 ? 's' : ''} por responder`,
      description: "Mensagens de clientes aguardam resposta. Respostas rápidas melhoram a satisfação.",
      priority: unansweredMessages > 5 ? "high" : "medium",
      action: {
        label: "Abrir inbox",
        route: "/dashboard/inbox",
      },
    });
  }

  if (overdueFollowUps > 0) {
    insights.push({
      id: "overdue-followups",
      type: "warning",
      title: `${overdueFollowUps} follow-up${overdueFollowUps > 1 ? 's' : ''} atrasado${overdueFollowUps > 1 ? 's' : ''}`,
      description: "Tarefas de acompanhamento estão em atraso. Complete-as para manter o pipeline saudável.",
      priority: overdueFollowUps > 3 ? "high" : "low",
      action: {
        label: "Ver tarefas",
        route: "/dashboard/crm",
      },
    });
  }

  // Sort by priority
  const sortedInsights = insights.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  }).slice(0, 5);

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulated refresh - in production would refetch data
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  if (sortedInsights.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500/20 to-primary/20">
                <Sparkles className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-base">Insights AI</CardTitle>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-medium">Tudo em ordem!</p>
            <p className="text-xs mt-1">Não há ações urgentes neste momento.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-amber-500/20 to-primary/20">
              <Sparkles className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-base">Insights AI</CardTitle>
              <CardDescription className="text-xs">
                Ações recomendadas baseadas nos seus dados
              </CardDescription>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8"
            onClick={handleRefresh}
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
      <CardContent className="space-y-2">
        {sortedInsights.map((insight) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            onAction={() => navigate(insight.action.route)}
          />
        ))}
        
        <div className="pt-2 text-center">
          <p className="text-[10px] text-muted-foreground/60">
            A IA apenas sugere • Todas as ações requerem confirmação
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
