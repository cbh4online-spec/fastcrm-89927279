import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle } from "lucide-react";
import { Opportunity } from "@/types/opportunity";
import { PipelineStage } from "@/hooks/usePipelineStages";
import { computeStuckDays } from "./StageTransitionValidator";

interface StuckDealsAlertProps {
  opportunities: Opportunity[];
  stages: PipelineStage[];
  /** Default SLA if stage config doesn't define one */
  defaultSlaDays?: number;
}

export function StuckDealsAlert({ opportunities, stages, defaultSlaDays = 14 }: StuckDealsAlertProps) {
  const { t } = useTranslation('crm');

  const stuckDeals = useMemo(() => {
    const openOpps = opportunities.filter((o) => o.status === "open");
    const stageMap = new Map(stages.map((s) => [s.id, s]));

    return openOpps
      .map((opp) => {
        const stage = stageMap.get(opp.stage_id);
        const slaDays = (stage?.config as any)?.sla_days ?? defaultSlaDays;
        const daysStuck = computeStuckDays(opp);
        return { opp, stage, daysStuck, slaDays };
      })
      .filter(({ daysStuck, slaDays }) => daysStuck > slaDays)
      .sort((a, b) => b.daysStuck - a.daysStuck);
  }, [opportunities, stages, defaultSlaDays]);

  if (stuckDeals.length === 0) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="destructive" className="gap-1 cursor-pointer">
          <AlertTriangle className="w-3 h-3" />
          {stuckDeals.length} {t('stuckDeals', 'parados')}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <p className="font-medium text-xs mb-1">
          {t('stuckDealsTooltipTitle', 'Deals parados acima do SLA')}
        </p>
        <ul className="space-y-1">
          {stuckDeals.slice(0, 5).map(({ opp, daysStuck, stage }) => (
            <li key={opp.id} className="text-xs">
              <span className="font-medium">{opp.title}</span>
              <span className="text-muted-foreground"> — {daysStuck}d em {stage?.name || '?'}</span>
            </li>
          ))}
          {stuckDeals.length > 5 && (
            <li className="text-xs text-muted-foreground">
              +{stuckDeals.length - 5} {t('more', 'mais')}
            </li>
          )}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}
