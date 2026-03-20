import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Zap, FlaskConical, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { MarketingCampaign } from '@/types/marketing';

interface Props {
  campaign: MarketingCampaign;
  abTestActive?: boolean;
  triggersActive?: boolean;
}

export function CampaignCardBadges({ campaign, abTestActive, triggersActive }: Props) {
  const bounceRate = campaign.sentCount > 0
    ? (campaign.bouncedCount / campaign.sentCount) * 100
    : 0;
  const healthPct = campaign.totalRecipients > 0
    ? Math.round(((campaign.validatedCount || 0) / campaign.totalRecipients) * 100)
    : null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-1.5 flex-wrap">
        {abTestActive && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800 text-[10px] px-1.5 py-0 h-5 gap-1">
                <FlaskConical className="h-2.5 w-2.5" />
                A/B
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Teste A/B a decorrer
            </TooltipContent>
          </Tooltip>
        )}

        {triggersActive && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800 text-[10px] px-1.5 py-0 h-5 gap-1">
                <Zap className="h-2.5 w-2.5" />
                Auto
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Automação activa
            </TooltipContent>
          </Tooltip>
        )}

        {bounceRate > 5 && campaign.status === 'sent' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-amber-500">
                <AlertTriangle className="h-3.5 w-3.5" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Bounce rate alto: {bounceRate.toFixed(1)}%
            </TooltipContent>
          </Tooltip>
        )}

        {healthPct !== null && campaign.validationRunAt && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 h-5 gap-1 ${
                  healthPct >= 90
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400'
                    : healthPct >= 70
                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400'
                    : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400'
                }`}
              >
                <ShieldCheck className="h-2.5 w-2.5" />
                {healthPct}%
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Saúde da lista: {healthPct}% válidos
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
