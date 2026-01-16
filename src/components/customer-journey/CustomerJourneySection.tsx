import { 
  Route, 
  Calendar, 
  AlertTriangle, 
  Lightbulb,
  TrendingUp,
  Package,
  Clock,
  Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCustomerJourney } from "@/hooks/useCustomerJourney";
import {
  JOURNEY_STAGE_LABELS,
  JOURNEY_STAGE_COLORS,
  JOURNEY_STAGE_ICONS,
  CHURN_RISK_LABELS,
  CHURN_RISK_COLORS,
  ChurnRisk,
  JourneyStage,
} from "@/types/customerJourney";
import { format, formatDistanceToNow } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CustomerJourneySectionProps {
  contactId?: string;
  companyId?: string;
}

export function CustomerJourneySection({ contactId, companyId }: CustomerJourneySectionProps) {
  const { data: journey, isLoading, error } = useCustomerJourney({ contactId, companyId });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Route className="h-4 w-4" />
            Jornada do Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !journey) {
    return null;
  }

  const stage = journey.stage as JourneyStage;
  const churnRisk = journey.churnRisk as ChurnRisk;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Route className="h-4 w-4" />
          Jornada do Cliente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Journey Stage - Main highlight */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-muted/50 to-muted/30">
          <span className="text-2xl">{JOURNEY_STAGE_ICONS[stage]}</span>
          <div className="flex-1">
            <Badge className={cn("font-medium", JOURNEY_STAGE_COLORS[stage])}>
              {JOURNEY_STAGE_LABELS[stage]}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              {getStageDescription(stage)}
            </p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Last Interaction */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-help">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="text-xs">Última Interação</span>
                </div>
                <p className="text-sm font-medium">
                  {journey.lastInteractionDate 
                    ? formatDistanceToNow(new Date(journey.lastInteractionDate), { 
                        addSuffix: true, 
                        locale: pt 
                      })
                    : 'Sem registo'
                  }
                </p>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {journey.lastInteractionDate 
                ? format(new Date(journey.lastInteractionDate), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: pt })
                : 'Nenhuma interação registada'
              }
            </TooltipContent>
          </Tooltip>

          {/* Churn Risk */}
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span className="text-xs">Risco de Churn</span>
            </div>
            <Badge variant="secondary" className={cn("font-medium", CHURN_RISK_COLORS[churnRisk])}>
              {CHURN_RISK_LABELS[churnRisk]}
            </Badge>
          </div>

          {/* Active Products */}
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Package className="h-3.5 w-3.5" />
              <span className="text-xs">Produtos Ativos</span>
            </div>
            <p className="text-sm font-medium">{journey.activeProducts}</p>
          </div>

          {/* Total Consumption */}
          <div className="p-3 rounded-lg border bg-card">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Activity className="h-3.5 w-3.5" />
              <span className="text-xs">Total Consumido</span>
            </div>
            <p className="text-sm font-medium">{journey.totalConsumption}</p>
          </div>
        </div>

        {/* Frequency info if available */}
        {journey.averageConsumptionFrequency && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
            <Clock className="h-3.5 w-3.5" />
            <span>Frequência média: a cada {journey.averageConsumptionFrequency} dias</span>
          </div>
        )}

        {/* Recommended Action */}
        {journey.nextRecommendedAction && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-medium text-primary mb-0.5">Próxima Ação Recomendada</p>
                <p className="text-sm">{journey.nextRecommendedAction}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getStageDescription(stage: JourneyStage): string {
  switch (stage) {
    case 'novo':
      return 'Cliente ainda não adquiriu produtos';
    case 'em_onboarding':
      return 'Produtos adquiridos, aguarda primeira sessão';
    case 'em_consumo':
      return 'Consumo ativo e regular';
    case 'em_pausa':
      return 'Consumo interrompido temporariamente';
    case 'concluido':
      return 'Todos os produtos consumidos';
    case 'pronto_upsell':
      return 'Oportunidade para nova venda';
    default:
      return '';
  }
}

// Compact version for sidebars
interface CustomerJourneyBadgeProps {
  contactId?: string;
  companyId?: string;
}

export function CustomerJourneyBadge({ contactId, companyId }: CustomerJourneyBadgeProps) {
  const { data: journey, isLoading } = useCustomerJourney({ contactId, companyId });

  if (isLoading || !journey) return null;

  const stage = journey.stage as JourneyStage;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge className={cn("gap-1 cursor-help", JOURNEY_STAGE_COLORS[stage])}>
          <span>{JOURNEY_STAGE_ICONS[stage]}</span>
          {JOURNEY_STAGE_LABELS[stage]}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-medium">{JOURNEY_STAGE_LABELS[stage]}</p>
        <p className="text-xs text-muted-foreground">{getStageDescription(stage)}</p>
      </TooltipContent>
    </Tooltip>
  );
}
