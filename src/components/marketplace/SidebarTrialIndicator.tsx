import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Zap, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TrialStatus } from "@/hooks/useModuleTrial";

interface SidebarTrialIndicatorProps {
  trialStatus: TrialStatus | null;
  compact?: boolean;
}

export function SidebarTrialIndicator({ 
  trialStatus, 
  compact = false 
}: SidebarTrialIndicatorProps) {
  if (!trialStatus || !trialStatus.is_trial) {
    return null;
  }

  const isLow = trialStatus.usage_percent >= 70;
  const isCritical = trialStatus.usage_percent >= 90;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative">
              {isCritical ? (
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 animate-pulse" />
              ) : isLow ? (
                <Zap className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <Badge 
                  variant="outline" 
                  className="h-4 px-1 text-[10px] bg-primary/10 text-primary border-primary/20"
                >
                  Trial
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="space-y-2">
            <p className="font-medium">
              {trialStatus.uses_remaining} utilizações restantes
            </p>
            <Progress 
              value={trialStatus.usage_percent} 
              className="h-1.5 w-24"
            />
            {trialStatus.days_remaining !== null && (
              <p className="text-xs text-muted-foreground">
                {trialStatus.days_remaining} dias restantes
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="space-y-1.5 px-2 py-1.5 bg-muted/50 rounded-md">
      <div className="flex items-center justify-between text-xs">
        <span className={cn(
          "font-medium",
          isCritical && "text-red-600",
          isLow && !isCritical && "text-amber-600"
        )}>
          {trialStatus.uses_remaining} restantes
        </span>
        <Badge 
          variant="outline" 
          className={cn(
            "h-4 px-1.5 text-[10px]",
            isCritical && "bg-red-100 text-red-700 border-red-200",
            isLow && !isCritical && "bg-amber-100 text-amber-700 border-amber-200",
            !isLow && "bg-primary/10 text-primary border-primary/20"
          )}
        >
          Trial
        </Badge>
      </div>
      <Progress 
        value={trialStatus.usage_percent} 
        className={cn(
          "h-1",
          isCritical && "[&>div]:bg-red-500",
          isLow && !isCritical && "[&>div]:bg-amber-500"
        )}
      />
    </div>
  );
}
